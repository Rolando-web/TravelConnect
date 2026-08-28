import { useRef } from "react";
import DESTINATIONS_DATA from "../../data/destinations.json";

/* ─── Reusable categorised city-picker dropdown ─────────────────────── */
export default function DestinationsDropdown({ searchVal, onSearchChange, onSelect, showAnywhere = false }) {
  const ref = useRef(null);

  const filterList = (search) => {
    const filtered = {};
    Object.keys(DESTINATIONS_DATA).forEach((key) => {
      filtered[key] = DESTINATIONS_DATA[key].filter(
        (item) =>
          item.city.toLowerCase().includes(search.toLowerCase()) ||
          item.country.toLowerCase().includes(search.toLowerCase()) ||
          item.code.toLowerCase().includes(search.toLowerCase())
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

  /* ─── Region grid renderer ─────────────────────────────────────────── */
  const RegionGrid = ({ label, items }) =>
    items?.length > 0 ? (
      <div>
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{label}</span>
        <div className="grid grid-cols-3 gap-3">
          {items.slice(0, 6).map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => handleSelect(item)}
              className="text-left py-2 px-3 hover:bg-blue-50 rounded-xl transition"
            >
              <span className="font-bold text-sm text-gray-900 block truncate">{item.city}</span>
              <span className="text-[10px] text-gray-400 block truncate">{item.airport}</span>
            </button>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div ref={ref} className="absolute left-0 mt-2 bg-white border border-gray-200 shadow-2xl rounded-2xl p-6 z-[60] w-[550px] max-h-[500px] overflow-y-auto">
      {searchVal && !hasResults ? (
        <div className="text-gray-400 text-center py-6 text-sm">No cities found</div>
      ) : (
        <div className="space-y-6 text-left">
          {/* Anywhere option */}
          {!searchVal && showAnywhere && (
            <button
              type="button"
              onClick={() => handleSelect({ city: "Anywhere", country: "Get travel inspiration", code: "ANY", airport: "Anywhere" })}
              className="w-full text-left p-3 rounded-xl hover:bg-blue-50/50 flex flex-col border border-dashed border-blue-200 bg-blue-50/20"
            >
              <span className="font-extrabold text-sm text-[#008fe5]">Anywhere</span>
              <span className="text-[11px] text-gray-500">Get travel inspiration and deals</span>
            </button>
          )}

          <RegionGrid label="Popular cities" items={filtered.popular} />
          <RegionGrid label="Asia"           items={filtered.asia} />
          <RegionGrid label="Europe"         items={filtered.europe} />
          <RegionGrid label="North America"  items={filtered.north_america} />
          <RegionGrid label="South America"  items={filtered.south_america} />
        </div>
      )}
    </div>
  );
}
