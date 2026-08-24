import { Tag, CheckCircle, AlertCircle, CreditCard } from "lucide-react";

export default function PromoPaymentStep({
  promoInput,
  setPromoInput,
  handleApplyPromo,
  validatingPromo,
  promoResult,
  promoError,
  paymentMethod,
  setPaymentMethod,
  cardNumber,
  setCardNumber,
  cardExpiry,
  setCardExpiry,
  cardCvc,
  setCardCvc,
  travellers,
  rawSubtotal,
  discountAmount,
  totalAmount
}) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Promo Code Input */}
      <div className="bg-slate-50 border border-gray-200 rounded-2xl p-4">
        <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
          <Tag size={14} className="text-[#008fe5]" /> Apply Promo Code or Voucher
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            placeholder="e.g. SUMMER26, WELCOME50, HONEYMOON"
            className="flex-1 px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold uppercase tracking-wider outline-none focus:border-[#008fe5]"
          />
          <button
            type="button"
            onClick={() => handleApplyPromo()}
            disabled={validatingPromo}
            className="bg-[#008fe5] hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition"
          >
            {validatingPromo ? "Validating..." : "Apply"}
          </button>
        </div>

        {promoResult && (
          <p className="mt-2 text-xs font-semibold text-green-600 flex items-center gap-1">
            <CheckCircle size={13} /> Code {promoResult.code} applied! ({promoResult.description}) - Save ₱{promoResult.discountAmount}
          </p>
        )}

        {promoError && (
          <p className="mt-2 text-xs font-semibold text-red-500 flex items-center gap-1">
            <AlertCircle size={13} /> {promoError}
          </p>
        )}
      </div>

      {/* Payment Method Selector */}
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Select Payment Method</label>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {["Credit Card", "GCash / Maya", "Instalments"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPaymentMethod(m)}
              className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                paymentMethod === m
                  ? "bg-slate-900 text-white border-slate-900 shadow-md"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              <CreditCard size={14} /> {m}
            </button>
          ))}
        </div>

        {/* Card Fields */}
        {paymentMethod === "Credit Card" && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Card Number</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono font-bold bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Expires</label>
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono font-bold bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">CVC / CVV</label>
                <input
                  type="password"
                  maxLength={4}
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono font-bold bg-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Price Breakdown */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2 text-xs">
        <div className="flex justify-between text-gray-300">
          <span>Package Price ({travellers} Traveler{travellers > 1 ? "s" : ""})</span>
          <span>₱{rawSubtotal.toLocaleString()}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-green-400 font-semibold">
            <span>Promotion Discount ({promoResult?.code})</span>
            <span>-₱{discountAmount.toLocaleString()}</span>
          </div>
        )}

        <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-extrabold text-white">
          <span>Total Payment Transaction</span>
          <span className="text-[#008fe5]">₱{totalAmount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
