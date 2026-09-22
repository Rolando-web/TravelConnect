import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

/* Context file: useFavorites() hook is exported alongside the provider
   (standard context-module pattern). */
/* eslint-disable react-refresh/only-export-components */

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

    // Migrate favorites saved as a guest into this account on first login so
    // nothing is silently lost when the storage key changes.
    try {
      const guestKey = storageKeyFor(null);
      const guestRaw = localStorage.getItem(guestKey);
      const customerRaw = localStorage.getItem(storageKey);
      if (guestRaw && guestRaw !== customerRaw) {
        const guestFavs = JSON.parse(guestRaw);
        const customerFavs = customerRaw ? JSON.parse(customerRaw) : [];
        if (Array.isArray(guestFavs) && Array.isArray(customerFavs) && guestFavs.length > 0) {
          const merged = [...customerFavs];
          const seen = new Set(merged.map((f) => `${f.type}:${String(f.id)}`));
          for (const g of guestFavs) {
            const key = `${g.type}:${String(g.id)}`;
            if (!seen.has(key)) {
              merged.push(g);
              seen.add(key);
            }
          }
          localStorage.setItem(storageKey, JSON.stringify(merged));
          localStorage.removeItem(guestKey);
          setFavorites(merged);
          return;
        }
      }
    } catch {
      /* ignore migration failures — fresh lists are fine */
    }

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
