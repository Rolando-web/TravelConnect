import { useState, useEffect, useMemo } from "react";
import {
  X, Check, CreditCard, ShieldCheck, ArrowRight, ArrowLeft, RefreshCw,
  Sparkles, MapPin, Calendar, Users, Tag, CheckCircle2, QrCode, Printer,
  User, ClipboardList, Wallet, Coins, Plane, Plus, Trash2, Info
} from "lucide-react";
import { useBooking } from "../../../context/BookingContext";
import { useAuth } from "../../../context/AuthContext";
import { useCurrency } from "../../../context/CurrencyContext";
import { sendCustomerInquiry, flightsApi } from "../../../services/api";

const MAX_FLIGHT_SEGMENTS = 6;
const MAX_REGULAR_PASSENGERS = 9;

const PAYMENT_METHODS = [
  { id: "gcash", name: "GCash", logo: "https://upload.wikimedia.org/wikipedia/commons/5/52/GCash_logo.svg", desc: "Pay instantly with your GCash e-wallet", badge: "Fastest" },
  { id: "paymaya", name: "Maya", logo: "https://upload.wikimedia.org/wikipedia/commons/9/9a/PayMaya_Logo.png", desc: "Pay with your Maya wallet", badge: "Popular" },
];

const STEP_TITLES = [
  { n: 1, label: "Trip Details", icon: ClipboardList },
  { n: 2, label: "Passenger Details", icon: User },
  { n: 3, label: "Payment", icon: Wallet },
  { n: 4, label: "Confirmation", icon: CheckCircle2 },
];

export default function BookingCheckoutModal() {
  const {
    checkoutModalOpen,
    checkoutPackage,
    appliedPromo,
    closeCheckoutModal,
    processAndCreateBooking,
    validatePromoCode,
    walletBalance
  } = useBooking();

  const { user } = useAuth();
  const { displayPrice } = useCurrency();

  // 1: Trip Details, 2: Passenger Details, 3: Payment, 4: Confirmation
  const [step, setStep] = useState(1);

  // Booking Form State
  const [travellers, setTravellers] = useState(2);
  const [startDate, setStartDate] = useState("2026-09-15");
  const [endDate, setEndDate] = useState("2026-09-22");

  const [guestFirstName, setGuestFirstName] = useState(user?.name ? user.name.split(" ")[0] : "Juan");
  const [guestLastName, setGuestLastName] = useState(user?.name ? user.name.split(" ").slice(1).join(" ") : "Dela Cruz");
  const [noSurname, setNoSurname] = useState(false);
  const [guestGender, setGuestGender] = useState("Male");
  const [guestDob, setGuestDob] = useState("1995-06-15");
  const [guestNationality, setGuestNationality] = useState("Philippines");
  const [frequentFlyerProgram, setFrequentFlyerProgram] = useState("Qatar Airways");
  const [frequentFlyerNumber, setFrequentFlyerNumber] = useState("");
  const [hasLuggageProtection, setHasLuggageProtection] = useState(false);

  const [guestName, setGuestName] = useState(user?.name || "Juan Dela Cruz");
  const [guestEmail, setGuestEmail] = useState(user?.email || "");
  const [guestPhone, setGuestPhone] = useState("+63 917 123 4567");
  const [specialRequests, setSpecialRequests] = useState("");

  const [promoInput, setPromoInput] = useState(appliedPromo || "");
  const [promoResult, setPromoResult] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [validatingPromo, setValidatingPromo] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedBooking, setCompletedBooking] = useState(null);

  const [validationMsg, setValidationMsg] = useState("");

  // Multi-segment flight booking (Trip.com-style itinerary builder).
  const [tripType, setTripType] = useState("oneway"); // oneway | roundtrip | multicity
  const [flightSegments, setFlightSegments] = useState([]);
  const [availableFlights, setAvailableFlights] = useState([]);

  // A booking is flight-aware when it was launched from the Flights/Explore
  // "Book" buttons (category === "flight") and carries a flight snapshot.
  const isFlight =
    checkoutPackage?.category === "flight" && Boolean(checkoutPackage?.flight);

  // Seed the itinerary with the flight the user launched from, and load the
  // full flight catalog so they can add more segments up to the 6-segment cap.
  useEffect(() => {
    if (!checkoutModalOpen) return;
    if (isFlight && checkoutPackage?.flight) {
      setTripType("oneway");
      setFlightSegments([{ ...checkoutPackage.flight }]);
    } else {
      setTripType("oneway");
      setFlightSegments([]);
    }
    setValidationMsg("");
    flightsApi
      .list()
      .then((data) => { setAvailableFlights(Array.isArray(data) ? data : []); })
      .catch(() => setAvailableFlights([]));
  }, [checkoutModalOpen, isFlight]);

  const maxPassengers = isFlight ? MAX_REGULAR_PASSENGERS : 99;

  const segmentPricing = useMemo(() => {
    if (!isFlight) return { count: 0, sum: 0 };
    const valid = (flightSegments || []).filter((s) => s && Number(s.price) > 0);
    return {
      count: valid.length,
      sum: valid.reduce((acc, s) => acc + Number(s.price || 0), 0)
    };
  }, [isFlight, flightSegments]);

  const addFlightSegment = () => {
    setFlightSegments((prev) => {
      if (prev.length >= MAX_FLIGHT_SEGMENTS) return prev;
      return [...prev, {}];
    });
  };

  const removeFlightSegment = (index) => {
    setFlightSegments((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFlightSegment = (index, flight) => {
    setFlightSegments((prev) => prev.map((s, i) => (i === index ? { ...flight } : s)));
  };

  useEffect(() => {
    if (checkoutModalOpen) {
      setStep(1);
      setIsProcessing(false);
      setCompletedBooking(null);
      setValidationMsg("");

      if (user) {
        if (user.name) setGuestName(user.name);
        if (user.email) setGuestEmail(user.email);
      } else {
        if (!guestName) setGuestName("Juan Dela Cruz");
        if (!guestEmail) setGuestEmail("guest@travelconnect.ph");
      }

      if (appliedPromo) {
        setPromoInput(appliedPromo);
        handleApplyPromo(appliedPromo);
      } else {
        setPromoResult(null);
        setPromoError("");
      }
    }
  }, [checkoutModalOpen, appliedPromo, user]);

  if (!checkoutModalOpen || !checkoutPackage) return null;

  const unitPrice = typeof checkoutPackage.price === "number"
    ? checkoutPackage.price
    : parseInt(String(checkoutPackage.price).replace(/[^0-9]/g, "")) || 1500;

  // For flight bookings the base fare is the sum of all flight segments
  // × travellers (per person per segment); otherwise it's unit × travellers.
  const flightUnitFare = isFlight && segmentPricing.count > 0 ? segmentPricing.sum : 0;
  const rawSubtotal = flightUnitFare > 0
    ? flightUnitFare * travellers
    : unitPrice * (checkoutPackage.category === "car" || checkoutPackage.category === "hotel" ? 1 : travellers);
  const luggageProtectionFee = (isFlight && hasLuggageProtection) ? (314 * travellers) : 0;
  const discountAmount = promoResult ? promoResult.discountAmount : 0;
  const totalAmount = Math.max(0, rawSubtotal + luggageProtectionFee - discountAmount);

  const handleApplyPromo = async (codeToTest = promoInput) => {
    if (!codeToTest.trim()) {
      setPromoError("Please enter a promo code.");
      return;
    }
    setValidatingPromo(true);
    setPromoError("");
    try {
      const res = await validatePromoCode(codeToTest.trim(), rawSubtotal);
      if (res.valid) {
        setPromoResult(res);
        setPromoError("");
      } else {
        setPromoResult(null);
        setPromoError(res.message || "Invalid promo code.");
      }
    } catch {
      setPromoError("Failed to validate promo code.");
    } finally {
      setValidatingPromo(false);
    }
  };

  // Validate the active step before allowing the user to continue.
  const validateStep = () => {
    if (step === 2) {
      const effectiveName = noSurname ? guestFirstName.trim() : `${guestFirstName.trim()} ${guestLastName.trim()}`.trim();
      if (!guestFirstName.trim() || (!noSurname && !guestLastName.trim())) {
        return "Please provide both first and last name for the primary passenger.";
      }
      if (!guestEmail.trim()) return "Please provide an email address for your e-ticket.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim()))
        return "Please enter a valid email address.";
      setGuestName(effectiveName);
      return "";
    }
    return "";
  };

  const handleNext = () => {
    setValidationMsg("");
    const err = validateStep();
    if (err) {
      setValidationMsg(err);
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const handleBack = () => {
    setValidationMsg("");
    setStep((s) => Math.max(1, s - 1));
  };

  const handleCompleteTransaction = async () => {
    if (!guestName.trim() || !guestEmail.trim()) {
      setValidationMsg("Please provide your name and email address.");
      return;
    }

    setIsProcessing(true);
    setValidationMsg("");

    const bookingPayload = {
      name: checkoutPackage.name || checkoutPackage.title,
      location: checkoutPackage.location || "Philippines",
      img: checkoutPackage.img || checkoutPackage.imageUrl || checkoutPackage.image,
      startDate,
      endDate,
      travellers,
      subtotal: rawSubtotal,
      discountAmount,
      totalAmount,
      promoCodeUsed: promoResult ? promoResult.code : "",
      customerName: guestName,
      customerEmail: guestEmail,
      customerPhone: guestPhone,
      specialRequests,
      category: checkoutPackage.category || "package",
      flightSegments: isFlight
        ? (flightSegments || [])
            .filter((s) => s && s.flightNumber)
            .map((s, i) => ({
              segmentOrder: i + 1,
              airline: s.airline || "",
              flightNumber: s.flightNumber || "",
              departureCity: s.departureCity || "",
              arrivalCity: s.arrivalCity || "",
              departureTime: s.departureTime || "",
              arrivalTime: s.arrivalTime || "",
              departureDate: s.departureDate || startDate,
              class: s.class || "Economy",
              price: Number(s.price || 0)
            }))
        : [],
      services: checkoutPackage.services || {
        flight: "Direct Flight Reservation (Electronic Boarding Pass)",
        hotel: `Luxury Accommodation Stay (${checkoutPackage.duration || "3 Days"})`,
        car: "Airport Car Rental or Free Airport Express Transfers",
        insurance: "24/7 Travel Assistance & Full Refund Guarantee"
      }
    };

    const paymentPayload = {
      paymentMethod,
      amount: totalAmount,
      bookingReference: checkoutPackage.name || checkoutPackage.title,
      customerName: guestName,
      customerEmail: guestEmail
    };

    try {
      const created = await processAndCreateBooking(bookingPayload, paymentPayload);

      if (specialRequests.trim()) {
        await sendCustomerInquiry({
          customerName: guestName,
          customerEmail: guestEmail,
          subject: `Special Request for ${created.id || created.referenceNumber}`,
          message: specialRequests,
          bookingReference: created.id || created.referenceNumber
        });
      }

      setCompletedBooking(created);
      setIsProcessing(false);
      setStep(4);
    } catch (err) {
      console.error("Transaction error:", err);
      setIsProcessing(false);
      setValidationMsg(err.message || "Payment could not be completed. Please try again.");
    }
  };

  const isPaidUnit = checkoutPackage.category === "car" || checkoutPackage.category === "hotel";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] my-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-200">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#008fe5] flex items-center justify-center shadow-lg shadow-blue-500/30">
              <CreditCard size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  {step === 4 ? "Booking Confirmed & Ready!" : "Step-by-Step Booking"}
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                  100% Refundable
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate max-w-xs sm:max-w-md">
                {checkoutPackage.name || checkoutPackage.title}
              </p>
            </div>
          </div>

          <button
            onClick={closeCheckoutModal}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Step Progress Indicator ───────────────────────────────────────── */}
        {step < 4 && (
          <div className="px-6 pt-5 pb-2 flex-shrink-0 bg-white">
            <div className="flex items-center">
              {STEP_TITLES.map((s, i) => (
                <div key={s.n} className="flex items-center flex-1 last:flex-none">
                  <button
                    onClick={() => s.n < step && setStep(s.n)}
                    disabled={s.n >= step}
                    className={`flex flex-col items-center gap-1.5 group ${
                      s.n < step ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition text-xs font-black border-2 ${
                        s.n < step
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : s.n === step
                            ? "bg-[#008fe5] border-[#008fe5] text-white shadow-lg shadow-blue-500/30"
                            : "bg-white border-slate-200 text-slate-400"
                      }`}
                    >
                      {s.n < step ? <Check size={16} /> : <s.icon size={16} />}
                    </div>
                    <span
                      className={`text-[10px] font-bold hidden sm:block ${
                        s.n <= step ? "text-slate-800" : "text-slate-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                  {i < STEP_TITLES.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 mb-4 sm:mb-5 rounded-full ${
                        s.n < step ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 1: TRIP DETAILS ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="p-5 sm:p-8 overflow-y-auto flex-1 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Left: Trip Card */}
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200/80 space-y-4 shadow-sm">
                  <div className="relative h-40 rounded-2xl overflow-hidden bg-slate-200">
                    <img
                      src={checkoutPackage.img || checkoutPackage.imageUrl || checkoutPackage.image || "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=800&q=80"}
                      alt={checkoutPackage.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1">
                      <MapPin size={11} /> {checkoutPackage.location || "Philippines"}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base leading-snug">
                      {checkoutPackage.name || checkoutPackage.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      {checkoutPackage.duration || "Instant Digital Confirmation"}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-200/60 space-y-1.5 text-[11px] font-semibold text-slate-600">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                      <CheckCircle2 size={13} /> 100% Free Cancellation &amp; Instant Refund
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <CheckCircle2 size={13} className="text-[#008fe5]" /> Official Digital Vouchers &amp; E-Ticket
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <CheckCircle2 size={13} className="text-[#008fe5]" /> 24/7 Support &amp; Concierge
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Travelers & Dates */}
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Users size={14} className="text-[#008fe5]" /> Who is travelling?
                  </h4>

                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-500 text-sm flex items-center gap-1.5">
                      Travelers / Guests:
                    </span>
                    <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setTravellers(Math.max(1, travellers - 1))}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 font-black flex items-center justify-center text-sm"
                      >
                        -
                      </button>
                      <span className="font-black text-slate-900 w-6 text-center">{travellers}</span>
                      <button
                        type="button"
                        onClick={() => setTravellers(Math.min(maxPassengers, travellers + 1))}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 font-black flex items-center justify-center text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {isFlight && (
                    <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                      <Info size={11} /> Up to {MAX_REGULAR_PASSENGERS} passengers per booking. Need to book 10+? Contact our group-booking team — we'll get you a custom quote.
                    </div>
                  )}

                  {!isPaidUnit && (
                    <div className="text-[11px] text-slate-400 font-medium">
                      {isFlight && segmentPricing.count > 0
                        ? `${travellers} passengers × ${segmentPricing.count} segment(s) (${displayPrice(flightUnitFare)} / pax) = ${displayPrice(rawSubtotal)}`
                        : `${travellers} × ${displayPrice(unitPrice)} = ${displayPrice(rawSubtotal)}`}
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Calendar size={14} className="text-[#008fe5]" /> When are you travelling?
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-extrabold text-slate-400 uppercase mb-1">Pick-up / Departure Date</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#008fe5]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-extrabold text-slate-400 uppercase mb-1">Return / End Date</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#008fe5]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price summary */}
                <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600 font-medium">
                    <span>
                      {isFlight && segmentPricing.count > 0
                        ? `Fare (${segmentPricing.count} segment(s) per pax × ${travellers})`
                        : `Base Fare (${displayPrice(unitPrice)}${isPaidUnit ? "" : ` × ${travellers}`})`}
                    </span>
                    <span className="font-bold text-slate-900">{displayPrice(rawSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 font-medium">
                    <span>Processing Fees</span>
                    <span className="text-emerald-600 font-bold">{displayPrice(0)} (Free)</span>
                  </div>
                  <div className="pt-2 border-t border-blue-200 flex items-baseline justify-between">
                    <span className="text-sm font-black text-slate-900">Estimated Total</span>
                    <span className="text-2xl font-black text-[#008fe5]">{displayPrice(rawSubtotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Flight Itinerary Builder (flights & multi-city) ─────────────── */}
            {isFlight && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Plane size={16} className="text-[#008fe5]" /> Your Flight Itinerary
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Mix and match up to {MAX_FLIGHT_SEGMENTS} flight segments. Note: 6 segments isn't the same as 6 cities — e.g. Manila → Singapore → Bangkok → Manila is 3 segments but 2 destination cities.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {[
                      { key: "oneway", label: "One-way" },
                      { key: "roundtrip", label: "Round-trip" },
                      { key: "multicity", label: "Multi-city" }
                    ].map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => {
                          setTripType(t.key);
                          const base = (flightSegments && flightSegments[0]) ? [{ ...flightSegments[0] }] : [];
                          if (t.key === "roundtrip" && base.length === 1) {
                            const r = (flightSegments && flightSegments[0]) ? { ...flightSegments[0] } : {};
                            base.push(r.arrivalCity ? { roundtripReturn: true, ...r } : {});
                          } else if (t.key === "oneway") {
                            // keep a single segment
                          }
                          setFlightSegments(base.length ? base : [{}]);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition ${
                          tripType === t.key
                            ? "bg-[#008fe5] text-white border-[#008fe5]"
                            : "bg-white text-slate-600 border-slate-200 hover:border-[#008fe5]"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {flightSegments.map((seg, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#008fe5] text-white text-[10px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-extrabold text-slate-700">
                            Segment {idx + 1} of {MAX_FLIGHT_SEGMENTS}
                          </span>
                        </div>
                        {flightSegments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFlightSegment(idx)}
                            className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition"
                            aria-label="Remove segment"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Select Flight</label>
                        <select
                          value={seg.id || ""}
                          onChange={(e) => {
                            const f = availableFlights.find((x) => String(x.id) === e.target.value);
                            if (f) updateFlightSegment(idx, {
                              id: f.id,
                              flightNumber: f.flightNumber,
                              airline: f.airline,
                              departureCity: f.departureCity,
                              arrivalCity: f.arrivalCity,
                              departureTime: f.departureTime,
                              arrivalTime: f.arrivalTime,
                              departureDate: f.departureDate,
                              price: Number(f.price || 0),
                              class: f.class || "Economy",
                              imageUrl: f.imageUrl,
                              seatsAvailable: Number(f.seatsAvailable || 0)
                            });
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#008fe5]"
                        >
                          <option value="">Select a flight…</option>
                          {availableFlights.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.airline} {f.flightNumber} · {f.departureCity} → {f.arrivalCity} · {f.departureTime}–{f.arrivalTime} · {displayPrice(Number(f.price || 0))}
                            </option>
                          ))}
                        </select>
                      </div>

                      {seg.id ? (
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 font-semibold">
                          <span className="bg-white border border-slate-200 rounded-lg px-2.5 py-1">
                            {seg.airline} <b>{seg.flightNumber}</b>
                          </span>
                          <span className="bg-white border border-slate-200 rounded-lg px-2.5 py-1">
                            {seg.departureCity} → {seg.arrivalCity}
                          </span>
                          <span className="bg-white border border-slate-200 rounded-lg px-2.5 py-1">
                            {seg.departureTime} – {seg.arrivalTime} · {seg.departureDate}
                          </span>
                          <span className="ml-auto font-black text-[#008fe5]">{displayPrice(Number(seg.price || 0))}</span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                          <Info size={11} /> Pick a flight to fill this segment.
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={addFlightSegment}
                    disabled={flightSegments.length >= MAX_FLIGHT_SEGMENTS}
                    className="flex items-center gap-1.5 text-xs font-extrabold text-[#008fe5] hover:bg-blue-50 px-3 py-2 rounded-xl border border-dashed border-[#008fe5]/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus size={14} /> Add flight segment
                  </button>
                  {segmentPricing.count > 0 && (
                    <div className="text-xs font-extrabold text-slate-700">
                      Fare per passenger: <span className="text-[#008fe5]">{displayPrice(flightUnitFare)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer nav */}
            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={handleNext}
                className="bg-[#008fe5] hover:bg-blue-600 text-white font-black py-3.5 px-8 rounded-2xl shadow-xl shadow-blue-500/25 transition flex items-center gap-2 text-sm"
              >
                Continue to Passenger Details <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: PASSENGER DETAILS (Trip.com Style) ───────────────────── */}
        {step === 2 && (
          <div className="p-5 sm:p-8 overflow-y-auto flex-1 space-y-6">

            {/* 1. Trip Header Summary */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#008fe5] bg-blue-500/20 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                    Flight Itinerary
                  </span>
                  <h3 className="text-xl font-black text-white mt-1">
                    Trip to {checkoutPackage.location || (isFlight && checkoutPackage.flight?.arrivalCity) || "Destination"}
                  </h3>
                </div>
                {checkoutPackage.tier && (
                  <span className="bg-amber-400 text-slate-900 text-xs font-black px-3 py-1 rounded-full uppercase">
                    {checkoutPackage.tier}
                  </span>
                )}
              </div>

              {isFlight && checkoutPackage.flight && (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 flex items-center justify-between flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <Plane size={18} className="text-[#008fe5]" />
                    <div>
                      <span className="font-extrabold text-white">
                        {checkoutPackage.flight.departureCity} ({checkoutPackage.flight.departureTime || "08:25 PM"})
                        {" → "}
                        {checkoutPackage.flight.arrivalCity} ({checkoutPackage.flight.arrivalTime || "10:20 PM"})
                      </span>
                      <p className="text-[11px] text-slate-300">
                        {checkoutPackage.flight.airline} {checkoutPackage.flight.flightNumber} • Non-stop • {checkoutPackage.flight.class || "Economy"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-emerald-300 font-bold">✓ Direct Flight</span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Who's Traveling? */}
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <User size={18} className="text-[#008fe5]" /> Who's traveling?
                </h4>
                <span className="text-[11px] text-slate-400 font-medium">Passenger 1 (Adult)</span>
              </div>

              {/* Name fields */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase">
                      Given / First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={guestFirstName}
                      onChange={(e) => setGuestFirstName(e.target.value)}
                      placeholder="e.g. Juan"
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-[#008fe5] focus:ring-2 focus:ring-blue-100 transition"
                    />
                  </div>

                  {!noSurname && (
                    <div className="space-y-1">
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase">
                        Surname / Last Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={guestLastName}
                        onChange={(e) => setGuestLastName(e.target.value)}
                        placeholder="e.g. Dela Cruz"
                        className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-[#008fe5] focus:ring-2 focus:ring-blue-100 transition"
                      />
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 font-medium select-none">
                  <input
                    type="checkbox"
                    checked={noSurname}
                    onChange={(e) => setNoSurname(e.target.checked)}
                    className="rounded text-[#008fe5] focus:ring-[#008fe5] w-4 h-4 accent-[#008fe5]"
                  />
                  <span>This passenger has no surname (single word legal name)</span>
                </label>
              </div>

              {/* Gender, DOB & Nationality */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase">
                    Gender <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={guestGender}
                    onChange={(e) => setGuestGender(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-[#008fe5]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase">
                    Date of Birth <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={guestDob}
                    onChange={(e) => setGuestDob(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-[#008fe5]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase">
                    Nationality <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={guestNationality}
                    onChange={(e) => setGuestNationality(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-[#008fe5]"
                  >
                    <option value="Philippines">Philippines</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Japan">Japan</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Australia">Australia</option>
                    <option value="Canada">Canada</option>
                    <option value="United Arab Emirates">United Arab Emirates</option>
                  </select>
                </div>
              </div>

              {/* Frequent Flyer Program (Optional) */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-xs font-extrabold text-slate-700 block">
                  Frequent Flyer Program (Optional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={frequentFlyerProgram}
                    onChange={(e) => setFrequentFlyerProgram(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="None">None</option>
                    <option value="Qatar Airways">Qatar Airways Privilege Club</option>
                    <option value="Philippine Airlines">Philippine Airlines Mabuhay Miles</option>
                    <option value="Cebu Pacific">Cebu Pacific Go Rewards</option>
                    <option value="Emirates">Emirates Skywards</option>
                    <option value="Singapore Airlines">Singapore Airlines KrisFlyer</option>
                  </select>
                  <input
                    type="text"
                    value={frequentFlyerNumber}
                    onChange={(e) => setFrequentFlyerNumber(e.target.value)}
                    placeholder="Frequent flyer number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 3. Contact Details */}
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
              <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CreditCard size={18} className="text-[#008fe5]" /> Contact details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase">
                    Contact Person <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={guestFirstName + (noSurname ? "" : ` ${guestLastName}`)}
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-600 outline-none cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="juan@gmail.com"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-[#008fe5]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase">
                    Mobile Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+63 917 123 4567"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-[#008fe5]"
                  />
                </div>
              </div>
            </div>

            {/* 4. Baggage Allowance Visual Cards */}
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Luggage size={18} className="text-[#008fe5]" /> Baggage allowance
                </h4>
                <span className="text-xs text-blue-600 font-bold">Included in ticket</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-center">
                  <span className="text-xl">🎒</span>
                  <p className="font-extrabold text-slate-900 text-xs mt-1">Personal item</p>
                  <p className="text-[10px] text-slate-500">Under seat • FREE</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-center">
                  <span className="text-xl">🧳</span>
                  <p className="font-extrabold text-slate-900 text-xs mt-1">Carry-on baggage</p>
                  <p className="text-[10px] text-slate-500">1 pc, 7 kg total • FREE</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-center">
                  <span className="text-xl">📦</span>
                  <p className="font-extrabold text-slate-900 text-xs mt-1">Checked baggage</p>
                  <p className="text-[10px] text-slate-500">
                    {checkoutPackage.flight?.baggageAllowance || "25 kg checked"} • FREE
                  </p>
                </div>
              </div>
            </div>

            {/* 5. Add-on Protection: Lost Checked Baggage */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="baggageProtection"
                    checked={hasLuggageProtection}
                    onChange={(e) => setHasLuggageProtection(e.target.checked)}
                    className="mt-1 rounded text-[#008fe5] focus:ring-[#008fe5] w-4 h-4 accent-[#008fe5]"
                  />
                  <div>
                    <label htmlFor="baggageProtection" className="font-extrabold text-slate-900 text-sm cursor-pointer block">
                      Lost Checked Baggage Protection
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Your check-in baggage will be tracked throughout your flight. If your bag is lost or delayed past 96 hours, get paid up to <strong>₱45,000</strong> compensation.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-black text-slate-900 text-sm block">₱314.00</span>
                  <span className="text-[10px] text-slate-400 font-semibold">/ person</span>
                </div>
              </div>
            </div>

            {/* 6. Cancellations & Changes Policy */}
            <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200/80 space-y-3 text-xs">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" /> Cancellations &amp; changes
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-2xl border border-slate-200/60">
                  <span className="font-bold text-slate-800 block">Cancellation Policy</span>
                  <span className="text-slate-500 text-[11px]">
                    {checkoutPackage.flight?.refundPolicy || "Standard cancellation rules apply. Partial refund available."}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-200/60">
                  <span className="font-bold text-slate-800 block">Flight Changes</span>
                  <span className="text-slate-500 text-[11px]">
                    {checkoutPackage.flight?.changePolicy || "Change fee applies based on airline tariff."}
                  </span>
                </div>
              </div>
            </div>

            {/* 7. Flyer Exclusive: Unlock More Perks */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    Flyer Exclusive
                  </span>
                  <h4 className="text-sm font-black text-white mt-1">Book this flight &amp; unlock more perks</h4>
                </div>
                <Sparkles size={20} className="text-amber-400" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="bg-white/10 rounded-xl p-2.5 text-center">
                  <span className="font-black text-white block">25% OFF</span>
                  <span className="text-slate-300 text-[10px]">Hotel stays</span>
                </div>
                <div className="bg-white/10 rounded-xl p-2.5 text-center">
                  <span className="font-black text-white block">10% OFF</span>
                  <span className="text-slate-300 text-[10px]">Airport transfers</span>
                </div>
                <div className="bg-white/10 rounded-xl p-2.5 text-center">
                  <span className="font-black text-white block">5% OFF</span>
                  <span className="text-slate-300 text-[10px]">Activities &amp; tours</span>
                </div>
                <div className="bg-white/10 rounded-xl p-2.5 text-center">
                  <span className="font-black text-white block">5% OFF</span>
                  <span className="text-slate-300 text-[10px]">Car rentals</span>
                </div>
              </div>
            </div>

            {validationMsg && (
              <p className="text-xs font-bold text-rose-500">{validationMsg}</p>
            )}

            {/* Footer nav */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleBack}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-3.5 px-6 rounded-2xl transition flex items-center gap-2 text-sm"
              >
                <ArrowLeft size={18} /> Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="bg-[#008fe5] hover:bg-blue-600 text-white font-black py-3.5 px-8 rounded-2xl shadow-xl shadow-blue-500/25 transition flex items-center gap-2 text-sm"
              >
                Continue to Payment <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: PAYMENT ──────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="p-5 sm:p-8 overflow-y-auto flex-1 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: order summary */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200/80 space-y-3 shadow-sm">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Order Summary</h4>
                  <div className="text-[11px] text-slate-500 font-semibold">
                    {checkoutPackage.name || checkoutPackage.title}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                    <span>Base Fare ({displayPrice(unitPrice)}{isPaidUnit ? "" : ` × ${travellers}`})</span>
                    <span className="font-bold text-slate-900">{displayPrice(rawSubtotal)}</span>
                  </div>
                  {hasLuggageProtection && (
                    <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                      <span>Lost Checked Baggage Protection ({travellers} pax)</span>
                      <span className="font-bold text-slate-900">{displayPrice(luggageProtectionFee)}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-emerald-600 font-bold">
                      <span>Promo Discount ({promoResult?.code})</span>
                      <span>-{displayPrice(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                    <span>Processing Fees</span>
                    <span className="text-emerald-600 font-bold">{displayPrice(0)} (Free)</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
                    <span className="text-sm font-black text-slate-900">Total</span>
                    <span className="text-2xl font-black text-[#008fe5]">{displayPrice(totalAmount)}</span>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-500">Primary Guest</span>
                    <span className="font-bold text-slate-800">{guestName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-500">Travel Dates</span>
                    <span className="font-bold text-slate-800">{startDate} → {endDate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-500">Travellers</span>
                    <span className="font-bold text-slate-800">{travellers}</span>
                  </div>
                </div>
              </div>

              {/* Right: promo + payment method */}
              <div className="lg:col-span-7 space-y-5">
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 flex items-center gap-2">
                  <Tag size={16} className="text-[#008fe5] shrink-0" />
                  <input
                    type="text"
                    placeholder="Promo code? (e.g. SUMMER26, WELCOME50)"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none flex-1 uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyPromo(promoInput)}
                    disabled={validatingPromo}
                    className="bg-slate-900 hover:bg-[#008fe5] text-white font-bold px-4 py-1.5 rounded-xl text-xs transition"
                  >
                    {validatingPromo ? "Checking..." : "Apply"}
                  </button>
                </div>
                {promoError && <p className="text-xs font-bold text-rose-500 pl-2">{promoError}</p>}
                {promoResult && <p className="text-xs font-bold text-emerald-600 pl-2">✓ Promo Applied: {promoResult.description} (-{displayPrice(promoResult.discountAmount)})</p>}

                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      Select Payment Method
                    </h4>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <ShieldCheck size={12} /> PayMongo SSL Encrypted
                    </span>
                  </div>

                  {/* TravelConnect Money Option */}
                  {walletBalance > 0 && (
                    <label
                      onClick={() => setPaymentMethod("wallet")}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                        paymentMethod === "wallet"
                          ? "bg-amber-50/70 border-amber-400 shadow-sm ring-2 ring-amber-200"
                          : "bg-slate-50/70 border-slate-200/80 hover:bg-amber-50/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === "wallet"}
                          onChange={() => setPaymentMethod("wallet")}
                          className="text-amber-500 accent-amber-500"
                        />
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                            <Coins size={16} className="text-amber-600" />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 text-xs block">TravelConnect Money</span>
                            <span className="text-[10px] text-slate-500 font-medium block">Balance: <strong className="text-emerald-600">{displayPrice(walletBalance)}</strong></span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${walletBalance >= totalAmount ? "text-emerald-700 bg-emerald-100" : "text-rose-700 bg-rose-100"}`}>
                        {walletBalance >= totalAmount ? "Sufficient" : "Insufficient"}
                      </span>
                    </label>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {PAYMENT_METHODS.map((pm) => (
                      <label
                        key={pm.id}
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                          paymentMethod === pm.id
                            ? "bg-blue-50/70 border-[#008fe5] shadow-sm ring-2 ring-blue-200"
                            : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === pm.id}
                            onChange={() => setPaymentMethod(pm.id)}
                            className="text-[#008fe5] accent-[#008fe5]"
                          />
                          <div>
                            <span className="font-extrabold text-slate-900 text-xs block">{pm.name}</span>
                            <span className="text-[10px] text-slate-500 font-medium block">{pm.desc}</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-black text-[#008fe5] bg-blue-100/80 px-2 py-0.5 rounded-full">
                          {pm.badge}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {validationMsg && (
                  <p className="text-xs font-bold text-rose-500">{validationMsg}</p>
                )}

                <button
                  type="button"
                  onClick={handleCompleteTransaction}
                  disabled={isProcessing || (paymentMethod === "wallet" && walletBalance < totalAmount)}
                  className="w-full bg-[#008fe5] hover:bg-blue-600 active:scale-[0.98] text-white font-black py-4 px-6 rounded-2xl shadow-xl shadow-blue-500/25 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" /> Authorizing Payment Transaction...
                    </>
                  ) : (
                    <>
                      <span>Pay {displayPrice(totalAmount)} &amp; Confirm Booking</span>
                      <Sparkles size={18} />
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-slate-400 font-medium">
                  {paymentMethod === "wallet"
                    ? "💰 Paying with your TravelConnect Money wallet. Refunds are credited back instantly."
                    : "🔒 Bank-grade PayMongo payment. You can cancel and receive an instant refund anytime from My Bookings."
                  }
                </p>
              </div>
            </div>

            {/* Footer nav */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleBack}
                disabled={isProcessing}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-3.5 px-6 rounded-2xl transition flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <ArrowLeft size={18} /> Back
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: INSTANT CONFIRMATION & DIGITAL VOUCHER ───────────────── */}
        {step === 4 && completedBooking && (
          <div className="p-6 sm:p-10 overflow-y-auto flex-1 text-center space-y-6">

            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1">
              <span className="bg-emerald-100 text-emerald-700 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                Payment Authorized &amp; Confirmed
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-2">
                Your Booking is Complete!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                An electronic ticket voucher and invoice have been issued to <strong className="text-slate-800">{guestEmail}</strong>.
              </p>
            </div>

            <div className="max-w-xl mx-auto bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 text-left shadow-2xl border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-extrabold text-blue-300 uppercase tracking-widest block">Official E-Voucher</span>
                  <span className="text-lg font-black text-white">{completedBooking.name || checkoutPackage.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Booking Ref</span>
                  <span className="text-sm font-mono font-black text-amber-400">{completedBooking.id || completedBooking.referenceNumber}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-b border-slate-800 pb-4 mb-4">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Primary Guest</span>
                  <span className="font-bold text-white">{guestName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Travel Dates</span>
                  <span className="font-bold text-white">{startDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Paid in PHP</span>
                  <span className="font-black text-emerald-400">{displayPrice(totalAmount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Method</span>
                  <span className="font-bold text-white uppercase">{paymentMethod}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                <div className="flex items-center gap-2">
                  <QrCode size={28} className="text-white" />
                  <span className="text-[11px] font-mono text-slate-400">Scan at check-in counter</span>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2.5 py-1 rounded-md border border-emerald-500/30">
                  CONFIRMED &amp; GUARANTEED
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                onClick={() => window.print()}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold px-6 py-3 rounded-2xl text-xs transition flex items-center gap-2"
              >
                <Printer size={15} /> Print E-Ticket Voucher
              </button>
              <button
                onClick={closeCheckoutModal}
                className="bg-[#008fe5] hover:bg-blue-600 text-white font-black px-8 py-3 rounded-2xl text-xs shadow-xl shadow-blue-500/25 transition"
              >
                Done &amp; View in My Bookings
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
