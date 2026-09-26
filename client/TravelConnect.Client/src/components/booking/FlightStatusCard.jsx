import { Plane, CalendarDays, Armchair } from "lucide-react";
import { deriveFlightStatus } from "../../data/flightStatus";

const STATUS_STYLES = {
  scheduled: { dot: "bg-emerald-500", label: "Scheduled · On Time", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20", bar: "from-emerald-600/80 to-emerald-400/40" },
  today: { dot: "bg-amber-400", label: "Traveling Today", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20", bar: "from-amber-500/80 to-amber-400/30" },
  completed: { dot: "bg-blue-500", label: "Journey Completed", badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20", bar: "from-blue-600/80 to-blue-400/40" },
  cancelled: { dot: "bg-rose-500", label: "Booking Cancelled", badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20", bar: "from-rose-600/80 to-rose-400/40" },
};

export default function FlightStatusCard({ booking }) {
  if (!booking) return null;
  const flights = Array.isArray(booking.bookingFlights) ? booking.bookingFlights : [];
  const state = deriveFlightStatus(booking);
  const style = STATUS_STYLES[state] || STATUS_STYLES.scheduled;
  const isCancelled = state === "cancelled";
  const flightSummary = flights.length === 1
    ? "1 confirmed flight."
    : `${flights.length} confirmed flights.`;

  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-white/[0.06] overflow-hidden">
      {/* Header: live flight status */}
      <div className={`flex items-center justify-between gap-2 px-3.5 py-2 bg-gradient-to-r ${style.bar} text-white`}>
        <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${state === "scheduled" ? "animate-pulse" : ""}`} />
          Flight Status
        </span>
        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border leading-none ${isCancelled ? "bg-white/15 border-white/25 text-white" : "bg-black/15 border-white/20 text-white"}`}>
          {style.label}
        </span>
      </div>

      {/* One row per flight segment */}
      <div className="divide-y divide-slate-200/50 dark:divide-white/[0.04]">
        {flights.length === 0 ? (
          <div className="px-3.5 py-3 text-[11px] text-slate-500 dark:text-slate-400">
            No flight details on record.
          </div>
        ) : (
          flights.map((f, i) => (
            <div key={i} className="px-3.5 py-2.5 bg-slate-50/70 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2 min-w-0">
                  <Plane size={13} className="text-[#008fe5] shrink-0" />
                  <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                    {f.airline} {f.flightNumber} · {f.departureCity} → {f.arrivalCity}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="flex items-center gap-1 font-mono text-slate-500 dark:text-slate-400">
                    <CalendarDays size={11} /> {f.departureDate}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-slate-500 dark:text-slate-400">
                    {f.departureTime} → {f.arrivalTime}
                  </span>
                  {f.seatNumber ? (
                    <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg font-mono font-black uppercase">
                      <Armchair size={11} /> {f.seatNumber}
                    </span>
                  ) : (
                    <span className="bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-lg font-mono uppercase">
                      Seat at check-in
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer summary line */}
      <div className={`px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider ${isCancelled ? "bg-rose-500/5 text-rose-600 dark:text-rose-400" : "bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"}`}>
        {isCancelled
          ? "This journey was cancelled — nothing was flown."
          : state === "completed"
            ? "All segments completed — moved to Past Journeys."
            : state === "today"
              ? "Departure is today — check in early and travel safe."
              : flightSummary}
      </div>
    </div>
  );
}