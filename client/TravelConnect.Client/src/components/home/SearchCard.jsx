import { useState, useRef, useEffect } from "react";
import { MapPin, Calendar, Users, Search, Hotel, Plane, Car } from "lucide-react";
import DestinationsDropdown from "./DestinationsDropdown";
import DateRangeCalendar, { formatDateLabel } from "./DateRangeCalendar";
import TravelersPopover from "./TravelersPopover";

/* ═══════════════════════════════════════════════════════════════════════
   SEARCH CARD — tabbed booking form (Flights · Flight+Hotel · Car Rental)
═══════════════════════════════════════════════════════════════════════ */
export default function SearchCard() {
  const [searchTab, setSearchTab] = useState("flights");

  // ─── Flight states ─────────────────────────────────────────────────
  const [tripType, setTripType] = useState("round-trip");
  const [nonstop, setNonstop] = useState(false);
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");
  const [selectedFrom, setSelectedFrom] = useState({ city: "Manila", country: "Philippines", code: "MNL", airport: "Ninoy Aquino Intl" });
  const [selectedTo, setSelectedTo] = useState({ city: "Tokyo", country: "Japan", code: "HND", airport: "Haneda Airport" });
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  // ─── Date states ───────────────────────────────────────────────────
  const [showCalendar, setShowCalendar] = useState(false);
  const [departureDate, setDepartureDate] = useState("2026-08-25");
  const [returnDate, setReturnDate] = useState("2026-08-27");
  const [selectingDateType, setSelectingDateType] = useState("depart");

  // ─── Traveler states ───────────────────────────────────────────────
  const [showTravelers, setShowTravelers] = useState(false);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [cabinClass, setCabinClass] = useState("Economy");

  // ─── Car rental states ─────────────────────────────────────────────
  const [carFromSearch, setCarFromSearch] = useState("");
  const [carToSearch, setCarToSearch] = useState("");
  const [selectedCarFrom, setSelectedCarFrom] = useState({ city: "Manila", country: "Philippines", code: "MNL", airport: "Ninoy Aquino Intl" });
  const [selectedCarTo, setSelectedCarTo] = useState({ city: "Manila", country: "Philippines", code: "MNL", airport: "Ninoy Aquino Intl" });
  const [showCarFromDropdown, setShowCarFromDropdown] = useState(false);
  const [showCarToDropdown, setShowCarToDropdown] = useState(false);

  // ─── Refs for click-outside ────────────────────────────────────────
  const fromRef = useRef(null);
  const toRef = useRef(null);
  const calendarRef = useRef(null);
  const travelersRef = useRef(null);
  const carFromRef = useRef(null);
  const carToRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (fromRef.current && !fromRef.current.contains(e.target)) setShowFromDropdown(false);
      if (toRef.current && !toRef.current.contains(e.target)) setShowToDropdown(false);
      if (calendarRef.current && !calendarRef.current.contains(e.target)) setShowCalendar(false);
      if (travelersRef.current && !travelersRef.current.contains(e.target)) setShowTravelers(false);
      if (carFromRef.current && !carFromRef.current.contains(e.target)) setShowCarFromDropdown(false);
      if (carToRef.current && !carToRef.current.contains(e.target)) setShowCarToDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Submit handler ────────────────────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTab === "cars") {
      alert(`Car Rental Search:\nPick-up: ${selectedCarFrom.city}\nDrop-off: ${selectedCarTo.city}\nDates: ${departureDate} to ${returnDate}`);
    } else {
      alert(
        `${searchTab === "flight-hotel" ? "Flight + Hotel" : "Flight"} Search:\n` +
        `From: ${selectedFrom.city} (${selectedFrom.code})\nTo: ${selectedTo.city} (${selectedTo.code})\n` +
        `Type: ${tripType}\nDates: ${departureDate} → ${tripType === "round-trip" ? returnDate : "N/A"}\n` +
        `Passengers: Adults (${adults}), Children (${children}), Infants (${infants})\nClass: ${cabinClass}\nNonstop: ${nonstop ? "Yes" : "No"}`
      );
    }
  };

  /* ═══ Location input (reusable for flight & car) ═══════════════════ */
  const LocationInput = ({ label, inputRef, placeholder, selected, search, setSearch, showDD, setShowDD, onSelect, showAnywhere = false }) => (
    <div className={`space-y-2 relative ${showDD ? "z-[70]" : "z-10"}`} ref={inputRef}>
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider text-left">{label}</label>
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder={placeholder}
          value={showDD ? search : `${selected.city} (${selected.code})`}
          onFocus={() => { setSearch(""); setShowDD(true); }}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-50 border border-gray-100 focus:border-[#008fe5] focus:bg-white rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold text-gray-900 outline-none transition-all"
        />
      </div>
      {showDD && (
        <DestinationsDropdown
          searchVal={search}
          onSearchChange={(v) => { setSearch(v); setShowDD(false); }}
          onSelect={(item) => { onSelect(item); setShowDD(false); }}
          showAnywhere={showAnywhere}
        />
      )}
    </div>
  );

  /* ═══ Date trigger button ══════════════════════════════════════════ */
  const DateTrigger = ({ label }) => (
    <div className={`space-y-2 relative ${showCalendar ? "z-[70]" : "z-10"}`} ref={calendarRef}>
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider text-left">{label}</label>
      <button
        type="button"
        onClick={() => { setSelectingDateType("depart"); setShowCalendar(!showCalendar); }}
        className="w-full bg-gray-50 border border-gray-100 text-left rounded-2xl py-4 px-4 text-sm font-semibold text-gray-900 outline-none transition-all flex items-center gap-2"
      >
        <Calendar size={18} className="text-gray-400" />
        <span>
          {formatDateLabel(departureDate)}
          {tripType !== "one-way" && returnDate && ` — ${formatDateLabel(returnDate)}`}
        </span>
      </button>
      {showCalendar && (
        <DateRangeCalendar
          departureDate={departureDate}
          setDepartureDate={setDepartureDate}
          returnDate={returnDate}
          setReturnDate={setReturnDate}
          selectingDateType={selectingDateType}
          setSelectingDateType={setSelectingDateType}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl md:rounded-[2.5rem] shadow-2xl border border-gray-100 p-6 md:p-10 transition-all duration-300 relative z-30">

      {/* ─── Main Tabs ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 pb-4 mb-6 border-b border-gray-100 overflow-x-auto scrollbar-none">
        {[
          { id: "flights", label: "Flights", Icon: Plane },
          { id: "flight-hotel", label: "Flight + Hotel", Icon: Hotel },
          { id: "cars", label: "Car Rental", Icon: Car },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setSearchTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition whitespace-nowrap ${searchTab === id ? "bg-blue-50 text-[#008fe5]" : "text-gray-500 hover:text-gray-900"
              }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* ─── Trip options (flights only) ───────────────────────────── */}
      {searchTab !== "cars" && (
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-5 border-b border-gray-50">
          <div className="flex items-center gap-6">
            {["round-trip", "one-way", "multi-city"].map((t) => (
              <label key={t} className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
                <input type="radio" checked={tripType === t} onChange={() => setTripType(t)} className="text-[#008fe5] focus:ring-[#008fe5]" />
                {t === "round-trip" ? "Round-trip" : t === "one-way" ? "One-way" : "Multi-city"}
              </label>
            ))}
            <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer ml-4">
              <input type="checkbox" checked={nonstop} onChange={(e) => setNonstop(e.target.checked)} className="rounded text-[#008fe5] focus:ring-[#008fe5]" />
              Nonstop
            </label>
          </div>

          {/* Travelers button */}
          <div className={`relative ${showTravelers ? "z-[70]" : "z-10"}`} ref={travelersRef}>
            <button
              type="button"
              onClick={() => setShowTravelers(!showTravelers)}
              className="flex items-center gap-1 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-100 hover:bg-gray-100 px-4 py-2 rounded-xl transition"
            >
              <Users size={14} className="text-gray-400" />
              {adults + children + infants} Passenger{adults + children + infants > 1 ? "s" : ""} — {cabinClass}
            </button>
            {showTravelers && (
              <TravelersPopover
                adults={adults} setAdults={setAdults}
                children={children} setChildren={setChildren}
                infants={infants} setInfants={setInfants}
                cabinClass={cabinClass} setCabinClass={setCabinClass}
                onClose={() => setShowTravelers(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* ─── Form ─────────────────────────────────────────────────── */}
      <form onSubmit={handleSearch}>
        {searchTab !== "cars" ? (
          /* ── Flights / Flight + Hotel ── */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
            <LocationInput
              label="Leaving from" inputRef={fromRef} placeholder="Departure City/Country"
              selected={selectedFrom} search={fromSearch} setSearch={setFromSearch}
              showDD={showFromDropdown} setShowDD={setShowFromDropdown} onSelect={setSelectedFrom}
            />
            <LocationInput
              label="Going to" inputRef={toRef} placeholder="Going to Country/City"
              selected={selectedTo} search={toSearch} setSearch={setToSearch}
              showDD={showToDropdown} setShowDD={setShowToDropdown} onSelect={setSelectedTo}
              showAnywhere
            />
            <DateTrigger label="Dates" />

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {searchTab === "flights" ? (
                <>
                  <button
                    type="submit"
                    className="flex-1 bg-[#008fe5] hover:bg-blue-600 active:scale-[0.98] text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/35 transition flex items-center justify-center gap-2 text-sm"
                  >
                    <Search size={18} /> Search
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchTab("flight-hotel")}
                    className="border-2 border-[#008fe5] text-[#008fe5] hover:bg-blue-50 active:scale-[0.98] font-bold py-3.5 px-6 rounded-2xl transition flex items-center justify-center gap-2 text-sm whitespace-nowrap bg-white"
                  >
                    Flight + Hotel
                  </button>
                </>
              ) : (
                <button
                  type="submit"
                  className="w-full bg-[#008fe5] hover:bg-blue-600 active:scale-[0.98] text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/35 transition flex items-center justify-center gap-2 text-sm"
                >
                  <Search size={18} /> Search Packages
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ── Car Rental ── */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
            <LocationInput
              label="Pick-up Location" inputRef={carFromRef} placeholder="Pick-up Airport or City"
              selected={selectedCarFrom} search={carFromSearch} setSearch={setCarFromSearch}
              showDD={showCarFromDropdown} setShowDD={setShowCarFromDropdown} onSelect={setSelectedCarFrom}
            />
            <LocationInput
              label="Drop-off Location" inputRef={carToRef} placeholder="Drop-off Airport or City"
              selected={selectedCarTo} search={carToSearch} setSearch={setCarToSearch}
              showDD={showCarToDropdown} setShowDD={setShowCarToDropdown} onSelect={setSelectedCarTo}
            />
            <DateTrigger label="Rental Dates" />
            <button
              type="submit"
              className="w-full bg-[#008fe5] hover:bg-blue-600 active:scale-[0.98] text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/35 transition flex items-center justify-center gap-2 text-sm"
            >
              <Search size={18} /> Search Cars
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
