import { useState } from "react";
import {
  X, Check, ShieldCheck, Plane, Luggage, Utensils, Wifi, Award,
  CreditCard, ChevronDown, ChevronUp, Sparkles, Building2, Tag, Info
} from "lucide-react";
import { useCurrency } from "../../../context/CurrencyContext";
import { useBooking } from "../../../context/BookingContext";

export default function FlightFareTierModal({ isOpen, onClose, flight }) {
  const { displayPrice } = useCurrency();
  const { openCheckoutModal } = useBooking();
  const [expandedPaymentTier, setExpandedPaymentTier] = useState(null);

  if (!isOpen || !flight) return null;

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
        "Complimentary hot meals & drinks",
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

  const handleSelectTier = (tier) => {
    const bookingItem = {
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
    };

    onClose();
    openCheckoutModal(bookingItem);
  };

  const togglePaymentDropdown = (tierId) => {
    setExpandedPaymentTier((prev) => (prev === tierId ? null : tierId));
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] my-auto border border-slate-200/80">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#008fe5] flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Plane size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>{flight.departureCity}</span>
                  <span className="text-[#008fe5]">⇌</span>
                  <span>{flight.arrivalCity}</span>
                </h2>
                <span className="bg-[#008fe5]/20 text-[#008fe5] border border-[#008fe5]/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                  {flight.flightNumber}
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5 font-medium">
                <span>{flight.departureTime || "08:25 PM"}</span>
                <span className="text-slate-500">•</span>
                <span className="text-amber-400 font-bold">{flight.airline}</span>
                <span className="text-slate-500">•</span>
                <span>Terminal 4 ({flight.departureCity} Intl)</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Fare Tiers Grid */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
          
          {/* Top Notification / Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-blue-900">
            <div className="flex items-center gap-2.5">
              <span className="bg-amber-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                <Tag size={11} /> Flyer Exclusive
              </span>
              <span className="font-semibold text-slate-800">
                Book this flight &amp; save up to <strong>25% on your hotel</strong> stay!
              </span>
            </div>
            <span className="text-[11px] font-bold text-[#008fe5] flex items-center gap-1 shrink-0">
              <Info size={13} /> Auto-applied at checkout
            </span>
          </div>

          {/* 3 Tier Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {fareTiers.map((tier) => (
              <div
                key={tier.id}
                className={`relative bg-white rounded-3xl p-5 sm:p-6 transition-all duration-200 flex flex-col justify-between ${
                  tier.recommended
                    ? "border-2 border-[#008fe5] shadow-xl shadow-blue-500/10 ring-4 ring-[#008fe5]/10"
                    : "border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300"
                }`}
              >
                {/* Recommended Badge */}
                {tier.recommended && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#008fe5] to-blue-600 text-white text-[11px] font-black px-4 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1">
                    <Sparkles size={12} /> Recommended
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
                      <p className="text-[11px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                        <span>Round-trip per adult</span>
                        <span className="text-slate-300">•</span>
                        <span>Taxes included</span>
                      </p>
                    </div>
                  </div>

                  {/* Baggage Info */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Luggage size={13} className="text-[#008fe5]" /> Baggage Allowance
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl space-y-1 text-xs text-slate-700 font-medium">
                      <div className="flex items-center gap-2">
                        <Check size={13} className="text-emerald-500 shrink-0" />
                        <span>Carry-on: <strong>{tier.baggage.carryOn}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={13} className="text-emerald-500 shrink-0" />
                        <span>Checked: <strong>{tier.baggage.checked}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Flexibility Rules */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck size={13} className="text-[#008fe5]" /> Flexibility &amp; Changes
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl space-y-1 text-xs text-slate-700 font-medium">
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
                      <Award size={13} className="text-[#008fe5]" /> Included Perks
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

                {/* Bottom Action & Payment methods on accept */}
                <div className="pt-5 mt-4 border-t border-slate-100 space-y-3">
                  
                  {/* Payment Method Selector / Info Dropdown */}
                  <div className="bg-slate-50 border border-slate-200/70 rounded-xl overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => togglePaymentDropdown(tier.id)}
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
                        <p className="text-[10px] text-slate-500">
                          Instant electronic ticket issued upon checkout.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Select CTA button */}
                  <button
                    onClick={() => handleSelectTier(tier)}
                    className={`w-full font-black py-3 px-4 rounded-2xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md ${
                      tier.recommended
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

        {/* Footer info bar */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 text-slate-700 font-bold">
              <ShieldCheck size={14} className="text-emerald-500" />
              Official Carrier Partner
            </span>
            <span>•</span>
            <span>Instant E-Ticket Confirmation</span>
            <span>•</span>
            <span>24/7 Filipino &amp; Global Support</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 underline"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
