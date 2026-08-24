import { createContext, useContext, useState, useEffect } from "react";
import { auth, googleProvider } from "../services/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut
} from "firebase/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("tc_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  /* Login modal visibility */
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const openLoginModal  = () => setLoginModalOpen(true);
  const closeLoginModal = () => setLoginModalOpen(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const profile = {
          uid: currentUser.uid,
          name: currentUser.displayName || currentUser.email?.split("@")[0] || "Traveller",
          email: currentUser.email,
          photoURL: currentUser.photoURL
        };
        setUser(profile);
        localStorage.setItem("tc_logged_in", "true");
        localStorage.setItem("tc_user", JSON.stringify(profile));
      } else {
        // Only clear if not in offline mock mode without firebase session
        if (!localStorage.getItem("tc_logged_in")) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email, password) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      closeLoginModal();
      return res.user;
    } catch (error) {
      if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
        try {
          const res = await createUserWithEmailAndPassword(auth, email, password);
          closeLoginModal();
          return res.user;
        } catch (createErr) {
          throw createErr;
        }
      }
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    const res = await signInWithPopup(auth, googleProvider);
    closeLoginModal();
    return res.user;
  };

  const login = (userData) => {
    const profile = userData || { name: "Traveller", email: "" };
    setUser(profile);
    localStorage.setItem("tc_logged_in", "true");
    localStorage.setItem("tc_user", JSON.stringify(profile));
    closeLoginModal();
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Firebase signout error:", err);
    }
    setUser(null);
    localStorage.removeItem("tc_logged_in");
    localStorage.removeItem("tc_user");
  };

  const isLoggedIn = !!user;

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
        loading,
        login,
        loginWithEmail,
        loginWithGoogle,
        logout,
        loginModalOpen,
        openLoginModal,
        closeLoginModal
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

