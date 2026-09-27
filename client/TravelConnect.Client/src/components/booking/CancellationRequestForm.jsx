import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { getCancellationQuote } from "../../services/api";
import { CANCELLATION_REASONS, money, tierPresentation } from "../../data/cancellationReasons";

/**
 * Shared customer cancellation flow: loads the server-computed quote, collects
 * a reason, then hands the submit back to the caller. Every number shown here
 * comes from the API — nothing is recomputed in the browser.
 */
export default function CancellationRequestForm({
  booking,
  onSubmit,
  submitLabel = "Confirm & Refund",
  compact = false
}) {
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reasonCode, setReasonCode] = useState("change-of-plans");
  const [reasonDetail, setReasonDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadQuote = useCallback(async () => {
    setLoading(true);
    setQuoteError("");
    try {
      const data = await getCancellationQuote(booking.id, {
        referenceNumber: booking.referenceNumber,
        customerEmail: booking.customerEmail
      });
      setQuote(data);
    } catch {
      setQuote(null);
      setQuoteError("Could not load your refund estimate. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [booking.id, booking.referenceNumber, booking.customerEmail]);

  useEffect(() => {
    loadQuote();
  }, [loadQuote]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || loading) return;
    setSubmitting(true);
    try {
      await onSubmit(booking.id, { reasonCode, reason: reasonDetail.trim() });
    } finally {
      setSubmitting(false);
    }
  };

  const tier = tierPresentation(quote?.policyTier);
  // Zero-value lines are noise (a no-show quote has no fees at all).
  const breakdown = [
    ["Passenger fare", quote?.passengerFare],
    ["Airline cancellation fee", quote?.airlineCancellationFee],
    ["Agency fee", quote?.agencyFee],
    ["Payment fee", quote?.paymentFee],
  ].filter(([, value]) => Number(value || 0) > 0);

  if (loading) {
    return (
      <div className={`rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03] p-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 animate-pulse ${compact ? "" : "text-xs"}`}>
        Calculating your refund estimate…
      </div>
    );
  }

  if (quoteError) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300 space-y-2">
        <p className="font-semibold flex items-center gap-2">
          <AlertTriangle size={14} /> {quoteError}
        </p>
        <button type="button" onClick={loadQuote} className="font-bold underline underline-offset-2">
          Retry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${tier.cls}`}>
        <span className="font-bold flex items-center gap-2">
          <ShieldCheck size={14} />
          {tier.label}
        </span>
        <span className="font-mono font-black text-sm">
          {money(quote?.refundAmount)}
        </span>
      </div>

      {quote?.requiresApproval && (
        <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
          Your booking is still confirmed while our team reviews the request. A refund is
          released only if the request is approved.
        </p>
      )}

      {breakdown.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-xs space-y-2">
          {breakdown.map(([label, value], index) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">{label}</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {index === 0 ? money(value) : `- ${money(value)}`}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/[0.06] pt-2">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {quote?.refundMethod === "travel-credit" ? "Travel credit" : "Estimated refund"}
            </span>
            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
              {money(quote?.refundAmount)}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor={`cancel-reason-${booking.id}`} className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          Reason for cancelling
        </label>
        <select
          id={`cancel-reason-${booking.id}`}
          value={reasonCode}
          onChange={(e) => setReasonCode(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0f1422] px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
        >
          {CANCELLATION_REASONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {reasonCode === "other" && (
        <div className="space-y-1.5">
          <label htmlFor={`cancel-detail-${booking.id}`} className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Tell us more
          </label>
          <textarea
            id={`cancel-detail-${booking.id}`}
            value={reasonDetail}
            onChange={(e) => setReasonDetail(e.target.value)}
            required
            rows={2}
            className="w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0f1422] px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 resize-none"
          />
        </div>
      )}

      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Booking Ref:</span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{booking.referenceNumber || booking.id}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Refunds go to:</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">Original payment method</span>
        </div>
        {quote?.expiresAt && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Estimate valid until:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {new Date(quote.expiresAt).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          disabled={submitting}
          onClick={loadQuote}
          className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-xs font-semibold transition"
        >
          Refresh
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-md flex items-center justify-center gap-1.5"
        >
          {submitting ? "Processing..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

export function CancellationOutcome({ outcome, onClose }) {
  if (!outcome) return null;
  const approved = !outcome.requiresApproval;
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2 text-xs">
      <p className="font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
        {approved ? <CheckCircle2 size={16} /> : <Clock size={16} />}
        {approved ? "Cancellation confirmed" : "Cancellation requested"}
      </p>
      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{outcome.message}</p>
      {outcome.refundAmount > 0 && (
        <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
          {money(outcome.refundAmount)}
        </p>
      )}
      {outcome.refundReference && (
        <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
          Ref {outcome.refundReference}
        </p>
      )}
      {onClose && (
        <button type="button" onClick={onClose} className="font-bold underline underline-offset-2">
          Close
        </button>
      )}
    </div>
  );
}
