import { useState, useEffect } from "react";
import { X, Check, Armchair, Plane, Loader2 } from "lucide-react";
import { getSeatMap } from "../../../services/api";
import { useCurrency } from "../../../context/CurrencyContext";

const SEAT_TYPE_LABEL = { Window: "Window", Aisle: "Aisle", Middle: "Middle" };

export default function SeatMapModal({ open, flight, travellers, onClose, onConfirm }) {
  const { displayPrice } = useCurrency();
  const [seatMap, setSeatMap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSeats, setSelectedSeats] = useState([]);

  const flightId = flight?.id;
  const maxSelectable = travellers || 1;

  useEffect(() => {
    if (!open || !flightId) return;
    setSelectedSeats([]);
    setError("");
    setLoading(true);
    getSeatMap(flightId)
      .then((data) => setSeatMap(data))
      .catch(() => setSeatMap(null))
      .finally(() => setLoading(false));
  }, [open, flightId]);

  if (!open) return null;

  const toggleSeat = (seat) => {
    if (seat.status !== "Available") return;
    setSelectedSeats((prev) => {
      if (prev.includes(seat.seatId)) {
        return prev.filter((s) => s !== seat.seatId);
      }
      if (prev.length >= maxSelectable) return prev;
      return [...prev, seat.seatId];
    });
  };

  const seatColor = (seat) => {
    if (seat.status !== "Available") return "bg-slate-200 text-slate-400 cursor-not-allowed border-slate-200";
    if (selectedSeats.includes(seat.seatId)) return "bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/30";
    return "bg-white text-slate-700 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer";
  };

  const title = flight
    ? `${flight.airline || "Flight"} ${flight.flightNumber || ""} · ${flight.departureCity || "?"} → ${flight.arrivalCity || "?"}`
    : "Select Seats";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md">
      <div className="relative bg-white dark:bg-[#0f1422] rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100 dark:border-white/[0.08]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#008fe5] flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Armchair size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Select Your Seat</h2>
                {seatMap && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {seatMap.totalSeats} seats
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 truncate max-w-xs sm:max-w-md">{title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            aria-label="Close seat map"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-white border-2 border-slate-300 inline-block" /> Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-emerald-500 inline-block" /> Selected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-slate-300 inline-block" /> Taken
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Plane size={14} className="text-[#008fe5]" /> Front of cabin
            </span>
          </div>

          {/* Loading / Error */}
          {loading && (
            <div className="py-20 flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
              <Loader2 size={32} className="animate-spin text-[#008fe5]" />
              <span className="text-xs font-semibold">Loading seat map…</span>
            </div>
          )}

          {!loading && !seatMap && (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center">
                <Armchair size={22} className="text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Seat map unavailable</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                The live seat map for this flight can't be loaded right now. You can skip seat selection and pick a seat at check-in.
              </p>
            </div>
          )}

          {/* Seat Grid */}
          {seatMap && (
            <div className="bg-slate-50 dark:bg-white/[0.03] rounded-3xl border border-slate-200/70 dark:border-white/[0.06] p-5 sm:p-6">
              {/* Column header */}
              <div className="grid gap-1.5 mb-2" style={{ gridTemplateColumns: `repeat(${seatMap.columns.length}, minmax(0,1fr))` }}>
                {seatMap.columns.map((col) => (
                  <div key={col} className="text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">
                    {col}
                  </div>
                ))}
              </div>

              {/* Rows */}
              <div className="space-y-1.5">
                {Array.from({ length: seatMap.totalRows }, (_, i) => i + 1).map((row) => (
                  <div key={row} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${seatMap.columns.length}, minmax(0,1fr))` }}>
                    {seatMap.columns.map((col) => {
                      const seat = seatMap.seats.find((s) => s.row === row && s.column === col);
                      if (!seat) return <div key={col} />;
                      const isSelected = selectedSeats.includes(seat.seatId);
                      return (
                        <button
                          key={seat.seatId}
                          type="button"
                          onClick={() => toggleSeat(seat)}
                          disabled={seat.status !== "Available"}
                          title={`${seat.seatId} · ${SEAT_TYPE_LABEL[seat.seatType] || seat.seatType}`}
                          className={`relative h-9 sm:h-10 rounded-lg border-2 text-[9px] sm:text-[10px] font-black flex items-center justify-center transition ${seatColor(seat)}`}
                        >
                          {isSelected ? <Check size={14} /> : seat.seatId}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Selected summary */}
              <div className="mt-5 pt-4 border-t border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between flex-wrap gap-3">
                <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                  {selectedSeats.length === 0
                    ? "Click a green-bordered seat to select it."
                    : (
                      <>
                        Selected:{" "}
                        <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          {selectedSeats.join(", ")}
                        </span>
                        <span className="text-slate-400 font-medium"> ({selectedSeats.length}/{maxSelectable})</span>
                      </>
                    )}
                </div>
                {flight?.price && flight.price > 0 && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    Fare: <strong className="text-slate-700 dark:text-slate-200">{displayPrice(flight.price)}</strong> / pax
                  </span>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-xs font-bold text-rose-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200/70 dark:border-white/[0.08] flex items-center justify-between gap-3 flex-shrink-0 bg-white dark:bg-[#0f1422]">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 text-xs font-bold px-5 py-3 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selectedSeats)}
            disabled={selectedSeats.length === 0}
            className="bg-[#008fe5] hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-6 py-3 rounded-xl shadow-lg shadow-blue-500/25 transition flex items-center gap-2 text-xs"
          >
            <Check size={15} /> Confirm {selectedSeats.length > 0 && `Seat${selectedSeats.length > 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}