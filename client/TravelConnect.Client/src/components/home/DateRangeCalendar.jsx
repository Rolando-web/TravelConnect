import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

/* ─── Helper: format date ───────────────────────────────────────────── */
export const formatDateLabel = (dateStr) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

/* Helper: Get year, monthIndex, and long label for a given offset from Jan 2026 */
const getMonthInfo = (baseIndex) => {
  const totalMonths = baseIndex;
  const year = 2026 + Math.floor(totalMonths / 12);
  const monthIndex = ((totalMonths % 12) + 12) % 12;
  const date = new Date(year, monthIndex, 1);
  const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const shortMonth = date.toLocaleDateString("en-US", { month: "short" });
  return { year, monthIndex, label, shortMonth, baseIndex };
};

/* ─── Dual-month date-range calendar popover ────────────────────────── */
export default function DateRangeCalendar({
  departureDate,
  setDepartureDate,
  returnDate,
  setReturnDate,
  selectingDateType,
  setSelectingDateType,
  onClose,
}) {
  // Base month index: 7 = August 2026 (0-indexed: Jan=0, Aug=7)
  const [baseMonthIndex, setBaseMonthIndex] = useState(7);

  const month1 = getMonthInfo(baseMonthIndex);
  const month2 = getMonthInfo(baseMonthIndex + 1);

  /* Generate blank + day cells for a calendar month */
  const getCalendarMonthDays = (year, monthIndex) => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const startDayOfWeek = new Date(year, monthIndex, 1).getDay();
    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const handleDateClick = (day, mInfo) => {
    if (!day) return;
    const dateString = `${mInfo.year}-${String(mInfo.monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (selectingDateType === "depart") {
      setDepartureDate(dateString);
      setSelectingDateType("return");
      if (returnDate && new Date(dateString) > new Date(returnDate)) setReturnDate("");
    } else {
      if (departureDate && new Date(dateString) >= new Date(departureDate)) {
        setReturnDate(dateString);
        onClose();
      } else {
        setDepartureDate(dateString);
        setSelectingDateType("return");
      }
    }
  };

  const isSelected = (day, mInfo) => {
    if (!day) return false;
    const d = `${mInfo.year}-${String(mInfo.monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return d === departureDate || d === returnDate;
  };

  const isInRange = (day, mInfo) => {
    if (!day || !departureDate || !returnDate) return false;
    const d = new Date(`${mInfo.year}-${String(mInfo.monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    return d > new Date(departureDate) && d < new Date(returnDate);
  };

  const prevMonth = () => setBaseMonthIndex((prev) => Math.max(0, prev - 1));
  const nextMonth = () => setBaseMonthIndex((prev) => prev + 1);

  const MonthGrid = ({ mInfo }) => (
    <div>
      <p className="text-center font-extrabold text-sm text-gray-900 dark:text-white mb-3">{mInfo.label}</p>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-gray-400 dark:text-slate-400">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 mt-2 text-center text-xs">
        {getCalendarMonthDays(mInfo.year, mInfo.monthIndex).map((day, idx) => (
          <button
            key={idx}
            type="button"
            disabled={!day}
            onClick={() => handleDateClick(day, mInfo)}
            className={`h-8 w-8 rounded-full font-bold transition flex items-center justify-center cursor-pointer ${
              !day
                ? "bg-transparent text-transparent pointer-events-none"
                : isSelected(day, mInfo)
                ? "bg-[#008fe5] text-white shadow-sm"
                : isInRange(day, mInfo)
                ? "bg-blue-50 dark:bg-blue-500/20 text-[#008fe5] dark:text-cyan-300 rounded-none"
                : "text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-white/10"
            }`}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="absolute right-0 top-full mt-2 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 shadow-2xl rounded-3xl p-6 z-[90] w-[600px] max-w-[92vw] text-left">
      
      {/* Top Bar: Presets & Month Navigation Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3 mb-4 gap-3">
        <span className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
          <Calendar size={15} className="text-[#008fe5]" /> Select departure &amp; return dates
        </span>

        <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
          <button
            type="button"
            onClick={() => { setDepartureDate("2026-08-25"); setReturnDate("2026-09-08"); setBaseMonthIndex(7); }}
            className="bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-slate-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
          >
            Next 2 weeks
          </button>
          <button
            type="button"
            onClick={() => { setDepartureDate("2026-09-01"); setReturnDate("2026-09-30"); setBaseMonthIndex(8); }}
            className="bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-slate-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
          >
            Next month
          </button>

          {/* Month selector shortcuts */}
          {[
            { label: "Aug", idx: 7 },
            { label: "Sep", idx: 8 },
            { label: "Oct", idx: 9 },
            { label: "Nov", idx: 10 },
            { label: "Dec", idx: 11 },
          ].map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={() => setBaseMonthIndex(m.idx)}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                baseMonthIndex === m.idx
                  ? "bg-[#008fe5] text-white shadow-sm"
                  : "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-slate-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Month Navigation Arrows Header */}
      <div className="flex items-center justify-between px-2 mb-2">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-slate-200 transition flex items-center gap-1 text-xs font-bold cursor-pointer"
          title="Previous month"
        >
          <ChevronLeft size={18} />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <span className="text-xs font-bold text-gray-400 dark:text-slate-400">
          Showing {month1.shortMonth} &amp; {month2.shortMonth} {month1.year}
        </span>

        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-slate-200 transition flex items-center gap-1 text-xs font-bold cursor-pointer"
          title="Next month"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Side-by-side Dual Months */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <MonthGrid mInfo={month1} />
        <MonthGrid mInfo={month2} />
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 dark:border-white/10 pt-4 mt-4 gap-3">
        <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
          {departureDate ? (
            <>
              Depart: <span className="font-bold text-gray-900 dark:text-white">{formatDateLabel(departureDate)}</span>
              {returnDate && <> · Return: <span className="font-bold text-gray-900 dark:text-white">{formatDateLabel(returnDate)}</span></>}
            </>
          ) : (
            "Click a departure date to start"
          )}
        </span>

        <button
          type="button"
          onClick={onClose}
          className="w-full sm:w-auto bg-[#008fe5] hover:bg-blue-600 text-white font-bold px-6 py-2 rounded-xl text-xs shadow-md transition cursor-pointer"
        >
          Confirm departure date
        </button>
      </div>
    </div>
  );
}
