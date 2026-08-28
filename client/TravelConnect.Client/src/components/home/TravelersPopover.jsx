/* ─── Travelers + Cabin class popover ───────────────────────────────── */
export default function TravelersPopover({
  adults, setAdults,
  children, setChildren,
  infants, setInfants,
  cabinClass, setCabinClass,
  onClose,
}) {
  const CounterRow = ({ label, sub, value, setValue, min = 0 }) => (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-bold text-gray-900">{label}</p>
        <p className="text-[10px] text-gray-400">{sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setValue(Math.max(min, value - 1))}
          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 font-bold flex items-center justify-center"
        >
          −
        </button>
        <span className="font-extrabold text-sm w-4 text-center">{value}</span>
        <button
          type="button"
          onClick={() => setValue(Math.min(9, value + 1))}
          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 font-bold flex items-center justify-center"
        >
          +
        </button>
      </div>
    </div>
  );

  return (
    <div className="absolute right-0 mt-2 bg-white border border-gray-200 shadow-2xl rounded-2xl p-6 z-[60] w-72 space-y-4 text-left">
      <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Select travelers</p>

      <CounterRow label="Adults"         sub="12+ years old"     value={adults}   setValue={setAdults}   min={1} />
      <CounterRow label="Children"       sub="2-11 years old"    value={children} setValue={setChildren} />
      <CounterRow label="Infants on lap" sub="Under 2 years old" value={infants}  setValue={setInfants}  />

      {/* Cabin Class */}
      <div className="pt-2 border-t border-gray-100">
        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cabin Class</label>
        <select
          value={cabinClass}
          onChange={(e) => setCabinClass(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-gray-800 focus:outline-none"
        >
          <option value="Economy">Economy</option>
          <option value="Premium Economy">Premium Economy</option>
          <option value="Business">Business</option>
          <option value="First">First Class</option>
        </select>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full bg-[#008fe5] hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs transition"
      >
        Done
      </button>
    </div>
  );
}
