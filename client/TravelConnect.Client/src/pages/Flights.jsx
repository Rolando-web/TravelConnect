import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Plane, ArrowRight, Star, MapPin, Clock, Calendar, Eye, Wifi,
  Luggage, ShieldCheck, CheckCircle2, Search, X, SlidersHorizontal,
  RotateCcw, Award, ChevronRight, Armchair, Utensils, Zap, HelpCircle
} from "lucide-react";
import { useBooking } from "../context/BookingContext";
import { useCurrency } from "../context/CurrencyContext";
import { useAvailable } from "../context/AvailableContext";
import { useTheme } from "../context/ThemeContext";
import FavoriteButton from "../components/shared/FavoriteButton";
import FlightFareTierModal from "../components/modals/booking/FlightFareTierModal";
import PageHeroCarousel from "../components/shared/PageHeroCarousel";
import { flightsApi } from "../services/api";

const AIRPORT_CODES = {
  manila: "MNL",
  cebu: "CEB",
  boracay: "MPH",
  caticlan: "MPH",
  "el nido": "ENI",
  "puerto princesa": "PPS",
  tokyo: "HND",
  singapore: "SIN",
  paris: "CDG",
  dubai: "DXB",
  bali: "DPS",
  bangkok: "BKK",
  "hong kong": "HKG",
  rome: "FCO",
  london: "LHR",
  "san francisco": "SFO",
  "new york": "JFK",
};

const getCode = (city) => {
  if (!city) return "AIR";
  const clean = city.toLowerCase().trim();
  for (const [key, code] of Object.entries(AIRPORT_CODES)) {
    if (clean.includes(key)) return code;
  }
  return city.replace(/[^A-Za-z]/g, "").substring(0, 3).toUpperCase() || "AIR";
};

const FLIGHT_HERO_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=2000&q=80",
    alt: "Commercial passenger airliner cruising above clouds in golden sunrise",
  },
  {
    image: "https://images.unsplash.com/photo-1520437358207-323b43b50729?auto=format&fit=crop&w=2000&q=80",
    alt: "Commercial airliner landing at dusk with runway lights glowing",
  },
  {
    image: "https://images.unsplash.com/photo-1558389186-4386d1bea007?auto=format&fit=crop&w=2000&q=80",
    alt: "Modern airport international departure terminal tarmac",
  },
  {
    image: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=2000&q=80",
    alt: "Commercial airliner wing soaring above azure ocean",
  },
];

const FALLBACK_LUXURY_FLIGHTS = [
  {
    id: 1,
    airline: "Philippine Airlines",
    flightNumber: "PR 432",
    departureCity: "Manila",
    arrivalCity: "Tokyo",
    departureTime: "08:45 AM",
    arrivalTime: "02:10 PM",
    departureDate: "2026-10-15",
    duration: "4h 25m",
    stops: "Non-Stop Direct",
    price: 18500,
    class: "Business Class",
    aircraft: "Airbus A350-900",
    imageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
    seatsAvailable: 4,
    baggage: "35kg Checked + 7kg Cabin",
    meal: "Signature Chef Degustation",
    wifi: "Complimentary Satellite WiFi"
  },
  {
    id: 2,
    airline: "Singapore Airlines",
    flightNumber: "SQ 915",
    departureCity: "Manila",
    arrivalCity: "Singapore",
    departureTime: "11:20 AM",
    arrivalTime: "03:00 PM",
    departureDate: "2026-10-18",
    duration: "3h 40m",
    stops: "Non-Stop Direct",
    price: 16200,
    class: "First Class",
    aircraft: "Boeing 787-10 Dreamliner",
    imageUrl: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=1200&q=80",
    seatsAvailable: 6,
    baggage: "40kg Checked + 10kg Cabin",
    meal: "Book the Cook Gourmet Dining",
    wifi: "High-Speed Unlimited Stream"
  },
  {
    id: 3,
    airline: "AirSWIFT Prestige",
    flightNumber: "T6 312",
    departureCity: "Manila",
    arrivalCity: "El Nido",
    departureTime: "06:15 AM",
    arrivalTime: "07:35 AM",
    departureDate: "2026-10-20",
    duration: "1h 20m",
    stops: "Scenic Direct Island Hop",
    price: 11400,
    class: "Premium Executive",
    aircraft: "ATR 72-600 VIP",
    imageUrl: "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=80",
    seatsAvailable: 8,
    baggage: "20kg Checked + 7kg Cabin",
    meal: "Artisanal Island Refreshment",
    wifi: "Private Terminal Lounge Access"
  },
  {
    id: 4,
    airline: "Emirates",
    flightNumber: "EK 337",
    departureCity: "Manila",
    arrivalCity: "Dubai",
    departureTime: "06:40 PM",
    arrivalTime: "11:35 PM",
    departureDate: "2026-11-01",
    duration: "8h 55m",
    stops: "Non-Stop Direct",
    price: 34500,
    class: "Business Class",
    aircraft: "Boeing 777-300ER",
    imageUrl: "https://images.unsplash.com/photo-1569629743817-70d8db6c323b?auto=format&fit=crop&w=1200&q=80",
    seatsAvailable: 3,
    baggage: "40kg Checked + 10kg Cabin",
    meal: "Caviar & Sommelier Wine Pairing",
    wifi: "Onboard Bar & Fiber WiFi"
  },
  {
    id: 5,
    airline: "Cebu Pacific Air",
    flightNumber: "5J 891",
    departureCity: "Manila",
    arrivalCity: "Boracay",
    departureTime: "09:00 AM",
    arrivalTime: "10:10 AM",
    departureDate: "2026-10-22",
    duration: "1h 10m",
    stops: "Non-Stop Direct",
    price: 6800,
    class: "Economy Plus",
    aircraft: "Airbus A321neo",
    imageUrl: "https://images.unsplash.com/photo-1520437358207-323b43b50729?auto=format&fit=crop&w=1200&q=80",
    seatsAvailable: 12,
    baggage: "20kg Checked + 7kg Cabin",
    meal: "Complimentary Snack & Drink",
    wifi: "Express Gate Boarding"
  },
  {
    id: 6,
    airline: "Air France",
    flightNumber: "AF 168",
    departureCity: "Manila",
    arrivalCity: "Paris",
    departureTime: "10:30 PM",
    arrivalTime: "06:15 AM",
    departureDate: "2026-11-10",
    duration: "14h 45m",
    stops: "1 Stop (Singapore)",
    price: 46800,
    class: "Business Suite",
    aircraft: "Boeing 777-200ER",
    imageUrl: "https://images.unsplash.com/photo-1556388158-158ea5ccacbd?auto=format&fit=crop&w=1200&q=80",
    seatsAvailable: 2,
    baggage: "2 x 32kg Checked + 12kg Cabin",
    meal: "Michelin 3-Star French Menus",
    wifi: "Lie-Flat Sliding Private Door Suite"
  }
];

const toFlightBooking = (flight) => ({
  id: `FLIGHT-${flight.id}`,
  name: `${flight.airline} ${flight.flightNumber} • ${flight.departureCity} → ${flight.arrivalCity}`,
  location: `${flight.departureCity} → ${flight.arrivalCity}`,
  price: Number(flight.price || 0),
  duration: flight.duration || "1 Flight",
  img: flight.imageUrl,
  category: "flight",
  flight: {
    id: flight.id,
    flightNumber: flight.flightNumber,
    airline: flight.airline,
    departureCity: flight.departureCity,
    arrivalCity: flight.arrivalCity,
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
    departureDate: flight.departureDate,
    price: Number(flight.price || 0),
    class: flight.class || "Business Class",
    imageUrl: flight.imageUrl,
    seatsAvailable: Number(flight.seatsAvailable || 0)
  },
  services: {
    flight: `${flight.airline} ${flight.flightNumber} (${flight.departureCity} → ${flight.arrivalCity})`,
    hotel: "Excluded — flight only",
    car: "Excluded — flight only",
    insurance: "24/7 Travel Assistance & Full Refund Guarantee"
  }
});

export default function Flights() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { openCheckoutModal } = useBooking();
  const { flightRoutes, reachableCities } = useAvailable();
  const { displayPrice, selectedCurrency } = useCurrency();
  const { isDark } = useTheme();

  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("All");
  const [sortKey, setSortKey] = useState("recommended");
  const [selectedFlightForModal, setSelectedFlightForModal] = useState(null);

  const queryFrom = (searchParams.get("from") || "").toLowerCase().trim();
  const queryTo = (searchParams.get("to") || "").toLowerCase().trim();
  const queryDate = (searchParams.get("date") || "").trim();

  const appliedFrom = queryFrom || "";
  const appliedTo = queryTo || "";
  const appliedDate = queryDate || "";

  useEffect(() => {
    let active = true;
    setLoading(true);
    flightsApi
      .list()
      .then((data) => {
        if (!active) return;
        if (Array.isArray(data) && data.length > 0) {
          const enriched = data.map((f, i) => {
            const fallback = FALLBACK_LUXURY_FLIGHTS[i % FALLBACK_LUXURY_FLIGHTS.length];
            return {
              ...f,
              aircraft: f.aircraft || fallback.aircraft,
              duration: f.duration || fallback.duration,
              stops: f.stops || fallback.stops,
              baggage: f.baggage || fallback.baggage,
              meal: f.meal || fallback.meal,
              wifi: f.wifi || fallback.wifi,
              imageUrl: f.imageUrl || fallback.imageUrl,
              seatsAvailable: f.seatsAvailable ?? fallback.seatsAvailable
            };
          });
          setFlights(enriched);
        } else {
          setFlights(FALLBACK_LUXURY_FLIGHTS);
        }
      })
      .catch(() => {
        if (active) setFlights(FALLBACK_LUXURY_FLIGHTS);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredFlights = useMemo(() => {
    const timeToMinutes = (t) => {
      const m = String(t || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!m) return 24 * 60;
      let h = parseInt(m[1], 10) % 12;
      if (m[3].toUpperCase() === "PM") h += 12;
      return h * 60 + parseInt(m[2], 10);
    };
    const durationToMinutes = (d) => {
      const h = String(d || "").match(/(\d+)\s*h/);
      const min = String(d || "").match(/(\d+)\s*m/);
      return ((h ? +h[1] * 60 : 0) + (min ? +min[1] : 0)) || 9999;
    };

    const filtered = flights.filter((f) => {
      const q = search.toLowerCase();

      if (appliedFrom && !f.departureCity?.toLowerCase().includes(appliedFrom)) return false;
      if (appliedTo && !f.arrivalCity?.toLowerCase().includes(appliedTo)) return false;
      if (appliedDate && f.departureDate && f.departureDate.trim() !== "" && f.departureDate !== appliedDate) return false;

      if (selectedClass !== "All" && !f.class?.toLowerCase().includes(selectedClass.toLowerCase())) {
        return false;
      }

      return (
        !search.trim() ||
        f.airline?.toLowerCase().includes(q) ||
        f.flightNumber?.toLowerCase().includes(q) ||
        f.departureCity?.toLowerCase().includes(q) ||
        f.arrivalCity?.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "price-asc": return Number(a.price || 0) - Number(b.price || 0);
        case "price-desc": return Number(b.price || 0) - Number(a.price || 0);
        case "duration": return durationToMinutes(a.duration) - durationToMinutes(b.duration);
        case "departure": return timeToMinutes(a.departureTime) - timeToMinutes(b.departureTime);
        default: return 0;
      }
    });
  }, [flights, search, appliedFrom, appliedTo, appliedDate, selectedClass, sortKey]);

  const routeHasNoFlight =
    (appliedFrom || appliedTo || search) && filteredFlights.length === 0;

  const popularRoutes = [
    { from: "Manila", to: "Tokyo", codeFrom: "MNL", codeTo: "HND" },
    { from: "Manila", to: "Boracay", codeFrom: "MNL", codeTo: "MPH" },
    { from: "Manila", to: "El Nido", codeFrom: "MNL", codeTo: "ENI" },
    { from: "Cebu", to: "Singapore", codeFrom: "CEB", codeTo: "SIN" },
    { from: "Manila", to: "Paris", codeFrom: "MNL", codeTo: "CDG" },
  ];

  const clearAllFilters = () => {
    setSearch("");
    setSelectedClass("All");
    navigate("/flights");
  };

  return (
    <div className="w-full bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-300 pb-20">
      
      {/* ─── Executive Aviation Command Hero ─────────────────────────── */}
      <section className="relative pt-20 pb-14 px-4 sm:px-6 lg:px-8 overflow-hidden bg-white dark:bg-[#0a0f1d] border-b border-slate-200/80 dark:border-white/[0.06]">
        {/* Ambient SkyBlue Light Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[360px] bg-gradient-to-b from-[#008fe5]/[0.08] via-sky-500/[0.03] to-transparent blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-[#008fe5]/10 text-[#008fe5] dark:text-[#38bdf8] border border-[#008fe5]/20 backdrop-blur-md">
            <Plane size={14} className="text-[#008fe5] dark:text-[#38bdf8]" />
            <span>Premium Air Travel</span>
          </div>

          <h1 className="font-heading text-4xl sm:text-6xl font-bold text-slate-950 dark:text-white tracking-tight leading-[1.1]">
            Fly Further, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#008fe5] via-sky-400 to-blue-600">Effortlessly</span>.
          </h1>

          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm max-w-2xl mx-auto font-normal leading-relaxed">
            Compare fares from trusted airlines across Southeast Asia and beyond — every ticket backed by 100% instant refund protection.
          </p>

          {/* Aviation Search Command Dock */}
          <div className="pt-4 max-w-3xl mx-auto">
            <div className="p-3 rounded-3xl bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/[0.08] shadow-lg flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by airline (e.g. Philippine Airlines), flight number, or city..."
                  className="w-full bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white pl-10 pr-8 py-3 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] focus:border-[#008fe5] focus:outline-none transition-all placeholder:text-slate-400 text-xs font-semibold"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Cabin Class Filter */}
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full sm:w-48 bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 py-3 px-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] focus:border-[#008fe5] focus:outline-none cursor-pointer text-xs font-semibold"
              >
                <option value="All">All Cabin Classes</option>
                <option value="Business">Business Class</option>
                <option value="First">First Class</option>
                <option value="Executive">Premium Executive</option>
                <option value="Economy">Economy</option>
              </select>
            </div>

            {/* Popular Route Quick Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Popular Routes:
              </span>
              {popularRoutes.map((r, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set("from", r.from);
                    params.set("to", r.to);
                    navigate(`/flights?${params.toString()}`);
                  }}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-white dark:bg-white/[0.04] hover:bg-[#008fe5]/10 hover:text-[#008fe5] dark:hover:text-[#38bdf8] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08] transition flex items-center gap-1.5 shadow-sm"
                >
                  <span className="font-bold">{r.from}</span>
                  <span className="text-slate-400">({r.codeFrom})</span>
                  <span className="text-[#008fe5]">➔</span>
                  <span className="font-bold">{r.to}</span>
                  <span className="text-slate-400">({r.codeTo})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Flights Boarding Matrix Section ──────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 pb-4 border-b border-slate-200/80 dark:border-white/[0.06] gap-3">
          <div>
            <span className="text-[11px] font-mono tracking-widest uppercase text-[#008fe5] dark:text-[#38bdf8] block font-bold">
              Available Departures
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
              {filteredFlights.length} {filteredFlights.length === 1 ? "flight" : "flights"} found
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {(appliedFrom || appliedTo || appliedDate || search || selectedClass !== "All") && (
              <button
                onClick={clearAllFilters}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#008fe5] dark:text-[#38bdf8] bg-[#008fe5]/10 hover:bg-[#008fe5]/20 border border-[#008fe5]/25 transition flex items-center gap-1.5"
              >
                <RotateCcw size={13} /> Reset Filters
              </button>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Fares in {selectedCurrency}
            </span>
          </div>
        </div>

        {/* Sort Bar — Trip.com style quick sort tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-7">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
            Sort by
          </span>
          {[
            { id: "recommended", label: "Best" },
            { id: "price-asc", label: "Cheapest" },
            { id: "duration", label: "Fastest" },
            { id: "departure", label: "Earliest Departure" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSortKey(id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                sortKey === id
                  ? "bg-[#008fe5] border-[#008fe5] text-white shadow-md shadow-blue-500/25"
                  : "bg-white dark:bg-white/[0.04] border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:border-[#008fe5]/50 hover:text-[#008fe5] dark:hover:text-[#38bdf8]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ─── Empty State With Prominent Aviation Image (User Requirement) ─── */}
        {filteredFlights.length === 0 ? (
          <div className="max-w-2xl mx-auto my-6 bg-white dark:bg-[#0a0f1d] rounded-3xl overflow-hidden border border-slate-200/90 dark:border-white/[0.08] shadow-xl text-center">
            {/* High-Resolution Luxury Aviation Image */}
            <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-slate-900">
              <img
                src="https://images.unsplash.com/photo-1558389186-4386d1bea007?auto=format&fit=crop&w=1200&q=80"
                alt="Airport departure terminal at dusk"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white text-[11px] font-mono uppercase tracking-widest px-3 py-1 rounded-full border border-white/20">
                Route Exploration
              </div>

              <div className="absolute bottom-5 left-6 right-6 text-white text-center">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#38bdf8] uppercase tracking-wider mb-1">
                  <Plane size={14} /> Scheduled Flights Status
                </span>
                <h3 className="text-2xl sm:text-3xl font-heading font-bold drop-shadow">
                  No Available Flights on this Route
                </h3>
              </div>
            </div>

            {/* Explanation & Action */}
            <div className="p-8 space-y-5">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                We currently don't have active departures matching your exact search parameters (
                <span className="font-semibold text-slate-900 dark:text-white">
                  {appliedFrom || "Any Origin"} ➔ {appliedTo || "Any Destination"}
                </span>
                ). Our commercial and charter network is operating regular flights on the routes below.
              </p>

              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {popularRoutes.map((r, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const params = new URLSearchParams();
                      params.set("from", r.from);
                      params.set("to", r.to);
                      navigate(`/flights?${params.toString()}`);
                    }}
                    className="px-4 py-2 rounded-2xl bg-sky-50 dark:bg-white/[0.04] hover:bg-[#008fe5] hover:text-white text-[#008fe5] dark:text-[#38bdf8] border border-[#008fe5]/20 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <span>{r.from}</span>
                    <span>➔</span>
                    <span>{r.to}</span>
                  </button>
                ))}
              </div>

              <div className="pt-3">
                <button
                  onClick={clearAllFilters}
                  className="px-6 py-3 rounded-2xl bg-[#008fe5] hover:bg-[#007bc4] text-white text-xs font-bold uppercase tracking-wider transition shadow-md shadow-blue-500/25"
                >
                  View All Available Flights
                </button>
              </div>
            </div>
          </div>

        ) : (

          /* ─── Executive Boarding Ticket Matrix with Flight Photo ─── */
          <div className="space-y-6">
            {filteredFlights.map((flight) => {
              const codeOrigin = getCode(flight.departureCity);
              const codeDest = getCode(flight.arrivalCity);

              return (
                <div
                  key={flight.id}
                  className="bg-white dark:bg-[#0a0f1d] rounded-3xl overflow-hidden border border-slate-200/80 dark:border-white/[0.08] hover:border-[#008fe5]/50 dark:hover:border-[#008fe5]/50 shadow-sm hover:shadow-xl transition-all duration-300 group"
                >
                  <div className="flex flex-col lg:flex-row">
                    
                    {/* 1. Left: Flight / Aircraft Photo Frame */}
                    <div className="w-full lg:w-64 xl:w-72 h-48 lg:h-auto shrink-0 relative overflow-hidden bg-slate-900">
                      <img
                        src={flight.imageUrl || "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80"}
                        alt={`${flight.airline} ${flight.flightNumber}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
                      
                      <span className="absolute top-3 left-3 bg-[#008fe5] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                        {flight.class || "Business Class"}
                      </span>

                      <div className="absolute top-3 right-3">
                        <FavoriteButton type="flight" item={flight} />
                      </div>

                      <div className="absolute bottom-2.5 left-3 right-3 text-white">
                        <p className="text-[11px] font-bold truncate drop-shadow">{flight.airline}</p>
                        <p className="text-[10px] font-mono text-slate-300">
                          {flight.aircraft || "Airbus A350-900"}
                        </p>
                      </div>
                    </div>

                    {/* 2. Center: Journey Schedule & In-Flight Privileges */}
                    <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between gap-4">
                      
                      {/* Ticket Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#008fe5]/10 text-[#008fe5] dark:text-[#38bdf8] flex items-center justify-center font-bold">
                            <Plane size={16} />
                          </div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-heading font-bold text-base text-slate-950 dark:text-white">
                              {flight.airline}
                            </h4>
                            <span className="text-xs font-mono font-bold text-[#008fe5] dark:text-[#38bdf8] bg-[#008fe5]/10 px-2 py-0.5 rounded-md">
                              {flight.flightNumber}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase">
                          {flight.stops || "Non-Stop Direct"}
                        </span>
                      </div>

                      {/* Flight Trajectory Schedule Visualizer */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-3 py-1">
                        
                        {/* Origin Station */}
                        <div className="sm:col-span-4 space-y-0.5 text-left">
                          <span className="text-2xl sm:text-3xl font-black font-heading text-slate-950 dark:text-white tracking-tight">
                            {flight.departureTime || "08:45 AM"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                              {flight.departureCity}
                            </span>
                            <span className="text-xs font-mono font-black text-[#008fe5] bg-[#008fe5]/10 px-1.5 py-0.2 rounded">
                              {codeOrigin}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {flight.departureDate || "Daily Flight"} · Terminal 1
                          </span>
                        </div>

                        {/* Mid Trajectory Line with Flying Plane */}
                        <div className="sm:col-span-4 flex flex-col items-center justify-center py-2 sm:py-0">
                          <span className="text-[10px] font-mono text-slate-400 mb-0.5">
                            {flight.duration || "4h 15m"}
                          </span>
                          
                          <div className="w-full relative flex items-center justify-center">
                            <div className="w-full h-[2px] bg-slate-200 dark:bg-white/10 relative">
                              <div className="absolute inset-0 bg-[#008fe5] opacity-60" />
                            </div>
                            <div className="absolute w-6 h-6 rounded-full bg-white dark:bg-[#0f172a] border border-[#008fe5] text-[#008fe5] flex items-center justify-center shadow-sm">
                              <Plane size={11} className="rotate-90" />
                            </div>
                          </div>

                          <span className="text-[10px] font-medium text-slate-400 mt-1">
                            Confirmed Flight
                          </span>
                        </div>

                        {/* Destination Station */}
                        <div className="sm:col-span-4 space-y-0.5 sm:text-right">
                          <span className="text-2xl sm:text-3xl font-black font-heading text-slate-950 dark:text-white tracking-tight">
                            {flight.arrivalTime || "02:10 PM"}
                          </span>
                          <div className="flex items-center sm:justify-end gap-1.5">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                              {flight.arrivalCity}
                            </span>
                            <span className="text-xs font-mono font-black text-[#008fe5] bg-[#008fe5]/10 px-1.5 py-0.2 rounded">
                              {codeDest}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Arrives Same Day · Terminal VIP
                          </span>
                        </div>

                      </div>

                      {/* In-Flight Privileges Bar */}
                      <div className="flex flex-wrap items-center gap-3 text-xs pt-2 border-t border-slate-100 dark:border-white/[0.06] text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Luggage size={13} className="text-[#008fe5]" />
                          <span>{flight.baggage || "35kg Checked + 7kg Cabin"}</span>
                        </div>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <div className="flex items-center gap-1.5">
                          <Utensils size={13} className="text-[#008fe5]" />
                          <span>{flight.meal || "Gourmet Dining Included"}</span>
                        </div>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <div className="flex items-center gap-1.5">
                          <Wifi size={13} className="text-[#008fe5]" />
                          <span>{flight.wifi || "High-Speed WiFi"}</span>
                        </div>
                      </div>

                    </div>

                    {/* 3. Right: Boarding Pass Tear-Off Stub */}
                    <div className="w-full lg:w-60 xl:w-64 p-5 sm:p-6 bg-slate-50/70 dark:bg-white/[0.02] border-t lg:border-t-0 lg:border-l border-dashed border-slate-200 dark:border-white/[0.08] flex flex-col justify-between gap-3 relative shrink-0">
                      
                      {/* Ticket Notches */}
                      <div className="hidden lg:block absolute -left-3 top-[-10px] w-5 h-5 rounded-full bg-slate-50 dark:bg-[#070b13] border border-slate-200/80 dark:border-white/[0.08]" />
                      <div className="hidden lg:block absolute -left-3 bottom-[-10px] w-5 h-5 rounded-full bg-slate-50 dark:bg-[#070b13] border border-slate-200/80 dark:border-white/[0.08]" />

                      <div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
                          <span>Pass Fare</span>
                          <span
                            className={`font-bold ${
                              (flight.seatsAvailable ?? 4) <= 3
                                ? "text-badge-red dark:text-rose-400"
                                : (flight.seatsAvailable ?? 4) <= 6
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {flight.seatsAvailable ?? 4} Seats Left
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl sm:text-3xl font-bold font-heading text-slate-950 dark:text-white">
                            {displayPrice(Number(flight.price || 0))}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">/ pax</span>
                        </div>

                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          Taxes &amp; baggage included
                        </p>
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={() => openCheckoutModal(toFlightBooking(flight))}
                          className="w-full py-3 rounded-2xl bg-[#008fe5] hover:bg-[#007bc4] text-white text-xs font-bold tracking-wider uppercase transition-all shadow-md shadow-blue-500/25 hover:-translate-y-0.5 flex items-center justify-center gap-1.5"
                        >
                          <Plane size={14} /> Book Now
                        </button>

                        <button
                          onClick={() => navigate(`/flights/${flight.id}`)}
                          className="w-full py-2 rounded-2xl bg-white dark:bg-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200/80 dark:border-white/[0.08] transition flex items-center justify-center gap-1"
                        >
                          <Eye size={12} /> View Details
                        </button>
                      </div>

                      <div className="text-center pt-1 border-t border-slate-200/60 dark:border-white/[0.05]">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                          <ShieldCheck size={12} className="text-emerald-500" />
                          <span>100% Instant Refund Protection</span>
                        </span>
                      </div>

                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        )}

      </section>

      {/* Flight Fare Tier Modal for deep fare selection */}
      {selectedFlightForModal && (
        <FlightFareTierModal
          flight={selectedFlightForModal}
          isOpen={Boolean(selectedFlightForModal)}
          onClose={() => setSelectedFlightForModal(null)}
          onSelectTier={(flightWithTier) => {
            openCheckoutModal(flightWithTier);
            setSelectedFlightForModal(null);
          }}
        />
      )}

    </div>
  );
}
