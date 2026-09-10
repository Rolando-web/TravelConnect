import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Plane, MapPin, ArrowLeft, CheckCircle2, ShieldCheck, Award, ArrowRight,
  Clock, Calendar, Users, Star, Luggage, Wifi, Utensils, Armchair, Ban,
  Check, CreditCard, ChevronDown, ChevronUp, Tag, Info, Building2, Car, Gift
} from "lucide-react";
import { flightsApi } from "../services/api";
import { useBooking } from "../context/BookingContext";
import { useCurrency } from "../context/CurrencyContext";
import FavoriteButton from "../components/shared/FavoriteButton";
import { FALLBACK_LUXURY_FLIGHTS } from "../data/fallbackFlights";

export default function FlightDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openCheckoutModal } = useBooking();
  const { displayPrice } = useCurrency();
  const [flight, setFlight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTierId, setSelectedTierId] = useState("standard");
  const [expandedPaymentTier, setExpandedPaymentTier] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    flightsApi
      .get(id)
      .then((data) => { if (active) setFlight(data); })
      .catch(() => {
        // Production fallback: the API may be unreachable (no VITE_API_URL).
        // Try to resolve the flight from the offline fallback catalogue so
        // flight details still render instead of showing "Flight not found".
        if (!active) return;
        const fallback = FALLBACK_LUXURY_FLIGHTS.find(
          (f) => String(f.id) === String(id)
        );
        setFlight(fallback || null);
      })
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

  const basePrice = Number(flight.price || 0);

  // 3 distinct fare tiers modeled after Trip.com
  const fareTiers = [
    {
      id: "standard",
      name: "Economy Standard",
      recommended: true,
      price: basePrice,
      originalPrice: Math.round(basePrice * 1.08),
      cabinClass: flight.class || "Economy",
      baggage: {
        carryOn: "1 piece (7 kg)",
        checked: "25 kg checked baggage"
      },
      flexibility: {
        refundable: false,
        refundNote: "Non-refundable (partial segments)",
        changeFee: `From ${displayPrice(Math.round(basePrice * 0.35))}`
      },
      benefits: [
        "Complimentary hot meals & beverages",
        "Airline miles: at least 2,702 pts",
        "Standard seat selection at check-in"
      ],
      paymentMethods: ["GCash", "Maya", "Credit / Debit Card", "GrabPay"]
    },
    {
      id: "flex",
      name: "Economy Flex",
      recommended: false,
      price: Math.round(basePrice * 1.14),
      originalPrice: Math.round(basePrice * 1.25),
      cabinClass: flight.class || "Economy",
      baggage: {
        carryOn: "1 piece (7 kg)",
        checked: "25 kg checked baggage"
      },
      flexibility: {
        refundable: true,
        refundNote: "Refundable with cancellation fee",
        changeFee: `From ${displayPrice(Math.round(basePrice * 0.18))}`
      },
      benefits: [
        "Priority check-in & boarding",
        "Complimentary gourmet meal & drinks",
        "Airline miles: at least 3,250 pts",
        "Free seat selection in standard zones"
      ],
      paymentMethods: ["GCash", "Maya", "Credit / Debit Card", "GrabPay"]
    },
    {
      id: "superflex",
      name: "Economy Premium Flex",
      recommended: false,
      price: Math.round(basePrice * 1.28),
      originalPrice: Math.round(basePrice * 1.42),
      cabinClass: flight.class || "Economy",
      baggage: {
        carryOn: "2 pieces (14 kg total)",
        checked: "35 kg checked baggage (2 bags)"
      },
      flexibility: {
        refundable: true,
        refundNote: "100% Refundable up to 24h before flight",
        changeFee: "Free date & flight changes"
      },
      benefits: [
        "Free cancellation & instant refund",
        "Extra legroom seat included",
        "Full meal + premium beverage selection",
        "Double airline miles (5,400+ pts)"
      ],
      paymentMethods: ["GCash", "Maya", "Credit / Debit Card", "GrabPay"]
    }
  ];

  const activeTier = fareTiers.find((t) => t.id === selectedTierId) || fareTiers[0];

  const handleBookTier = (tier = activeTier) => {
    openCheckoutModal({
      id: `FLIGHT-${flight.id}-${tier.id}`,
      name: `${flight.airline} ${flight.flightNumber} (${tier.name}) • ${flight.departureCity} → ${flight.arrivalCity}`,
      location: `${flight.departureCity} → ${flight.arrivalCity}`,
      price: tier.price,
      duration: "1 Flight",
      img: flight.imageUrl,
      category: "flight",
      tier: tier.name,
      flight: {
        ...flight,
        price: tier.price,
        tierName: tier.name,
        baggageAllowance: tier.baggage.checked,
        carryOnAllowance: tier.baggage.carryOn,
        changePolicy: tier.flexibility.changeFee,
        refundPolicy: tier.flexibility.refundNote
      },
      services: {
        flight: `${flight.airline} ${flight.flightNumber} (${flight.departureCity} → ${flight.arrivalCity}) [${tier.name}]`,
        hotel: "Flyer Exclusive: Up to 25% off participating hotels",
        car: "10% off Airport transfers available",
        insurance: "24/7 Travel Assistance & Digital Boarding Pass"
      }
    });
  };

  const togglePaymentDropdown = (tierId) => {
    setExpandedPaymentTier((prev) => (prev === tierId ? null : tierId));
  };

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
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/65 to-slate-900/90" />
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

              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black leading-tight drop-shadow-md">
                {flight.departureCity} <span className="text-[#008fe5]">⇌</span> {flight.arrivalCity}
              </h1>

              <p className="text-slate-300 text-sm font-semibold flex items-center gap-2">
                <span className="text-white font-extrabold">{flight.airline}</span>
                <span>•</span>
                <span>Flight {flight.flightNumber}</span>
                <span>•</span>
                <span>Terminal 4 Departure</span>
              </p>

              <div className="flex items-center gap-3">
                <FavoriteButton type="flight" item={flight} className="w-11 h-11" />
                <span className="text-xs text-slate-300 font-medium">
                  Save this flight to your favorites
                </span>
              </div>

              {/* Route Timeline */}
              <div className="flex items-center gap-4 sm:gap-8 pt-2">
                <div>
                  <div className="font-heading text-2xl sm:text-3xl font-black">{flight.departureTime || "08:25 PM"}</div>
                  <div className="text-xs text-slate-300 flex items-center gap-1 font-semibold">
                    <MapPin size={12} className="text-[#008fe5]" /> {flight.departureCity}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-300 text-xs">
                  <div className="flex-1 border-t-2 border-dashed border-slate-400 w-16 sm:w-24" />
                  <Plane size={18} className="text-amber-400 rotate-90" />
                  <div className="flex-1 border-t-2 border-dashed border-slate-400 w-16 sm:w-24" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black">{flight.arrivalTime || "10:20 PM"}</div>
                  <div className="text-xs text-slate-300 flex items-center gap-1 font-semibold">
                    <MapPin size={12} className="text-[#008fe5]" /> {flight.arrivalCity}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-200 font-medium pt-1">
                <span className="flex items-center gap-1"><Calendar size={14} className="text-[#008fe5]" /> {flight.departureDate || "Flexible date"}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Star size={14} className="text-amber-400 fill-amber-400" /> Premium {flight.class || "Economy"}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Clock size={14} className="text-[#008fe5]" /> Non-stop</span>
              </div>
            </div>

            {/* Top Quick Pricing Card */}
            <div className="bg-white text-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Starting Fare</span>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">Best Value</span>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">{displayPrice(activeTier.price)}</span>
                  <span className="text-xs text-slate-500 font-semibold">/ adult</span>
                </div>
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                  ✓ Includes 25kg checked baggage &amp; meals
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span>Accepted Payment:</span>
                  <span className="text-emerald-700">GCash • Maya • Cards</span>
                </div>
                <p className="text-[11px] text-slate-400">Instant digital voucher &amp; boarding pass</p>
              </div>

              <button
                onClick={() => handleBookTier(activeTier)}
                className="w-full bg-gradient-to-r from-[#008fe5] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-extrabold py-4 rounded-2xl shadow-xl shadow-blue-500/25 hover:-translate-y-0.5 transition text-sm flex items-center justify-center gap-2"
              >
                <span>Book This Flight ({activeTier.name})</span>
                <ArrowRight size={16} />
              </button>

              <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1"><ShieldCheck size={13} className="text-emerald-500" /> Instant Confirmation</span>
                <span>•</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={13} className="text-blue-500" /> Flexible Changes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* ── 1. FARE TIERS COMPARISON (Trip.com Style) ─────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-heading text-2xl font-black text-slate-900 flex items-center gap-2">
                <span>Select Your Fare Option</span>
                <span className="text-xs font-bold bg-[#008fe5]/10 text-[#008fe5] px-2.5 py-1 rounded-full">
                  3 Options Available
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Compare baggage, change fees, and perks across economy tiers.
              </p>
            </div>

            {/* Flyer Exclusive Banner Pill */}
            <div className="bg-sky-500/10 border border-sky-500/30 text-sky-900 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 text-xs font-bold">
              <Tag size={14} className="text-[#008fe5]" />
              <span>Flyer Exclusive: Save up to 25% on your hotel</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {fareTiers.map((tier) => (
              <div
                key={tier.id}
                onClick={() => setSelectedTierId(tier.id)}
                className={`relative bg-white rounded-3xl p-6 transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                  selectedTierId === tier.id
                    ? "border-2 border-[#008fe5] shadow-xl shadow-blue-500/15 ring-4 ring-[#008fe5]/10"
                    : "border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300"
                }`}
              >
                {/* Recommended Badge */}
                {tier.recommended && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#008fe5] to-blue-600 text-white text-[11px] font-black px-4 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1">
                    <Award size={12} /> Recommended
                  </div>
                )}

                <div className="space-y-4">
                  {/* Tier Title & Price */}
                  <div className="border-b border-slate-100 pb-4 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                        {tier.name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-bold">
                        {tier.cabinClass}
                      </span>
                    </div>

                    <div className="mt-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900">
                          {displayPrice(tier.price)}
                        </span>
                        <span className="text-[11px] text-slate-400 line-through font-semibold">
                          {displayPrice(tier.originalPrice)}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                        Round-trip per traveler • Taxes included
                      </p>
                    </div>
                  </div>

                  {/* Baggage Info */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Luggage size={13} className="text-[#008fe5]" /> Baggage Allowance
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl space-y-1.5 text-xs text-slate-700 font-medium">
                      <div className="flex items-center gap-2">
                        <Check size={13} className="text-emerald-500 shrink-0" />
                        <span>Carry-on baggage: <strong>{tier.baggage.carryOn}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={13} className="text-emerald-500 shrink-0" />
                        <span>Checked baggage: <strong>{tier.baggage.checked}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Flexibility Rules */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck size={13} className="text-[#008fe5]" /> Flexibility
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl space-y-1.5 text-xs text-slate-700 font-medium">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${tier.flexibility.refundable ? "bg-emerald-500" : "bg-amber-500"}`} />
                        <span className="text-[11px]">{tier.flexibility.refundNote}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-[11px] font-semibold">{tier.flexibility.changeFee}</span>
                      </div>
                    </div>
                  </div>

                  {/* Other Benefits */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Star size={13} className="text-amber-500" /> Other Benefits
                    </div>
                    <ul className="space-y-1 text-xs text-slate-600 font-medium">
                      {tier.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px]">
                          <Check size={12} className="text-[#008fe5] shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Bottom Action & Payment methods */}
                <div className="pt-5 mt-4 border-t border-slate-100 space-y-3">
                  {/* Payment Method Selector Dropdown */}
                  <div className="bg-slate-50 border border-slate-200/70 rounded-xl overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePaymentDropdown(tier.id);
                      }}
                      className="w-full px-3 py-2 flex items-center justify-between text-slate-700 font-semibold hover:bg-slate-100 transition"
                    >
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <CreditCard size={13} className="text-emerald-600" />
                        <span>Payment method: <strong className="text-slate-900">GCash, Maya</strong></span>
                      </span>
                      {expandedPaymentTier === tier.id ? (
                        <ChevronUp size={13} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={13} className="text-slate-400" />
                      )}
                    </button>

                    {expandedPaymentTier === tier.id && (
                      <div className="px-3 pb-2.5 pt-1 border-t border-slate-200/60 bg-white space-y-1.5 animate-in fade-in duration-150">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Accepted Payment Options
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                            GCash
                          </span>
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                            Maya
                          </span>
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                            Visa / Mastercard
                          </span>
                          <span className="bg-amber-50 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                            TravelConnect Wallet
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookTier(tier);
                    }}
                    className={`w-full font-black py-3 px-4 rounded-2xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md ${
                      selectedTierId === tier.id
                        ? "bg-gradient-to-r from-[#008fe5] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/25 hover:-translate-y-0.5"
                        : "bg-blue-600 hover:bg-blue-700 text-white hover:-translate-y-0.5"
                    }`}
                  >
                    <span>Select {tier.name}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 2. BAGGAGE ALLOWANCE & CANCELLATION DETAILS (Image 2 style) ──────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            
            {/* Visual Baggage Allowance Breakdown */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Luggage size={22} className="text-[#008fe5]" /> Baggage Allowance
                </h3>
                <span className="text-xs text-blue-600 font-bold hover:underline cursor-pointer">
                  Know Before You Pack
                </span>
              </div>

              {/* 3 Visual Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center space-y-1">
                  <div className="w-10 h-10 mx-auto rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="emoji text-2xl leading-none" role="img" aria-label="Personal item">🎒</span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-xs">Personal Item</h4>
                  <p className="text-[11px] text-slate-500">Backpack or purse fits under seat</p>
                  <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Included Free
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center space-y-1">
                  <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
                    <span className="emoji text-2xl leading-none" role="img" aria-label="Carry-on baggage">🧳</span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-xs">Carry-on Baggage</h4>
                  <p className="text-[11px] text-slate-500">1 piece, up to 7 kg (56 x 36 x 23 cm)</p>
                  <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Included Free
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center space-y-1">
                  <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="emoji text-2xl leading-none" role="img" aria-label="Checked baggage">📦</span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-xs">Checked Baggage</h4>
                  <p className="text-[11px] text-slate-500">{activeTier.baggage.checked}</p>
                  <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Included Free
                  </span>
                </div>
              </div>

              {/* Leg-by-leg breakdown table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden text-xs">
                <div className="bg-slate-100/70 px-4 py-2.5 font-bold text-slate-700 flex items-center justify-between">
                  <span>Flight Segment ({flight.departureCity} → {flight.arrivalCity})</span>
                  <span>Allowance Per Traveler</span>
                </div>
                <div className="divide-y divide-slate-100 bg-white">
                  <div className="px-4 py-3 flex items-center justify-between text-slate-600">
                    <span className="font-semibold text-slate-800">1 Adult Traveler</span>
                    <div className="text-right">
                      <span className="font-bold text-slate-900">1 Carry-on (7kg) + {activeTier.baggage.checked}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cancellations & Changes Policy Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-5">
              <h3 className="font-heading text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck size={22} className="text-[#008fe5]" /> Cancellations &amp; Changes
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Ban size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-slate-900 text-sm">Cancellations</p>
                      <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full">
                        {activeTier.flexibility.refundable ? "Refundable" : "Standard Rules"}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-1">{activeTier.flexibility.refundNote}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-slate-900 text-sm">Flight Changes &amp; Reschedule</p>
                      <span className="text-blue-700 font-bold text-[11px] bg-blue-50 px-2 py-0.5 rounded-full">
                        Flexible
                      </span>
                    </div>
                    <p className="text-slate-500 mt-1">{activeTier.flexibility.changeFee}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Flyer Exclusive: Unlock More Perks */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Flyer Exclusive
                  </span>
                  <h3 className="font-heading text-xl font-extrabold text-white mt-1.5">
                    Book this flight &amp; unlock more perks
                  </h3>
                </div>
                <Gift size={28} className="text-amber-400" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-3.5 text-center">
                  <Building2 size={20} className="mx-auto text-amber-300 mb-1" />
                  <p className="font-extrabold text-white">Up to 25% OFF</p>
                  <p className="text-[10px] text-slate-300">Hotels at {flight.arrivalCity}</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-3.5 text-center">
                  <Car size={20} className="mx-auto text-blue-300 mb-1" />
                  <p className="font-extrabold text-white">10% OFF Transfers</p>
                  <p className="text-[10px] text-slate-300">Airport express pickup</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-3.5 text-center">
                  <Star size={20} className="mx-auto text-emerald-300 mb-1" />
                  <p className="font-extrabold text-white">5% OFF Activities</p>
                  <p className="text-[10px] text-slate-300">Attractions &amp; day tours</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Price Details Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200/80 sticky top-24 space-y-5">
              <h3 className="font-heading text-lg font-extrabold text-slate-900 pb-3 border-b border-slate-100 flex items-center justify-between">
                <span>Price Details</span>
                <span className="text-xs font-bold text-[#008fe5]">{activeTier.name}</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Ticket (1 adult)</span>
                  <span className="font-bold text-slate-900">{displayPrice(activeTier.price)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Baggage (Carry-on + Checked)</span>
                  <span className="font-bold text-emerald-600">FREE</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">In-flight meals &amp; snacks</span>
                  <span className="font-bold text-emerald-600">INCLUDED</span>
                </div>

                {/* Accepted Payment badges */}
                <div className="pt-3 border-t border-slate-100 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Accepted Payment Methods
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-blue-200">
                      GCash
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-emerald-200">
                      Maya
                    </span>
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                      Cards
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-black text-slate-900 text-sm">Total</span>
                  <span className="font-heading font-black text-[#008fe5] text-2xl">{displayPrice(activeTier.price)}</span>
                </div>
              </div>

              <button
                onClick={() => handleBookTier(activeTier)}
                className="w-full bg-[#008fe5] hover:bg-blue-600 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 transition text-sm flex items-center justify-center gap-2"
              >
                <span>Proceed to Passenger Info</span>
                <CheckCircle2 size={16} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
