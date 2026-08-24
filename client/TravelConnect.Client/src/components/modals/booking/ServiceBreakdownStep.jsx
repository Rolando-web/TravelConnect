import { Shield, Plane, Hotel, Car, Ticket, Calendar, Users } from "lucide-react";

export default function ServiceBreakdownStep({
  services,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  travellers,
  setTravellers
}) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Included Services Banner */}
      <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-5">
        <h3 className="text-sm font-extrabold text-gray-900 mb-1 flex items-center gap-2">
          <Shield size={16} className="text-[#008fe5]" /> All-Inclusive Package Bundled Services
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          This package combines all travel services into one simple payment. No separate bookings required.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-white p-3.5 rounded-xl border border-gray-100 flex items-start gap-3 shadow-sm">
            <Plane size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-gray-900">Flight Included</p>
              <p className="text-gray-500 text-[11px] leading-tight">{services.flight}</p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-gray-100 flex items-start gap-3 shadow-sm">
            <Hotel size={18} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-gray-900">Hotel Accommodation</p>
              <p className="text-gray-500 text-[11px] leading-tight">{services.hotel}</p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-gray-100 flex items-start gap-3 shadow-sm">
            <Car size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-gray-900">Car Rental / Transit</p>
              <p className="text-gray-500 text-[11px] leading-tight">{services.car}</p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-gray-100 flex items-start gap-3 shadow-sm">
            <Ticket size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-gray-900">Guided Activities</p>
              <p className="text-gray-500 text-[11px] leading-tight">{services.activities}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Travel Dates & Passenger Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
            <Calendar size={13} /> Departure Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-[#008fe5]/30 focus:border-[#008fe5] outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
            <Calendar size={13} /> Return Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-[#008fe5]/30 focus:border-[#008fe5] outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
            <Users size={13} /> Travelers / Guests
          </label>
          <select
            value={travellers}
            onChange={(e) => setTravellers(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-[#008fe5]/30 focus:border-[#008fe5] outline-none bg-white"
          >
            {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n} Passenger{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
