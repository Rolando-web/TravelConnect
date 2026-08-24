import { useState, useEffect } from "react";
import { X, Check, CreditCard, Shield, ArrowRight, RefreshCw } from "lucide-react";
import { useBooking } from "../../../context/BookingContext";
import { useAuth } from "../../../context/AuthContext";
import { sendCustomerInquiry } from "../../../services/api";

import ServiceBreakdownStep from "./ServiceBreakdownStep";
import TravelerInfoStep from "./TravelerInfoStep";
import PromoPaymentStep from "./PromoPaymentStep";
import TransactionReceiptStep from "./TransactionReceiptStep";

export default function BookingCheckoutModal() {
  const {
    checkoutModalOpen,
    checkoutPackage,
    appliedPromo,
    closeCheckoutModal,
    processAndCreateBooking,
    validatePromoCode
  } = useBooking();

  const { user } = useAuth();

  const [step, setStep] = useState(1); // 1: Services & Dates, 2: Guest & Inquiry, 3: Promo & Payment, 4: Receipt

  // Form State
  const [travellers, setTravellers] = useState(2);
  const [startDate, setStartDate] = useState("2026-09-15");
  const [endDate, setEndDate] = useState("2026-09-22");

  const [guestName, setGuestName] = useState(user?.name || "Jane Doe");
  const [guestEmail, setGuestEmail] = useState(user?.email || "jane@example.com");
  const [guestPhone, setGuestPhone] = useState("+1 (555) 234-5678");
  const [specialRequests, setSpecialRequests] = useState("");

  const [promoInput, setPromoInput] = useState(appliedPromo || "");
  const [promoResult, setPromoResult] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [validatingPromo, setValidatingPromo] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("Credit Card");
  const [cardNumber, setCardNumber] = useState("4532 •••• •••• 8821");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("382");

  const [isProcessing, setIsProcessing] = useState(false);
  const [completedBooking, setCompletedBooking] = useState(null);

  useEffect(() => {
    if (checkoutModalOpen) {
      setStep(1);
      setIsProcessing(false);
      setCompletedBooking(null);

      if (user) {
        if (user.name) setGuestName(user.name);
        if (user.email) setGuestEmail(user.email);
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

  const rawSubtotal = unitPrice * travellers;
  const discountAmount = promoResult ? promoResult.discountAmount : 0;
  const totalAmount = Math.max(0, rawSubtotal - discountAmount);

  const services = checkoutPackage.services || {
    flight: `${checkoutPackage.name || checkoutPackage.title} Direct Express Flight (Roundtrip Included)`,
    hotel: `Luxury Resort Stay in ${checkoutPackage.location || checkoutPackage.name} (${checkoutPackage.duration || "7 Days"})`,
    car: "Full SUV Rental with Unlimited Mileage & Insurance",
    activities: "Guided City Tour, VIP Cultural Experience, Included Activity Pass"
  };

  const handleApplyPromo = async (codeToTest = promoInput) => {
    if (!codeToTest.trim()) {
      setPromoError("Please enter a valid promo code.");
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
    } catch (err) {
      setPromoError("Failed to validate promo code.");
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleCompleteTransaction = async () => {
    setIsProcessing(true);

    const bookingPayload = {
      name: checkoutPackage.name || checkoutPackage.title,
      location: checkoutPackage.location || checkoutPackage.country || "Global",
      img: checkoutPackage.img || checkoutPackage.image,
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
      services
    };

    const paymentPayload = {
      paymentMethod,
      cardNumber,
      amount: totalAmount
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
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white px-6 py-5 flex items-center justify-between border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#008fe5] flex items-center justify-center shadow-lg shadow-blue-500/30">
              <CreditCard size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">
                Complete Booking Transaction
              </h2>
              <p className="text-xs text-blue-200">
                Package: <span className="font-semibold text-white">{checkoutPackage.name || checkoutPackage.title}</span>
              </p>
            </div>
          </div>

          <button
            onClick={closeCheckoutModal}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stepper Header Navigation */}
        <div className="bg-slate-50 border-b border-gray-100 px-6 py-3 flex items-center justify-between flex-shrink-0 text-xs font-semibold text-gray-500">
          {[
            { num: 1, title: "Services & Dates" },
            { num: 2, title: "Traveler & Requests" },
            { num: 3, title: "Promo & Payment" },
            { num: 4, title: "Confirmation" }
          ].map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                    isDone
                      ? "bg-green-500 text-white"
                      : isActive
                      ? "bg-[#008fe5] text-white shadow-md shadow-blue-400/30"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {isDone ? <Check size={12} /> : s.num}
                </div>
                <span className={isActive ? "text-gray-900 font-bold" : isDone ? "text-green-600 font-medium" : "text-gray-400"}>
                  {s.title}
                </span>
                {s.num < 4 && <span className="hidden sm:inline text-gray-300 mx-1">/</span>}
              </div>
            );
          })}
        </div>

        {/* Step Content Router */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
          {step === 1 && (
            <ServiceBreakdownStep
              services={services}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              travellers={travellers}
              setTravellers={setTravellers}
            />
          )}

          {step === 2 && (
            <TravelerInfoStep
              guestName={guestName}
              setGuestName={setGuestName}
              guestEmail={guestEmail}
              setGuestEmail={setGuestEmail}
              guestPhone={guestPhone}
              setGuestPhone={setGuestPhone}
              specialRequests={specialRequests}
              setSpecialRequests={setSpecialRequests}
            />
          )}

          {step === 3 && (
            <PromoPaymentStep
              promoInput={promoInput}
              setPromoInput={setPromoInput}
              handleApplyPromo={handleApplyPromo}
              validatingPromo={validatingPromo}
              promoResult={promoResult}
              promoError={promoError}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              cardNumber={cardNumber}
              setCardNumber={setCardNumber}
              cardExpiry={cardExpiry}
              setCardExpiry={setCardExpiry}
              cardCvc={cardCvc}
              setCardCvc={setCardCvc}
              travellers={travellers}
              rawSubtotal={rawSubtotal}
              discountAmount={discountAmount}
              totalAmount={totalAmount}
            />
          )}

          {step === 4 && (
            <TransactionReceiptStep
              completedBooking={completedBooking}
              guestName={guestName}
            />
          )}
        </div>

        {/* Footer Navigation Action Controls */}
        <div className="bg-slate-50 border-t border-gray-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
          {step > 1 && step < 4 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={isProcessing}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 && (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="bg-[#008fe5] hover:bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md flex items-center gap-1.5 transition ml-auto"
            >
              Next Step <ArrowRight size={14} />
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleCompleteTransaction}
              disabled={isProcessing}
              className="bg-gradient-to-r from-[#008fe5] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold px-8 py-3 rounded-xl text-xs shadow-lg shadow-blue-500/25 flex items-center gap-2 transition disabled:opacity-50 ml-auto"
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Authorizing Payment Transaction...
                </>
              ) : (
                <>
                  Confirm &amp; Pay ${totalAmount.toLocaleString()} <Shield size={14} />
                </>
              )}
            </button>
          )}

          {step === 4 && (
            <button
              onClick={closeCheckoutModal}
              className="bg-gray-900 hover:bg-black text-white font-bold px-8 py-3 rounded-xl text-xs shadow-md transition mx-auto"
            >
              Done &amp; Close
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
