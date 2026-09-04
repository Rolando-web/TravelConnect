import { useState } from "react";
import { User, CreditCard, ShieldCheck } from "lucide-react";

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
  const [firstName, setFirstName] = useState(guestName ? guestName.split(" ")[0] : "");
  const [lastName, setLastName] = useState(guestName ? guestName.split(" ").slice(1).join(" ") : "");
  const [noSurname, setNoSurname] = useState(false);
  const [gender, setGender] = useState("Male");
  const [dob, setDob] = useState("1995-06-15");
  const [nationality, setNationality] = useState("Philippines");
  const [ffProgram, setFfProgram] = useState("Qatar Airways");
  const [ffNumber, setFfNumber] = useState("");

  const updateFullName = (f, l, noSur) => {
    const full = noSur ? f.trim() : `${f.trim()} ${l.trim()}`.trim();
    setGuestName(full);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
          <User size={16} className="text-[#008fe5]" /> Primary Traveler Information
        </h3>
        <span className="text-[11px] text-gray-400 font-medium">Passenger 1 (Adult)</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Given / First Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              updateFullName(e.target.value, lastName, noSurname);
            }}
            placeholder="e.g. Jane"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-[#008fe5]/30 focus:border-[#008fe5] outline-none"
          />
        </div>

        {!noSurname && (
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Surname / Last Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                updateFullName(firstName, e.target.value, noSurname);
              }}
              placeholder="e.g. Doe"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-[#008fe5]/30 focus:border-[#008fe5] outline-none"
            />
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 font-medium">
        <input
          type="checkbox"
          checked={noSurname}
          onChange={(e) => {
            setNoSurname(e.target.checked);
            updateFullName(firstName, lastName, e.target.checked);
          }}
          className="rounded text-[#008fe5] focus:ring-[#008fe5] w-4 h-4 accent-[#008fe5]"
        />
        <span>This passenger has no surname (single word legal name)</span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Date of Birth</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Nationality</label>
          <select
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none"
          >
            <option value="Philippines">Philippines</option>
            <option value="United States">United States</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="Japan">Japan</option>
            <option value="Singapore">Singapore</option>
            <option value="Australia">Australia</option>
            <option value="Canada">Canada</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Email for E-Tickets</label>
          <input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="jane@example.com"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-[#008fe5]/30 focus:border-[#008fe5] outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Mobile Phone (+63)</label>
          <input
            type="text"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            placeholder="+63 917 123 4567"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-[#008fe5]/30 focus:border-[#008fe5] outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          Special Requests &amp; Inquiries (Optional)
        </label>
        <textarea
          rows={2}
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="Dietary requirements, room preferences, flight seating, or inquiries for agency staff..."
          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-[#008fe5]/30 focus:border-[#008fe5] outline-none resize-none"
        />
      </div>
    </div>
  );
}
