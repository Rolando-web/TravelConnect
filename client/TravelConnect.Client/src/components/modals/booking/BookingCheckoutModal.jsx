import { useState, useEffect } from "react";
import {
  X, Check, CreditCard, ShieldCheck, ArrowRight, ArrowLeft, RefreshCw,
  Sparkles, MapPin, Calendar, Users, Tag, CheckCircle2, QrCode, Printer,
  User, ClipboardList, Wallet, Coins
} from "lucide-react";
import { useBooking } from "../../../context/BookingContext";
import { useAuth } from "../../../context/AuthContext";
import { sendCustomerInquiry } from "../../../services/api";

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

  // 1: Trip Details, 2: Passenger Details, 3: Payment, 4: Confirmation
  const [step, setStep] = useState(1);

  // Booking Form State
  const [travellers, setTravellers] = useState(2);
  const [startDate, setStartDate] = useState("2026-09-15");
  const [endDate, setEndDate] = useState("2026-09-22");

  const [guestName, setGuestName] = useState(user?.name || "");
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

  const rawSubtotal = unitPrice * (checkoutPackage.category === "car" || checkoutPackage.category === "hotel" ? 1 : travellers);
  const discountAmount = promoResult ? promoResult.discountAmount : 0;
  const totalAmount = Math.max(0, rawSubtotal - discountAmount);

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
      if (!guestName.trim()) return "Please provide the full name of the primary passenger.";
      if (!guestEmail.trim()) return "Please provide an email address for your e-ticket.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim()))
        return "Please enter a valid email address.";
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
                        onClick={() => setTravellers(travellers + 1)}
                        className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 font-black flex items-center justify-center text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {!isPaidUnit && (
                    <div className="text-[11px] text-slate-400 font-medium">
                      {travellers} × ₱{unitPrice.toLocaleString()} = ₱{rawSubtotal.toLocaleString()}
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
                    <span>Base Fare (₱{unitPrice.toLocaleString()}{isPaidUnit ? "" : ` × ${travellers}`})</span>
                    <span className="font-bold text-slate-900">₱{rawSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 font-medium">
                    <span>Processing Fees</span>
                    <span className="text-emerald-600 font-bold">₱0.00 (Free)</span>
                  </div>
                  <div className="pt-2 border-t border-blue-200 flex items-baseline justify-between">
                    <span className="text-sm font-black text-slate-900">Estimated Total</span>
                    <span className="text-2xl font-black text-[#008fe5]">₱{rawSubtotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

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

        {/* ── STEP 2: PASSENGER DETAILS ────────────────────────────────────── */}
        {step === 2 && (
          <div className="p-5 sm:p-8 overflow-y-auto flex-1 space-y-6">
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <User size={16} className="text-[#008fe5]" /> Primary Passenger / Guest Details
              </h4>
              <p className="text-[11px] text-slate-400 font-medium">
                The booking confirmation, e-ticket and payment receipt will be sent to the email below.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-400 uppercase">Full Name</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Juan Dela Cruz"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-[#008fe5] focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-400 uppercase">Email for E-Tickets</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="juan@gmail.com"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-[#008fe5] focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-400 uppercase">Mobile Number (SMS Updates)</label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+63 917 123 4567"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-[#008fe5] focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold text-slate-400 uppercase">Special Request (Optional)</label>
                  <input
                    type="text"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="e.g. Window seat, late arrival"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-[#008fe5] focus:ring-2 focus:ring-blue-100 transition"
                  />
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
                    <span>Base Fare (₱{unitPrice.toLocaleString()}{isPaidUnit ? "" : ` × ${travellers}`})</span>
                    <span className="font-bold text-slate-900">₱{rawSubtotal.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-emerald-600 font-bold">
                      <span>Promo Discount ({promoResult?.code})</span>
                      <span>-₱{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-slate-600 font-medium">
                    <span>Processing Fees</span>
                    <span className="text-emerald-600 font-bold">₱0.00 (Free)</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
                    <span className="text-sm font-black text-slate-900">Total in PHP (₱)</span>
                    <span className="text-2xl font-black text-[#008fe5]">₱{totalAmount.toLocaleString()}</span>
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
                {promoResult && <p className="text-xs font-bold text-emerald-600 pl-2">✓ Promo Applied: {promoResult.description} (-₱{promoResult.discountAmount.toLocaleString()})</p>}

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
                            <span className="text-[10px] text-slate-500 font-medium block">Balance: <strong className="text-emerald-600">PHP {walletBalance.toLocaleString()}</strong></span>
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
                      <span>Pay ₱{totalAmount.toLocaleString()} &amp; Confirm Booking</span>
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
                  <span className="font-black text-emerald-400">₱{totalAmount.toLocaleString()}</span>
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
