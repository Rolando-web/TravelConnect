import { useRef, useMemo } from "react";
import { Compass, Sparkles } from "lucide-react";
import { useAvailable } from "../../context/AvailableContext";
import { groupDestinations } from "../../data/destinationMeta";

const REGION_ORDER = [
  { key: "asia", label: "Asia" },
  { key: "europe", label: "Europe" },
  { key: "north_america", label: "North America" },
  { key: "south_america", label: "South America" },
  { key: "middle_east", label: "Middle East" },
  { key: "oceania", label: "Oceania" },
  { key: "international", label: "International" },
];

/* ─── Reusable categorised city-picker dropdown ───────────────────────
   `mode` controls which destinations are shown:
     - "flight" : only cities reachable by an available flight (arrival cities)
     - "hotel"  : only cities with an available hotel
     - "trip"   : cities reachable by flight AND with a hotel (bundle-ready)
     - default  : every destination that has any service
   `showAnywhere` adds an "Anywhere" inspiration option (flight mode only).
─────────────────────────────────────────────────────────────────────── */
export default function DestinationsDropdown({
  searchVal,
  onSearchChange,
  onSelect,
  showAnywhere = false,
  mode = "all",
}) {
  const ref = useRef(null);
  const { originCities, reachableCities, hotelCities, availableForTrip, availableDestinations, popularCodes } =
    useAvailable();

  const sourceList = useMemo(() => {
    if (mode === "origin") return originCities;
    if (mode === "flight") return reachableCities;
    if (mode === "hotel") return hotelCities;
    if (mode === "trip") return availableForTrip;
    return availableDestinations;
  }, [mode, originCities, reachableCities, hotelCities, availableForTrip, availableDestinations]);

  const buckets = useMemo(() => groupDestinations(sourceList, popularCodes), [sourceList, popularCodes]);

  const filterList = (search) => {
    const q = search.toLowerCase();
    const filtered = {};
    Object.keys(buckets).forEach((key) => {
      filtered[key] = (buckets[key] || []).filter(
        (item) =>
          item.city.toLowerCase().includes(q) ||
          item.country.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q)
      );
    });
    return filtered;
  };

  const filtered = filterList(searchVal);
  const hasResults = Object.values(filtered).some((arr) => arr.length > 0);

  const handleSelect = (item) => {
    onSelect(item);
    onSearchChange(`${item.city} (${item.code})`);
  };

  return (
    <div
      ref={ref}
      className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mt-2 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 shadow-2xl rounded-2xl p-3.5 sm:p-5 md:p-6 z-[80] w-[calc(100vw-2rem)] max-w-[550px] sm:w-[500px] md:w-[550px] max-h-[60vh] sm:max-h-[500px] overflow-y-auto overscroll-contain animate-fadeIn"
    >
      {searchVal && !hasResults ? (
        <div className="text-gray-400 dark:text-slate-400 text-center py-6 text-sm">
          No available {mode === "flight" ? "flight destinations" : mode === "hotel" ? "hotel cities" : "destinations"} found
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5 text-left">
          {!searchVal && showAnywhere && (
            <button
              type="button"
              onClick={() => handleSelect({ city: "Anywhere", country: "Get travel inspiration", code: "ANY", airport: "Anywhere" })}
              className="w-full text-left p-3 rounded-xl hover:bg-blue-50/60 dark:hover:bg-white/5 active:scale-[0.99] flex items-center justify-between border border-dashed border-blue-200 dark:border-blue-500/30 bg-blue-50/25 dark:bg-blue-500/10 cursor-pointer transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-[#008fe5] dark:text-cyan-300 flex items-center justify-center shrink-0">
                  <Compass size={16} />
                </div>
                <div>
                  <span className="font-extrabold text-xs sm:text-sm text-[#008fe5] dark:text-cyan-300 block">Anywhere</span>
                  <span className="text-[11px] text-gray-500 dark:text-slate-400 block">Get travel inspiration &amp; best deals</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#008fe5] dark:text-cyan-300 bg-blue-100/70 dark:bg-blue-500/20 px-2 py-0.5 rounded-full shrink-0">
                Explore
              </span>
            </button>
          )}

          {!searchVal && sourceList.length > 0 && (mode === "flight" || mode === "all") && (
            <div className="flex items-center gap-1.5 pb-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Showing destinations available for instant booking
              </p>
            </div>
          )}

          {REGION_ORDER.map(({ key, label }) => {
            const items = filtered[key] || [];
            if (items.length === 0) return null;
            return (
              <div key={key}>
                <span className="block text-[11px] sm:text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2">{label}</span>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-1.5 sm:gap-2">
                  {items.slice(0, 9).map((item) => (
                    <button
                      key={item.code || item.city}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="text-left p-2 sm:p-2.5 bg-gray-50/70 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-white/10 hover:border-blue-200 dark:hover:border-cyan-500/30 border border-gray-100 dark:border-white/5 rounded-xl transition cursor-pointer active:scale-[0.98] group"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate group-hover:text-[#008fe5] dark:group-hover:text-cyan-300 transition-colors">
                          {item.city}
                        </span>
                        {item.code && (
                          <span className="text-[9px] font-mono font-bold text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-blue-500/20 px-1 py-0.5 rounded shrink-0">
                            {item.code}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 dark:text-slate-400 block truncate mt-0.5">
                        {item.airport}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {!hasResults && searchVal && (
            <div className="text-gray-400 dark:text-slate-400 text-center py-6 text-sm">No cities found</div>
          )}
        </div>
      )}
    </div>
  );
}
