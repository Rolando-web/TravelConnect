import { createContext, useContext, useState, useEffect } from "react";
import { auth, googleProvider, db } from "../services/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ADMIN_ROLES } from "../pages/admin/adminConfig";

const AuthContext = createContext(null);

// Bound async ops so a blocked/offline Firestore (e.g. an ad-blocker killing
// firestore.googleapis.com) can't stall login for the SDK's full retry window.
const FIRESTORE_TIMEOUT_MS = 4000;
const withFirestoreTimeout = (promise, ms = FIRESTORE_TIMEOUT_MS) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firestore request timed out")), ms)
    )
  ]);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const openLoginModal = () => setLoginModalOpen(true);
  const closeLoginModal = () => setLoginModalOpen(false);

  /* ── Resolve role: Firestore doc → custom claims → Customer ─── */
  const resolveRole = async (firebaseUser) => {
    const uid = firebaseUser.uid;

    // 1) Try Firestore users/{uid}
    try {
      const snap = await withFirestoreTimeout(getDoc(doc(db, "users", uid)));
      if (snap.exists()) {
        const data = snap.data();
        if (data.role) {
          return { role: data.role, profile: data };
        }
      }
    } catch (err) {
      console.warn("Firestore read failed:", err.message);
    }

    // 2) Fallback: Firebase Auth custom claims
    try {
      const token = await firebaseUser.getIdTokenResult();
      if (token.claims?.role) {
        return { role: token.claims.role, profile: null };
      }
    } catch (err) {
      console.warn("Custom claims read failed:", err.message);
    }

    // 3) No role found → treat as a self-registered customer
    return { role: "Customer", profile: null };
  };

  /* ── Ensure a Firestore profile exists for Google sign-ins ──── */
  const ensureCustomerProfile = async (firebaseUser) => {
    try {
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
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
      await withFirestoreTimeout(setDoc(doc(db, "users", firebaseUser.uid), profile, { merge: true }));
      return profile;
    } catch (err) {
      console.warn("Could not write customer profile:", err.message);
      return { role: "Customer" };
    }
  };

  /* ── Build profile object ──────────────────────────────────── */
  const buildProfile = (firebaseUser, role, extra) => ({
    uid: firebaseUser.uid,
    name:
      extra?.displayName ||
      firebaseUser.displayName ||
      firebaseUser.email?.split("@")[0] ||
      "User",
    email: firebaseUser.email,
    photoURL: firebaseUser.photoURL || extra?.photoURL || null,
    role,
  });

  const persistProfile = (profile) => {
    setUser(profile);
    localStorage.setItem("tc_logged_in", "true");
    localStorage.setItem("tc_user", JSON.stringify(profile));
  };

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
        setUser(null);
        localStorage.removeItem("tc_logged_in");
        localStorage.removeItem("tc_user");
        setLoading(false);
        return;
      }

      const { role, profile } = await resolveRole(fbUser);

      if (role === "Customer") {
        ensureCustomerProfile(fbUser).catch(() => {});
      }

      persistProfile(buildProfile(fbUser, role, profile));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  /* ── Email/password login ──────────────────────────────────── */
  const loginWithEmail = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const { role, profile } = await resolveRole(cred.user);

    if (!role || role === "Customer") {
      ensureCustomerProfile(cred.user).catch(() => {});
    }

    persistProfile(buildProfile(cred.user, role || "Customer", profile));
    closeLoginModal();
    return { role: role || "Customer" };
  };

  /* ── Google login ──────────────────────────────────────────── */
  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    const { role, profile } = await resolveRole(cred.user);

    if (role === "Customer") {
      ensureCustomerProfile(cred.user).catch(() => {});
    }

    persistProfile(buildProfile(cred.user, role, profile));
    closeLoginModal();
    return { role };
  };

  /* ── Logout ────────────────────────────────────────────────── */
  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
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
