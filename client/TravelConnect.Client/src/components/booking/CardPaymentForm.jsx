import { useEffect, useMemo } from "react";
import { CreditCard } from "lucide-react";

function luhn(number) {
  if (number.length < 13) return false;
  let sum = 0;
  let double = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let d = Number(number[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

function cardBrand(number) {
  if (number.startsWith("4")) return "Visa";
  if (number.startsWith("34") || number.startsWith("37")) return "Amex";
  if (number.startsWith("35")) return "JCB";
  if (number.startsWith("36") || number.startsWith("38")) return "Diners";
  if (number.startsWith("55") || (number.startsWith("5") && Number(number[1]) >= 1 && Number(number[1]) <= 5))
    return "Mastercard";
  if (number.startsWith("2")) return "Mastercard";
  if (number.startsWith("6")) return "Discover";
  return "";
}

// PayMongo's documented sandbox test cards (some are intentionally not
// Luhn-compliant in their test gateway), so they pass exactly as on the
// server. Source: https://docs.paymongo.com/docs/payment-acceptance-testing
const SANDBOX_CARDS = [
  "4343434343434345", "4571736000000075", "5123000000000002",
  "4120000000000007", "5123000000000001",
  "4200000000000018", "4300000000000017", "5100000000000198",
];

function groupDigits(digits, brand) {
  if (brand === "Amex") {
    const parts = [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)].filter(Boolean);
    return parts.join(" ");
  }
  return (digits.match(/.{1,4}/g) || []).join(" ");
}

export default function CardPaymentForm({ value, onChange, onValidation, disabled }) {
  const { cardNumber = "", expiry = "", cvc = "", holderName = "" } = value || {};

  const digits = cardNumber.replace(/\D/g, "").slice(0, 19);
  const brand = cardBrand(digits);

  const luhnOk = luhn(digits) || SANDBOX_CARDS.includes(digits);
  const monthYear = expiry.trim().match(/^(\d{2})\s*\/?\s*(\d{2})$/);
  const month = monthYear ? Number(monthYear[1]) : 0;
  const yy = monthYear ? Number(monthYear[2]) : 0;
  const expiryYear = 2000 + yy;
  const expOk =
    monthYear !== null &&
    month >= 1 && month <= 12 &&
    yy >= 0 &&
    (expiryYear > new Date().getFullYear() ||
      (expiryYear === new Date().getFullYear() && month >= new Date().getMonth() + 1));

  const cvcOk = /^\d+$/.test(cvc) && cvc.length === (brand === "Amex" ? 4 : 3);
  const holderOk = holderName.trim().length >= 2;
  const valid = luhnOk && expOk && cvcOk && holderOk;

  useEffect(() => {
    onValidation?.({ valid, brand });
  }, [valid, brand, onValidation]);

  const fields = useMemo(
    () => [
      {
        key: "cardNumber",
        label: "Card number",
        placeholder: "4242 4242 4242 4242",
        value: groupDigits(digits, brand),
        inputMode: "numeric",
        autoComplete: "cc-number",
        maxLength: brand === "Amex" ? 18 : 19,
        onChange: (v) => onChange("cardNumber", v.replace(/[^\d\s]/g, "")),
        errorPasses: luhnOk,
      },
      {
        key: "expiry",
        label: "Expiry",
        placeholder: "00 / 00",
        value: expiry,
        inputMode: "numeric",
        autoComplete: "cc-exp",
        maxLength: 5,
        onChange: (v) => {
          const clean = v.replace(/\D/g, "").slice(0, 4);
          onChange("expiry", clean.length > 2 ? `${clean.slice(0, 2)} / ${clean.slice(2)}` : clean);
        },
        errorPasses: expOk,
      },
      {
        key: "cvc",
        label: brand === "Amex" ? "CVV (4 digits)" : "CVV",
        placeholder: brand === "Amex" ? "1234" : "123",
        value: cvc,
        inputMode: "numeric",
        autoComplete: "cc-csc",
        maxLength: 4,
        onChange: (v) => onChange("cvc", v.replace(/\D/g, "")),
        errorPasses: cvcOk,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [digits, brand, expiry, cvc, expOk, cvcOk, luhnOk]
  );

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 p-4 space-y-3" role="group" aria-label="Card payment details">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard size={15} className="text-[#008fe5]" />
          <span className="text-[11px] font-black text-slate-700 dark:text-white uppercase tracking-wider">
            Pay with Credit / Debit Card
          </span>
        </div>
        {brand && (
          <span className="text-[10px] font-black text-white bg-slate-800 dark:bg-slate-700 px-2 py-0.5 rounded-md">
            {brand}
          </span>
        )}
      </div>

      <input
        type="text"
        value={holderName}
        disabled={disabled}
        onChange={(e) => onChange("holderName", e.target.value)}
        placeholder="Name on card"
        autoComplete="cc-name"
        aria-label="Name on card"
        className={`w-full rounded-xl border bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold outline-none transition placeholder:font-medium ${
          holderName && !holderOk
            ? "border-rose-400 focus:border-rose-500"
            : "border-slate-200 dark:border-white/10 focus:border-[#008fe5]"
        } text-slate-900 dark:text-white`}
      />

      <div className="grid grid-cols-2 gap-2.5">
        {fields.map((f) => {
          const touched = f.value.length > 0;
          return (
            <label key={f.key} className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500">{f.label}</span>
              <input
                type="text"
                inputMode={f.inputMode}
                value={f.value}
                disabled={disabled}
                onChange={(e) => f.onChange(e.target.value)}
                placeholder={f.placeholder}
                autoComplete={f.autoComplete}
                maxLength={f.maxLength}
                aria-label={f.label}
                className={`w-full rounded-xl border bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-bold tracking-wide outline-none transition placeholder:font-medium placeholder:text-slate-400 ${
                  touched && !f.errorPasses
                    ? "border-rose-400 focus:border-rose-500"
                    : "border-slate-200 dark:border-white/10 focus:border-[#008fe5]"
                } text-slate-900 dark:text-white`}
              />
            </label>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
        <span className="inline-block w-1 h-1 rounded-full bg-emerald-500" />
        Encrypted by PayMongo — your card details only travel to PayMongo, never stored here.
      </p>
    </div>
  );
}