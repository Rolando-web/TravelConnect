import { Tag, CheckCircle, AlertCircle, Smartphone, Wallet } from "lucide-react";
import { useCurrency } from "../../../context/CurrencyContext";

const WALLET_OPTIONS = [
  { key: "gcash", label: "GCash", desc: "Pay with your GCash wallet", Icon: Smartphone, accent: "from-blue-500 to-cyan-500" },
  { key: "paymaya", label: "PayMaya", desc: "Pay with your Maya wallet", Icon: Wallet, accent: "from-indigo-500 to-purple-500" }
];

export default function PromoPaymentStep({
  promoInput,
  setPromoInput,
  handleApplyPromo,
  validatingPromo,
  promoResult,
  promoError,
  paymentMethod,
  setPaymentMethod,
  travellers,
  rawSubtotal,
  discountAmount,
  totalAmount
}) {
  const { displayPrice } = useCurrency();
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
            <CheckCircle size={13} /> Code {promoResult.code} applied! ({promoResult.description}) - Save {displayPrice(promoResult.discountAmount)}
          </p>
        )}

        {promoError && (
          <p className="mt-2 text-xs font-semibold text-red-500 flex items-center gap-1">
            <AlertCircle size={13} /> {promoError}
          </p>
        )}
      </div>

      {/* E-Wallet Payment Method Selector */}
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-2">Select Payment Method</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WALLET_OPTIONS.map(({ key, label, desc, Icon, accent }) => {
            const active = paymentMethod === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPaymentMethod(key)}
                className={`relative p-4 rounded-2xl border text-left transition flex items-center gap-3 ${
                  active
                    ? "border-[#008fe5] bg-blue-50 shadow-md ring-2 ring-[#008fe5]/30"
                    : "border-gray-200 bg-white hover:border-gray-400"
                }`}
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-white shadow`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-gray-900">{label}</p>
                  <p className="text-[11px] text-gray-500">{desc}</p>
                </div>
                <div
                  className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    active ? "border-[#008fe5]" : "border-gray-300"
                  }`}
                >
                  {active && <div className="w-2.5 h-2.5 rounded-full bg-[#008fe5]" />}
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-gray-400 flex items-center gap-1">
          <Smartphone size={12} /> You will be redirected to {paymentMethod === "paymaya" ? "Maya" : "GCash"} to securely authorize your payment.
        </p>
      </div>

      {/* Price Breakdown */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2 text-xs">
        <div className="flex justify-between text-gray-300">
          <span>Package Price ({travellers} Traveler{travellers > 1 ? "s" : ""})</span>
          <span>{displayPrice(rawSubtotal)}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-green-400 font-semibold">
            <span>Promotion Discount ({promoResult?.code})</span>
            <span>-{displayPrice(discountAmount)}</span>
          </div>
        )}

        <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-extrabold text-white">
          <span>Total Payment Transaction</span>
          <span className="text-[#008fe5]">{displayPrice(totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}
