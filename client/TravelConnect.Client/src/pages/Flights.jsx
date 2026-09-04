import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plane, ArrowRight, Star, MapPin, Clock, Calendar, Eye, Wifi, Luggage, AlertTriangle
} from "lucide-react";
import { useBooking } from "../context/BookingContext";
import { useCurrency } from "../context/CurrencyContext";
import { useAvailable } from "../context/AvailableContext";
import PageHeroCarousel from "../components/shared/PageHeroCarousel";
import FavoriteButton from "../components/shared/FavoriteButton";
import FlightFareTierModal from "../components/modals/booking/FlightFareTierModal";
import { flightsApi } from "../services/api";

const FLIGHT_HERO_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1920&q=80",
    alt: "Commercial airliner in the sky",
  },
  {
    image: "https://images.unsplash.com/photo-1540339832862-474599807a5e?auto=format&fit=crop&w=1920&q=80",
    alt: "Airplane wing above the clouds",
  },
  {
    image: "https://images.unsplash.com/photo-1558389186-4386d1bea007?auto=format&fit=crop&w=1920&q=80",
    alt: "Airport terminal at dusk",
  },
];

const toFlightBooking = (flight) => ({
  id: `FLIGHT-${flight.id}`,
  name: `${flight.airline} ${flight.flightNumber} • ${flight.departureCity} → ${flight.arrivalCity}`,
  location: `${flight.departureCity} → ${flight.arrivalCity}`,
  price: Number(flight.price || 0),
  duration: "1 Flight",
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
    class: flight.class || "Economy",
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
  const [flights, setFlights] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedFlightForModal, setSelectedFlightForModal] = useState(null);

  const queryFrom = (searchParams.get("from") || "").toLowerCase().trim();
  const queryTo = (searchParams.get("to") || "").toLowerCase().trim();
  const queryDate = (searchParams.get("date") || "").trim();

  const appliedFrom = queryFrom || "";
  const appliedTo = queryTo || "";
  const appliedDate = queryDate || "";

  useEffect(() => {
    let active = true;
    flightsApi
      .list()
      .then((data) => { if (active) setFlights(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setFlights([]); });
    return () => { active = false; };
  }, []);

  const filteredFlights = useMemo(() => {
    return flights.filter((f) => {
      const q = search.toLowerCase();

      if (appliedFrom && !f.departureCity?.toLowerCase().includes(appliedFrom)) return false;
      if (appliedTo && !f.arrivalCity?.toLowerCase().includes(appliedTo)) return false;
      // Date is a soft preference: only exclude when a flight actually carries a date
      // that explicitly does not match. Flights with a flexible/empty date are kept.
      if (appliedDate && f.departureDate && f.departureDate.trim() !== "" && f.departureDate !== appliedDate) return false;

      return (
        !search.trim() ||
        f.airline?.toLowerCase().includes(q) ||
        f.flightNumber?.toLowerCase().includes(q) ||
        f.departureCity?.toLowerCase().includes(q) ||
        f.arrivalCity?.toLowerCase().includes(q)
      );
    });
  }, [flights, search, appliedFrom, appliedTo, appliedDate]);

  // Did the user search for a route that simply isn't served?
  const routeHasNoFlight =
    (appliedFrom || appliedTo) && filteredFlights.length === 0 && flights.length > 0;

  // Available origin → destination route chips.
  const routeChips = useMemo(() => {
    return flightRoutes.slice(0, 8).map((r) => `${r.from.city} → ${r.to.city}`);
  }, [flightRoutes]);

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-16">
      <PageHeroCarousel slides={FLIGHT_HERO_SLIDES} className="py-16 px-4 pb-20">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
            <Plane size={14} className="text-amber-400" /> FLIGHTS &amp; AIRFARE
          </span>
          <h1 className="text-4xl sm:text-5xl font-black drop-shadow-md">Book Your Perfect Flight</h1>
          <p className="text-slate-200 text-sm max-w-xl mx-auto drop-shadow">
            Compare airlines, routes, and fares with instant electronic boarding passes and flexible booking.
          </p>

          <div className="max-w-2xl mx-auto bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 flex items-center gap-2 text-xs text-white">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by airline, flight number, or city..."
              className="bg-white text-slate-900 rounded-xl px-4 py-2.5 text-xs font-bold outline-none flex-1 focus:ring-2 focus:ring-[#008fe5]"
            />
          </div>
        </div>
      </PageHeroCarousel>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Available Flights</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredFlights.length} flights in {selectedCurrency} ({displayPrice(1).replace(/\s?\d.*/, "").trim()})
            </p>
          </div>
        </div>

        {/* Available route quick chips */}
        {routeChips.length > 0 && !(appliedFrom || appliedTo) && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs font-bold text-slate-500">Popular routes:</span>
            {routeChips.map((route) => (
              <button
                key={route}
                onClick={() => {
                  const [from, to] = route.split(" → ");
                  const params = new URLSearchParams();
                  params.set("from", from);
                  params.set("to", to);
                  navigate(`/flights?${params.toString()}`);
                }}
                className="text-xs font-bold text-[#008fe5] bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1 rounded-full transition"
              >
                {route}
              </button>
            ))}
          </div>
        )}

        {(appliedFrom || appliedTo || appliedDate) && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs font-bold text-slate-500">Active search:</span>
            {appliedFrom && (
              <span className="bg-[#008fe5]/10 text-[#008fe5] text-xs font-bold px-3 py-1 rounded-full border border-[#008fe5]/20">
                From: {appliedFrom}
              </span>
            )}
            {appliedTo && (
              <span className="bg-[#008fe5]/10 text-[#008fe5] text-xs font-bold px-3 py-1 rounded-full border border-[#008fe5]/20">
                To: {appliedTo}
              </span>
            )}
            {appliedDate && (
              <span className="bg-[#008fe5]/10 text-[#008fe5] text-xs font-bold px-3 py-1 rounded-full border border-[#008fe5]/20">
                Date: {appliedDate}
              </span>
            )}
            <button
              onClick={() => navigate("/flights")}
              className="text-xs font-bold text-slate-500 underline hover:text-[#008fe5]"
            >
              Clear
            </button>
          </div>
        )}

        {filteredFlights.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-lg font-medium">
            {routeHasNoFlight ? (
              <div className="max-w-xl mx-auto space-y-4">
                <AlertTriangle size={40} className="mx-auto text-amber-500" />
                <p className="text-slate-600 font-semibold">
                  No available flights on this route yet.
                </p>
                <p className="text-sm text-slate-400">
                  Our flight network is focused on the routes below. Choose one to see real fares.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {reachableCities.map((c) => (
                    <button
                      key={c.code || c.city}
                      onClick={() => navigate(`/flights?to=${encodeURIComponent(c.city)}`)}
                      className="text-xs font-bold text-[#008fe5] bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-full transition"
                    >
                      {c.city} ({c.code})
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              "No flights available yet."
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {filteredFlights.map((flight) => (
              <div
                key={flight.id}
                onClick={() => navigate(`/flights/${flight.id}`)}
                className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group"
              >
                <div className="flex flex-col lg:flex-row">
                  {/* Image */}
                  <div className="relative lg:w-64 h-44 lg:h-auto overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={flight.imageUrl || "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80"}
                      alt={`${flight.airline} ${flight.flightNumber}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-3 left-3 bg-[#008fe5] text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                      {flight.class || "Economy"}
                    </span>
                    <FavoriteButton
                      type="flight"
                      item={flight}
                      className="absolute top-3 right-3"
                    />
                  </div>

                  {/* Route + info */}
                  <div className="flex-1 p-5 lg:p-6">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-lg leading-tight flex items-center gap-2">
                          {flight.airline}
                          <span className="text-xs font-bold text-slate-400">({flight.flightNumber})</span>
                        </h3>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                          <Calendar size={13} className="text-[#008fe5]" />
                          {flight.departureDate || "Flexible"}
                        </p>
                      </div>
                      {Number(flight.seatsAvailable) > 0 ? (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-full">
                          {flight.seatsAvailable} seats left
                        </span>
                      ) : (
                        <span className="bg-rose-50 text-rose-600 text-[10px] font-black px-2.5 py-1 rounded-full">
                          Sold out
                        </span>
                      )}
                    </div>

                    {/* Route diagram */}
                    <div className="flex items-center gap-3 mt-4">
                      <div className="text-center">
                        <div className="text-lg font-black text-slate-900">{flight.departureTime}</div>
                        <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                          <MapPin size={11} className="text-[#008fe5]" /> {flight.departureCity}
                        </div>
                      </div>

                      <div className="flex-1 px-3">
                        <div className="relative flex items-center justify-center">
                          <div className="flex-1 border-t-2 border-dashed border-slate-300" />
                          <Plane size={18} className="text-[#008fe5] mx-2 rotate-90 shrink-0" />
                          <div className="flex-1 border-t-2 border-dashed border-slate-300" />
                        </div>
                        <div className="text-center text-[10px] text-slate-400 font-semibold mt-1">Direct</div>
                      </div>

                      <div className="text-center">
                        <div className="text-lg font-black text-slate-900">{flight.arrivalTime}</div>
                        <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                          <MapPin size={11} className="text-[#008fe5]" /> {flight.arrivalCity}
                        </div>
                      </div>
                    </div>

                    {/* Key perks */}
                    <div className="flex flex-wrap items-center gap-3 mt-4 text-[11px] text-slate-500 font-semibold">
                      <span className="flex items-center gap-1"><Star size={12} className="text-amber-500 fill-amber-500" /> Premium {flight.class}</span>
                      <span className="flex items-center gap-1"><Clock size={12} className="text-[#008fe5]" /> Direct flight</span>
                      <span className="flex items-center gap-1"><Wifi size={12} className="text-[#008fe5]" /> In-flight WiFi</span>
                      <span className="flex items-center gap-1"><Luggage size={12} className="text-[#008fe5]" /> 20kg baggage</span>
                    </div>
                  </div>

                  {/* Price + CTA */}
                  <div className="lg:w-60 p-5 border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 bg-slate-50/50">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Per traveler</div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">{displayPrice(Number(flight.price || 0))}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] font-extrabold text-emerald-700">
                        <span>Accepts:</span>
                        <span className="bg-blue-100/70 text-blue-700 px-1.5 py-0.5 rounded">GCash</span>
                        <span className="bg-emerald-100/70 text-emerald-700 px-1.5 py-0.5 rounded">Maya</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/flights/${flight.id}`); }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-3 py-2.5 rounded-xl text-xs transition flex items-center gap-1"
                      >
                        <Eye size={14} /> Details
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFlightForModal(flight);
                        }}
                        className="bg-[#008fe5] hover:bg-blue-600 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-md text-xs hover:-translate-y-0.5 transition flex items-center gap-1"
                      >
                        Select Fares <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Flight Fare Tier Comparison Modal */}
      <FlightFareTierModal
        isOpen={Boolean(selectedFlightForModal)}
        flight={selectedFlightForModal}
        onClose={() => setSelectedFlightForModal(null)}
      />
    </div>
  );
}
