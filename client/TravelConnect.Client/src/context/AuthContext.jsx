import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem("tc_logged_in") === "true"
  );
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("tc_user");
    return stored ? JSON.parse(stored) : null;
  });

  /* Login modal visibility */
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const openLoginModal  = () => setLoginModalOpen(true);
  const closeLoginModal = () => setLoginModalOpen(false);

  /**
   * Simulates a login — swap for a real API call in the future.
   * @param {{ name: string, email: string }} userData
   */
  const login = (userData) => {
    const profile = userData || { name: "Traveller", email: "" };
    setIsLoggedIn(true);
    setUser(profile);
    localStorage.setItem("tc_logged_in", "true");
    localStorage.setItem("tc_user", JSON.stringify(profile));
    closeLoginModal();
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem("tc_logged_in");
    localStorage.removeItem("tc_user");
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, user, login, logout, loginModalOpen, openLoginModal, closeLoginModal }}
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
