import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { flightsApi, hotelsApi, destinationsApi } from "../services/api";
import { buildAvailability } from "../data/availability";
import { toDestination } from "../data/destinationMeta";
import DESTINATIONS_STATIC from "../data/destinations.json";

const AvailableContext = createContext(null);

// Flatten the static destinations.json fallback into a flat list.
function staticList() {
  const out = [];
  Object.values(DESTINATIONS_STATIC || {}).forEach((arr) => {
    (arr || []).forEach((d) => out.push(toDestination(d.city)));
  });
  // De-dup by code/city.
  const seen = new Set();
  return out.filter((d) => {
    const k = d.code || d.city;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function AvailableProvider({ children }) {
  const [flights, setFlights] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [f, h] = await Promise.all([
          flightsApi.list(),
          hotelsApi.list(),
        ]);
        // Also warm up destinations list but don't fail hard if unavailable.
        destinationsApi.list().catch(() => {});
        if (!active) return;
        setFlights(Array.isArray(f) ? f : []);
        setHotels(Array.isArray(h) ? h : []);
        setError(null);
      } catch (err) {
        if (active) setError(err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const availability = useMemo(() => {
    const built = buildAvailability(flights, hotels);
    // When no live data is available (backend offline / empty DB), fall back to
    // the curated static list so the search dropdowns still have options.
    const staticAll = staticList();
    const useStatic =
      (!flights || flights.length === 0) && (!hotels || hotels.length === 0);

    if (!useStatic) return built;

    return {
      ...built,
      reachableCities: staticAll,
      originCities: staticAll,
      hotelCities: staticAll,
      availableDestinations: staticAll,
      availableForTrip: staticAll,
    };
  }, [flights, hotels]);

  const value = {
    loading,
    error,
    ...availability,
  };

  return (
    <AvailableContext.Provider value={value}>{children}</AvailableContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAvailable() {
  const ctx = useContext(AvailableContext);
  if (!ctx) throw new Error("useAvailable must be used within an AvailableProvider");
  return ctx;
}
