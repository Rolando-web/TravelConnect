import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

const FavoritesContext = createContext();

const storageKeyFor = (email) => `travelconnect_favorites:${(email || "guest").toLowerCase()}`;

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const customerKey = user?.email || null;
  const storageKey = storageKeyFor(customerKey);

  const [favorites, setFavorites] = useState([]);

  // Load favorites whenever the identity changes.
  useEffect(() => {
    setFavorites([]);
    if (!customerKey) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setFavorites(parsed);
      }
    } catch {
      setFavorites([]);
    }
  }, [customerKey, storageKey]);

  // Persist favorites for this customer.
  useEffect(() => {
    if (!customerKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(favorites));
    } catch {
      /* ignore */
    }
  }, [favorites, customerKey, storageKey]);

  const isFavorite = (type, id) =>
    favorites.some((f) => f.type === type && String(f.id) === String(id));

  const toggleFavorite = (type, item) => {
    const existing = isFavorite(type, item.id);
    if (existing) {
      setFavorites((prev) =>
        prev.filter((f) => !(f.type === type && String(f.id) === String(item.id)))
      );
    } else {
      const entry = {
        type, // "flight" | "hotel" | "car"
        id: item.id,
        name: item.name || item.airline || `${item.flightNumber} Flight`,
        location: item.location || item.arrivalCity || "",
        price: item.price || item.pricePerNight || item.pricePerDay || 0,
        imageUrl: item.imageUrl,
        savedAt: new Date().toISOString(),
      };
      setFavorites((prev) => [...prev, entry]);
    }
  };

  const removeFavorite = (type, id) => {
    setFavorites((prev) =>
      prev.filter((f) => !(f.type === type && String(f.id) === String(id)))
    );
  };

  const clearFavorites = () => setFavorites([]);

  const value = {
    favorites,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    clearFavorites,
    favoriteCount: favorites.length,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}
