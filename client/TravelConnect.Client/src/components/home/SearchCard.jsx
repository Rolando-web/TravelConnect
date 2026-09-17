import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, Users, Search, Hotel, Plane, Car, AlertTriangle } from "lucide-react";
import DestinationsDropdown from "./DestinationsDropdown";
import DateRangeCalendar, { formatDateLabel } from "./DateRangeCalendar";
import TravelersPopover from "./TravelersPopover";
import { useAvailable } from "../../context/AvailableContext";
import { hasFlightRoute } from "../../data/availability";

/* ═══ Location input (reusable for flight & car) ═══════════════════════ */
function LocationInput({ label, inputRef, placeholder, selected, search, setSearch, showDD, setShowDD, onSelect, showAnywhere = false, mode = "all" }) {
  return (
    <div className={`space-y-1.5 sm:space-y-2 relative ${showDD ? "z-[70]" : "z-10"}`} ref={inputRef}>
      <label className="block text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider text-left">{label}</label>
      <div className="relative">
        <MapPin className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400" size={18} />
        <input
          type="text"
          placeholder={placeholder}
          value={showDD ? search : `${selected.city} (${selected.code})`}
          onFocus={() => { setSearch(""); setShowDD(true); }}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 focus:border-[#008fe5] focus:bg-white dark:focus:bg-white/10 rounded-2xl py-3.5 sm:py-4 pl-11 sm:pl-12 pr-4 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white outline-none transition-all placeholder-gray-400 dark:placeholder-slate-500"
        />
      </div>
      {showDD && (
        <DestinationsDropdown
          searchVal={search}
          onSearchChange={(v) => { setSearch(v); setShowDD(false); }}
          onSelect={(item) => { onSelect(item); setShowDD(false); }}
          showAnywhere={showAnywhere}
          mode={mode}
        />
      )}
    </div>
  );
}

/* ═══ Date trigger button ═════════════════════════════════════════════ */
function DateTrigger({ label, calendarRef, showCalendar, setShowCalendar, setSelectingDateType, departureDate, setDepartureDate, returnDate, setReturnDate, selectingDateType, tripType }) {
  return (
    <div className={`space-y-1.5 sm:space-y-2 relative ${showCalendar ? "z-[70]" : "z-10"}`} ref={calendarRef}>
      <label className="block text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider text-left">{label}</label>
      <button
        type="button"
        onClick={() => { setSelectingDateType("depart"); setShowCalendar(!showCalendar); }}
        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-left rounded-2xl py-3.5 sm:py-4 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white outline-none transition-all flex items-center gap-2 hover:border-[#008fe5]/50 cursor-pointer"
      >
        <Calendar size={18} className="text-gray-400 dark:text-slate-400 shrink-0" />
        <span className="truncate">
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
}

/* ═══════════════════════════════════════════════════════════════════════
   SEARCH CARD — tabbed booking form (Flights · Flight+Hotel · Car Rental)
   Search dropdowns & defaults are driven by the live availability context
   so users can only pick destinations the system actually serves.
═══════════════════════════════════════════════════════════════════════ */
export default function SearchCard() {
  const navigate = useNavigate();
  const [searchTab, setSearchTab] = useState("flights");
  const { originCities, reachableCities, flightRoutes } = useAvailable();

  const defaultFrom = originCities.find((c) => c.city.toLowerCase() === "manila")
    || originCities[0]
    || { city: "Manila", country: "Philippines", code: "MNL", airport: "Ninoy Aquino Intl" };
  const defaultTo = reachableCities.find((c) => c.city.toLowerCase() === "tokyo")
    || reachableCities[0]
    || { city: "Tokyo", country: "Japan", code: "HND", airport: "Haneda Airport" };

  // ─── Flight states ─────────────────────────────────────────────────
  const [tripType, setTripType] = useState("round-trip");
  const [nonstop, setNonstop] = useState(false);
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");
  const [selectedFrom, setSelectedFrom] = useState(defaultFrom);
  const [selectedTo, setSelectedTo] = useState(defaultTo);
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
  const [selectedCarFrom, setSelectedCarFrom] = useState(defaultFrom);
  const [selectedCarTo, setSelectedCarTo] = useState(defaultTo);
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

  // Whether the selected origin → destination actually has an available flight.
  const routeAvailable =
    selectedTo?.city?.toLowerCase() === "anywhere" ||
    hasFlightRoute(flightRoutes, selectedFrom?.city, selectedTo?.city);

  // ─── Submit handler ────────────────────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();

    // Flights / Flight+Hotel only make sense if the origin→destination is served.
    if (searchTab !== "cars") {
      const isAnywhere = selectedTo?.city?.toLowerCase() === "anywhere";
      if (!isAnywhere && !routeAvailable) {
        // Don't navigate to an empty dead-end; surface a live hint instead.
        setToast(selectedTo?.city || "");
        return;
      }
    }

    if (searchTab === "cars") {
      const params = new URLSearchParams();
      if (selectedCarFrom?.city) params.set("from", selectedCarFrom.city);
      navigate(`/cars?${params.toString()}`);
      return;
    }

    const params = new URLSearchParams();
    if (selectedFrom?.city) params.set("from", selectedFrom.city);
    if (selectedTo?.city) params.set("to", selectedTo.city);
    if (departureDate) params.set("date", departureDate);
    params.set("class", cabinClass);

    if (searchTab === "flight-hotel") {
      navigate(`/deals?${params.toString()}`);
    } else {
      navigate(`/flights?${params.toString()}`);
    }
  };

  const [toast, setToast] = useState("");

  return (
    <div className="bg-white dark:bg-[#0c1222] rounded-2xl md:rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-white/10 p-4 sm:p-6 md:p-10 transition-all duration-300 relative z-30">

      {/* ─── Main Tabs ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-start sm:justify-start gap-2 sm:gap-4 pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-gray-100 dark:border-white/10 overflow-x-auto scrollbar-none">
        {[
          { id: "flights", label: "Flights", Icon: Plane },
          { id: "flight-hotel", label: "Flight + Hotel", Icon: Hotel },
          { id: "cars", label: "Car Rental", Icon: Car },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setSearchTab(id)}
            className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              searchTab === id
                ? "bg-blue-50 dark:bg-[#008fe5]/20 text-[#008fe5] dark:text-cyan-300 font-extrabold shadow-sm"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* ─── Trip options (flights only) ───────────────────────────── */}
      {searchTab !== "cars" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 mb-5 border-b border-gray-50 dark:border-white/5">
          <div className="flex flex-wrap items-center justify-start sm:justify-start gap-3 sm:gap-6">
            {["round-trip", "one-way", "multi-city"].map((t) => (
              <label key={t} className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-slate-300 cursor-pointer">
                <input type="radio" checked={tripType === t} onChange={() => setTripType(t)} className="text-[#008fe5] focus:ring-[#008fe5]" />
                {t === "round-trip" ? "Round-trip" : t === "one-way" ? "One-way" : "Multi-city"}
              </label>
            ))}
            <label className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-slate-300 cursor-pointer">
              <input type="checkbox" checked={nonstop} onChange={(e) => setNonstop(e.target.checked)} className="rounded text-[#008fe5] focus:ring-[#008fe5]" />
              Nonstop
            </label>
          </div>

          {/* Travelers button */}
          <div className={`relative w-full sm:w-auto ${showTravelers ? "z-[70]" : "z-10"}`} ref={travelersRef}>
            <button
              type="button"
              onClick={() => setShowTravelers(!showTravelers)}
              className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1 text-xs font-bold text-gray-700 dark:text-slate-200 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 px-4 py-2.5 sm:py-2 rounded-xl transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Users size={14} className="text-gray-400 dark:text-slate-400 shrink-0" />
                <span>{adults + children + infants} Passenger{adults + children + infants > 1 ? "s" : ""} — {cabinClass}</span>
              </div>
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
        {toast && (
          <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-xs font-semibold">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>
              We don't currently offer flights to <strong>{toast}</strong>. Please choose a
              destination from the available list, or try&nbsp;
              <button
                type="button"
                onClick={() => {
                  const alt = reachableCities.find((c) => c.city.toLowerCase() === "cebu")
                    || reachableCities[0];
                  if (alt) { setSelectedTo(alt); setToast(""); }
                }}
                className="underline text-amber-900 font-bold"
              >
                {reachableCities.find((c) => c.city.toLowerCase() === "cebu")?.city || reachableCities[0]?.city || "another route"}
              </button>
              .
            </span>
          </div>
        )}

        {searchTab !== "cars" ? (
          /* ── Flights / Flight + Hotel ── */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
            <LocationInput
              label="Leaving from" inputRef={fromRef} placeholder="Departure City/Country"
              selected={selectedFrom} search={fromSearch} setSearch={setFromSearch}
              showDD={showFromDropdown} setShowDD={setShowFromDropdown} onSelect={setSelectedFrom}
              mode="origin"
            />
            <LocationInput
              label="Going to" inputRef={toRef} placeholder="Going to Country/City"
              selected={selectedTo} search={toSearch} setSearch={setToSearch}
              showDD={showToDropdown} setShowDD={setShowToDropdown}
              onSelect={(item) => { setSelectedTo(item); setToast(""); }}
              showAnywhere
              mode={searchTab === "flight-hotel" ? "trip" : "flight"}
            />
            <DateTrigger
              label="Dates"
              calendarRef={calendarRef}
              showCalendar={showCalendar}
              setShowCalendar={setShowCalendar}
              setSelectingDateType={setSelectingDateType}
              departureDate={departureDate}
              setDepartureDate={setDepartureDate}
              returnDate={returnDate}
              setReturnDate={setReturnDate}
              selectingDateType={selectingDateType}
              tripType={tripType}
            />

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
              {searchTab === "flights" ? (
                <>
                  <button
                    type="submit"
                    className="w-full sm:flex-1 bg-[#008fe5] hover:bg-blue-600 active:scale-[0.98] text-white font-bold py-3.5 sm:py-4 px-5 sm:px-6 rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/35 transition flex items-center justify-center gap-2 text-sm cursor-pointer"
                  >
                    <Search size={18} /> Search
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchTab("flight-hotel")}
                    className="w-full sm:w-auto border-2 border-[#008fe5] text-[#008fe5] hover:bg-blue-50 dark:hover:bg-white/5 active:scale-[0.98] font-bold py-3 sm:py-3.5 px-5 sm:px-6 rounded-2xl transition flex items-center justify-center gap-2 text-sm whitespace-nowrap bg-white dark:bg-transparent cursor-pointer"
                  >
                    Flight + Hotel
                  </button>
                </>
              ) : (
                <button
                  type="submit"
                  className="w-full bg-[#008fe5] hover:bg-blue-600 active:scale-[0.98] text-white font-bold py-3.5 sm:py-4 px-6 rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/35 transition flex items-center justify-center gap-2 text-sm cursor-pointer"
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
              mode="all"
            />
            <LocationInput
              label="Drop-off Location" inputRef={carToRef} placeholder="Drop-off Airport or City"
              selected={selectedCarTo} search={carToSearch} setSearch={setCarToSearch}
              showDD={showCarToDropdown} setShowDD={setShowCarToDropdown} onSelect={setSelectedCarTo}
              mode="all"
            />
            <DateTrigger
              label="Rental Dates"
              calendarRef={calendarRef}
              showCalendar={showCalendar}
              setShowCalendar={setShowCalendar}
              setSelectingDateType={setSelectingDateType}
              departureDate={departureDate}
              setDepartureDate={setDepartureDate}
              returnDate={returnDate}
              setReturnDate={setReturnDate}
              selectingDateType={selectingDateType}
              tripType={tripType}
            />
            <button
              type="submit"
              className="w-full bg-[#008fe5] hover:bg-blue-600 active:scale-[0.98] text-white font-bold py-3.5 sm:py-4 px-6 rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/35 transition flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Search size={18} /> Search Cars
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
