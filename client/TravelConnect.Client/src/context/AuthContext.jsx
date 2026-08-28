import { createContext, useContext, useState, useEffect } from "react";
import { auth, googleProvider, db } from "../services/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ADMIN_ROLES } from "../pages/admin/adminConfig";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const openLoginModal = () => setLoginModalOpen(true);
  const closeLoginModal = () => setLoginModalOpen(false);

  /* ── Resolve role: Firestore doc → custom claims → null ─────── */
  const resolveRole = async (firebaseUser) => {
    const uid = firebaseUser.uid;

    // 1) Try Firestore users/{uid}
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        const data = snap.data();
        if (data.role && ADMIN_ROLES.includes(data.role)) {
          return { role: data.role, profile: data };
        }
      }
    } catch (err) {
      console.warn("Firestore read failed:", err.message);
    }

    // 2) Fallback: Firebase Auth custom claims
    try {
      const token = await firebaseUser.getIdTokenResult();
      if (token.claims?.role && ADMIN_ROLES.includes(token.claims.role)) {
        return { role: token.claims.role, profile: null };
      }
    } catch (err) {
      console.warn("Custom claims read failed:", err.message);
    }

    return { role: null, profile: null };
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

      if (!role) {
        // Signed in but no valid role → sign out
        await signOut(auth);
        setUser(null);
        localStorage.removeItem("tc_logged_in");
        localStorage.removeItem("tc_user");
        setLoading(false);
        return;
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

    if (!role) {
      await signOut(auth);
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    persistProfile(buildProfile(cred.user, role, profile));
    closeLoginModal();
    return { role };
  };

  /* ── Google login ──────────────────────────────────────────── */
  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    const { role, profile } = await resolveRole(cred.user);

    if (!role) {
      await signOut(auth);
      throw new Error("ACCOUNT_NOT_FOUND");
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
