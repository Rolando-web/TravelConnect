import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { auth, googleProvider, db } from "../services/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ADMIN_ROLES } from "../pages/admin/adminConfig";
import { usersApi } from "../services/api";

const AuthContext = createContext(null);

// Bound async ops so a blocked/offline Firestore (e.g. an ad-blocker killing
// firestore.googleapis.com) can't stall login for the SDK's full retry window,
// and so the double role lookup (login + the auth-state callback that follows
// it) never exceeds a fixed budget. Role resolution used to be serial and
// unbounded-ish (up to ~4s per Firestore read × 2 reads ≈ 7s felt): it is now
// bounded at NETWORK_TIMEOUT_MS per call and cached per-uid for the session.
const NETWORK_TIMEOUT_MS = 2000;
const withTimeout = (promise, ms = NETWORK_TIMEOUT_MS) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Role lookup timed out")), ms)
    )
  ]);

// The login flow reads the Firestore profile twice back-to-back: once inside
// loginWithEmail/loginWithGoogle and again when onAuthStateChanged fires right
// after sign-in. Cache the resolved role per uid (short TTL) so the second
// lookup is free; the first result is still authoritative since it was just
// fetched from Firestore this session.
const ROLE_CACHE_TTL_MS = 60_000;
const roleCache = new Map(); // uid -> { at: number, result: {role, profile} }

// Legacy/alias role strings that map onto the current staff roles. If an account
// was seeded or swapped in with one of these, treat it as "Agency Admin" so the
// admin menu (and Firestore rules) stay on the canonical set.
const ROLE_ALIASES = {
  "Agency Owner": "Agency Admin",
  Owner: "Agency Admin",
  Admin: "Agency Admin",
  "Super User": "Super Admin",
};

function normalizeRole(role) {
  if (!role) return null;
  const canonical = ROLE_ALIASES[role] || role;
  return ADMIN_ROLES.includes(canonical) ? canonical : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const openLoginModal = () => setLoginModalOpen(true);
  const closeLoginModal = () => setLoginModalOpen(false);

  /* ── Resolve role: Firestore doc → custom claims → Customer ───
     Firestore and the ID-token claims are read in PARALLEL, each bounded by
     the timeout, so the FASTEST source that yields a role wins and a slow
     Firestore can never serialize behind another round-trip. Firestore is
     preferred when both answer because it is the role source of truth. */
  const resolveRole = useCallback(async (firebaseUser) => {
    const uid = firebaseUser.uid;

    const cached = roleCache.get(uid);
    if (cached && Date.now() - cached.at < ROLE_CACHE_TTL_MS) {
      return cached.result;
    }

    const readFirestore = () =>
      withTimeout(getDoc(doc(db, "users", uid)))
        .then((snap) => {
          if (!snap.exists()) return null;
          const data = snap.data();
          return data.role ? { role: data.role, profile: data } : null;
        })
        .catch((err) => {
          console.warn("Firestore role read failed:", err.message);
          return null;
        });

    const readClaims = () =>
      withTimeout(firebaseUser.getIdTokenResult())
        .then((token) =>
          token.claims?.role ? { role: token.claims.role, profile: null } : null
        )
        .catch((err) => {
          console.warn("Custom claims read failed:", err.message);
          return null;
        });

    // The backend SystemUsers registry is the authoritative staff record (edits
    // via the System Users page land here). When the signed-in identity exists
    // there, its role wins over Firestore/claims so a stale Firestore profile
    // can't lock an admin into a staff menu — and we self-heal the profile.
    const readBackendRole = () =>
      withTimeout(usersApi.me())
        .then((row) =>
          row?.role && ADMIN_ROLES.includes(normalizeRole(row.role))
            ? { role: row.role, profile: null, fromBackend: true }
            : null
        )
        .catch((err) => {
          console.warn("Backend role read failed:", err.message);
          return null;
        });

    const [fromStore, fromClaims, fromBackend] = await Promise.all([
      readFirestore(),
      readClaims(),
      readBackendRole(),
    ]);

    // Backend registry takes precedence for staff accounts. A Customer is never
    // in SystemUsers (me() 404s), so customers keep the store/claims path.
    const chosen = fromBackend || fromStore || fromClaims || { role: "Customer", profile: null };

    const role = normalizeRole(chosen.role) || "Customer";
    const result = {
      role,
      profile: chosen.profile
        ? { ...chosen.profile, role: chosen.profile.role ? normalizeRole(chosen.profile.role) : undefined }
        : null,
    };

    // Self-heal: persist the backend role to the Firestore users/{uid} profile
    // so future logins and the Firestore security rules see the same role.
    if (chosen.fromBackend && fromStore?.role !== result.role) {
      try {
        const profile = {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || "",
          name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
          role: result.role,
          status: "Active",
          updatedAt: new Date().toISOString(),
        };
        await withTimeout(setDoc(doc(db, "users", uid), profile, { merge: true }));
      } catch (err) {
        console.warn("Could not reconcile Firestore role:", err.message);
      }
    }

    roleCache.set(uid, { at: Date.now(), result });
    return result;
  }, []);

  /* ── Ensure a Firestore profile exists for Google sign-ins ──── */
  const ensureCustomerProfile = useCallback(async (firebaseUser) => {
    try {
      const snap = await withTimeout(getDoc(doc(db, "users", firebaseUser.uid)));
      if (snap.exists()) return snap.data();

      const profile = {
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || "",
        name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
        role: "Customer",
        phone: firebaseUser.phoneNumber || "",
        department: "N/A",
        avatar: "",
        photoURL: firebaseUser.photoURL || "",
        status: "Active",
        isGoogle: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await withTimeout(setDoc(doc(db, "users", firebaseUser.uid), profile, { merge: true }));
      return profile;
    } catch (err) {
      console.warn("Could not write customer profile:", err.message);
      return { role: "Customer" };
    }
  }, []);

  /* ── Build profile object ──────────────────────────────────── */
  const buildProfile = useCallback((firebaseUser, role, extra) => ({
    uid: firebaseUser.uid,
    name:
      extra?.displayName ||
      firebaseUser.displayName ||
      firebaseUser.email?.split("@")[0] ||
      "User",
    email: firebaseUser.email,
    photoURL: firebaseUser.photoURL || extra?.photoURL || null,
    role,
  }), []);

  const persistProfile = useCallback((profile) => {
    setUser(profile);
    localStorage.setItem("tc_logged_in", "true");
    localStorage.setItem("tc_user", JSON.stringify(profile));
  }, []);

  /* ── Apply a resolved role to the UI + localStorage (single path) ─ */
  const setRoleAndPersist = useCallback((firebaseUser, resolved) => {
    persistProfile(buildProfile(firebaseUser, resolved.role, resolved.profile));
  }, [buildProfile, persistProfile]);

  /* ── Update current user profile (merges + persists) ───────── */
  const updateProfile = (patch) => {
    setUser((prev) => {
      const next = prev ? { ...prev, ...patch } : patch;
      if (next) localStorage.setItem("tc_user", JSON.stringify(next));
      return next;
    });
  };

  /* ── Bootstrap: listen for Firebase auth state ─────────────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        roleCache.clear();
        setUser(null);
        localStorage.removeItem("tc_logged_in");
        localStorage.removeItem("tc_user");
        setLoading(false);
        return;
      }

      const resolved = await resolveRole(fbUser);
      setRoleAndPersist(fbUser, resolved);

      if (resolved.role === "Customer") {
        ensureCustomerProfile(fbUser).catch(() => {});
      }

      setLoading(false);
    });

    return () => unsub();
  }, [resolveRole, ensureCustomerProfile, setRoleAndPersist]);

  /* ── Email/password login ──────────────────────────────────── */
  const loginWithEmail = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const resolved = await resolveRole(cred.user);

    setRoleAndPersist(cred.user, resolved);

    if (resolved.role === "Customer") {
      ensureCustomerProfile(cred.user).catch(() => {});
    }

    closeLoginModal();
    return { role: resolved.role };
  };

  /* ── Google login ──────────────────────────────────────────── */
  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    const resolved = await resolveRole(cred.user);

    setRoleAndPersist(cred.user, resolved);

    if (resolved.role === "Customer") {
      ensureCustomerProfile(cred.user).catch(() => {});
    }

    closeLoginModal();
    return { role: resolved.role };
  };

  /* ── Logout ────────────────────────────────────────────────── */
  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    roleCache.clear();
    setUser(null);
    localStorage.removeItem("tc_logged_in");
    localStorage.removeItem("tc_user");
  };

  const isAdmin = ADMIN_ROLES.includes(user?.role);
  const isLoggedIn = !!user;

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
        loading,
        loginWithGoogle,
        loginWithEmail,
        logout,
        updateProfile,
        loginModalOpen,
        openLoginModal,
        closeLoginModal,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}