// The reason codes the customer picks from. Mirrors the free-text detail the
// API stores alongside the code, and keeps staff reporting (why do people
// cancel?) answerable.
export const CANCELLATION_REASONS = [
  { value: "change-of-plans", label: "Change of plans" },
  { value: "emergency", label: "Family or personal emergency" },
  { value: "illness", label: "Illness or medical" },
  { value: "weather", label: "Weather or flight disruption" },
  { value: "double-booked", label: "Booked by mistake / double booking" },
  { value: "better-price", label: "Found a better price" },
  { value: "other", label: "Other reason" },
];

// How each policy tier is presented to a customer. The server owns the
// decision; these are only labels.
export function tierPresentation(tier) {
  switch (tier) {
    case "grace":
      return {
        label: "Full refund (grace period)",
        cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
      };
    case "early":
      return {
        label: "Early cancellation refund",
        cls: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
      };
    case "late":
      return {
        label: "Late cancellation (staff review)",
        cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
      };
    case "non-refundable":
      return {
        label: "Non-refundable fare",
        cls: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
      };
    case "no-show":
      return {
        label: "Departure already passed",
        cls: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
      };
    default:
      return {
        label: "Manual review",
        cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
      };
  }
}

export const money = (v) =>
  `₱${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
