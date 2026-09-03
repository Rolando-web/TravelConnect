import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Plane, MapPin, ArrowLeft, CheckCircle2, ShieldCheck, Sparkles,
  Clock, Calendar, Users, Star, Luggage, Wifi, Utensils, Armchair, Ban
} from "lucide-react";
import { flightsApi } from "../services/api";
import { useBooking } from "../context/BookingContext";
import FavoriteButton from "../components/shared/FavoriteButton";

const toBooking = (flight) => ({
  id: `FLIGHT-${flight.id}`,
  name: `${flight.airline} ${flight.flightNumber} • ${flight.departureCity} → ${flight.arrivalCity}`,
  location: `${flight.departureCity} → ${flight.arrivalCity}`,
  price: Number(flight.price || 0),
  duration: "1 Flight",
  img: flight.imageUrl,
  category: "package",
  services: {
    flight: `${flight.airline} ${flight.flightNumber} (${flight.departureCity} → ${flight.arrivalCity})`,
    hotel: "Excluded — flight only",
    car: "Excluded — flight only",
    insurance: "24/7 Travel Assistance & Full Refund Guarantee"
  }
});

const fareRules = [
  { icon: Luggage, label: "Baggage Allowance", value: "20kg checked + 7kg carry-on included" },
  { icon: Ban, label: "Cancellation", value: "Free cancellation up to 24h before departure" },
  { icon: Wifi, label: "In-Flight WiFi", value: "Complimentary internet on all premium classes" },
  { icon: Utensils, label: "Meals & Snacks", value: "Hot meal + beverages served on long-haul routes" },
  { icon: Armchair, label: "Seat Selection", value: "Complimentary seat selection at booking" },
];

export default function FlightDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openCheckoutModal } = useBooking();
  const [flight, setFlight] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    flightsApi
      .get(id)
      .then((data) => { if (active) setFlight(data); })
      .catch(() => { if (active) setFlight(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-slate-600 font-semibold">Loading flight...</p>
      </div>
    );
  }

  if (!flight) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-slate-600 font-semibold">Flight not found.</p>
        <Link to="/flights" className="text-[#008fe5] font-bold hover:underline">Back to Flights</Link>
      </div>
    );
  }

  const daily = Number(flight.price || 0);

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-16">
      {/* Breadcrumb */}
      <div className="relative z-20 bg-slate-900/90 backdrop-blur text-white py-4 px-4 sm:px-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/flights")}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <ArrowLeft size={16} /> Back to Flights
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link to="/" className="hover:underline">Home</Link> /
            <Link to="/flights" className="hover:underline">Flights</Link> /
            <span className="text-slate-200 font-bold truncate max-w-[150px] sm:max-w-none">{flight.flightNumber}</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="relative text-white overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={flight.imageUrl || "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1600&q=80"}
            alt={`${flight.airline} ${flight.flightNumber}`}
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/75 via-slate-900/55 to-slate-900/85" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-extrabold text-white px-3 py-1 rounded-full uppercase tracking-wider bg-[#008fe5]">
                  {flight.class || "Economy"}
                </span>
                <span className="bg-white/10 border border-white/20 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Plane size={14} className="text-amber-400" /> Direct Flight
                </span>
                {Number(flight.seatsAvailable) > 0 && (
                  <span className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full">
                    {flight.seatsAvailable} seats left
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight drop-shadow-md">
                {flight.airline} {flight.flightNumber}
              </h1>

              <div className="flex items-center gap-3">
                <FavoriteButton type="flight" item={flight} className="w-11 h-11" />
                <span className="text-xs text-slate-300 font-medium">
                  Save this flight to your favorites
                </span>
              </div>

              {/* Route */}
              <div className="flex items-center gap-4 sm:gap-8 pt-2">
                <div>
                  <div className="text-2xl sm:text-3xl font-black">{flight.departureTime}</div>
                  <div className="text-xs text-slate-300 flex items-center gap-1">
                    <MapPin size={12} className="text-[#008fe5]" /> {flight.departureCity}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-300 text-xs">
                  <div className="flex-1 border-t-2 border-dashed border-slate-400 w-16 sm:w-24" />
                  <Plane size={18} className="text-amber-400 rotate-90" />
                  <div className="flex-1 border-t-2 border-dashed border-slate-400 w-16 sm:w-24" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black">{flight.arrivalTime}</div>
                  <div className="text-xs text-slate-300 flex items-center gap-1">
                    <MapPin size={12} className="text-[#008fe5]" /> {flight.arrivalCity}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-200 font-medium pt-1">
                <span className="flex items-center gap-1"><Calendar size={14} className="text-[#008fe5]" /> {flight.departureDate || "Flexible date"}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Star size={14} className="text-amber-400 fill-amber-400" /> Premium {flight.class}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Clock size={14} className="text-[#008fe5]" /> Non-stop</span>
              </div>
            </div>

            {/* Pricing card */}
            <div className="bg-white text-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Fare Price</span>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">Per Traveler</span>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">₱{daily.toLocaleString()}</span>
                  <span className="text-xs text-slate-500 font-semibold">/ traveler</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Taxes &amp; fees included in fare</p>
              </div>

              <button
                onClick={() => openCheckoutModal(toBooking(flight))}
                className="w-full bg-gradient-to-r from-[#008fe5] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-extrabold py-4 rounded-2xl shadow-xl shadow-blue-500/25 hover:-translate-y-0.5 transition text-sm flex items-center justify-center gap-2"
              >
                <span>Book This Flight</span>
                <Sparkles size={16} />
              </button>

              <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1"><ShieldCheck size={13} className="text-emerald-500" /> Instant Confirmation</span>
                <span>•</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={13} className="text-blue-500" /> Free Cancellation</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="relative rounded-3xl overflow-hidden shadow-lg h-72 sm:h-96 bg-slate-100">
              <img
                src={flight.imageUrl || "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1600&q=80"}
                alt={`${flight.airline} ${flight.flightNumber}`}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Trip snapshot */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
              <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2 mb-5">
                <Clock size={24} className="text-[#008fe5]" /> Trip Snapshot
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Flight Number</p>
                  <p className="text-sm font-extrabold text-slate-900 mt-1">{flight.flightNumber}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Cabin Class</p>
                  <p className="text-sm font-extrabold text-slate-900 mt-1">{flight.class}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Travel Date</p>
                  <p className="text-sm font-extrabold text-slate-900 mt-1">{flight.departureDate || "Flexible"}</p>
                </div>
              </div>
            </div>

            {/* What's included */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-5">
              <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={24} className="text-[#008fe5]" /> What's Included in Your Fare
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fareRules.map((rule, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-slate-700 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <rule.icon size={18} className="text-[#008fe5] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-slate-900">{rule.label}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{rule.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Booking info */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
              <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2 mb-4">
                <Users size={24} className="text-[#008fe5]" /> Good to Know
              </h2>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Electronic boarding pass issued instantly after payment — no need to print.</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Free cancellation and full refund within 24 hours before departure.</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Check in at the airline counter with your booking reference and valid ID.</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Seat selection and meal preferences can be added at check-in.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200/80 sticky top-24 space-y-5">
              <h3 className="text-lg font-extrabold text-slate-900 pb-3 border-b border-slate-100">
                Reserve This Flight
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">{flight.airline} {flight.flightNumber}</span>
                  <span className="font-bold text-slate-800">{flight.departureCity} → {flight.arrivalCity}</span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-black text-slate-900 text-sm">Total per traveler</span>
                  <span className="font-black text-[#008fe5] text-2xl">₱{daily.toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={() => openCheckoutModal(toBooking(flight))}
                className="w-full bg-[#008fe5] hover:bg-blue-600 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 transition text-sm"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
