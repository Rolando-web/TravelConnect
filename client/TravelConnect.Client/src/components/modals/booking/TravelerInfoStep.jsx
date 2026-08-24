export default function TravelerInfoStep({
  guestName,
  setGuestName,
  guestEmail,
  setGuestEmail,
  guestPhone,
  setGuestPhone,
  specialRequests,
  setSpecialRequests
}) {
  return (
    <div className="space-y-5 animate-fadeIn">
      <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">
        Primary Traveler &amp; Special Requests
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="e.g. Jane Doe"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-[#008fe5]/30 focus:border-[#008fe5] outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
          <input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="jane@example.com"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-[#008fe5]/30 focus:border-[#008fe5] outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
        <input
          type="text"
          value={guestPhone}
          onChange={(e) => setGuestPhone(e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-[#008fe5]/30 focus:border-[#008fe5] outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          Customer Inquiry &amp; Special Requests (Optional)
        </label>
        <textarea
          rows={3}
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="Dietary requirements, room preferences, flight seating, or inquiries for agency staff..."
          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-[#008fe5]/30 focus:border-[#008fe5] outline-none resize-none"
        />
      </div>
    </div>
  );
}
