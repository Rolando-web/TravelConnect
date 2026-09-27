import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import CancellationRequestForm, { CancellationOutcome } from "../../booking/CancellationRequestForm";

export default function CancellationSection({ booking, onCancelConfirm }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (bookingId, payload) => {
    setError("");
    try {
      const result = await onCancelConfirm(bookingId, payload);
      setOutcome(result);
      setConfirmCancel(false);
    } catch (err) {
      setError(err?.message || "Could not submit the cancellation request. Please try again.");
    }
  };

  return (
    <div className="border-t border-gray-100 pt-4 space-y-3">
      {outcome ? (
        <CancellationOutcome outcome={outcome} onClose={() => setOutcome(null)} />
      ) : confirmCancel ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 w-full bg-red-50 p-3 rounded-xl border border-red-200 text-xs">
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
            <span className="text-red-700 font-semibold flex-1">Cancel this booking?</span>
            <button
              onClick={() => setConfirmCancel(false)}
              className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-bold text-xs"
            >
              Keep Booking
            </button>
          </div>
          <CancellationRequestForm
            booking={booking}
            onSubmit={handleSubmit}
            submitLabel="Yes, Cancel Booking"
            compact
          />
          {error && <p className="text-[11px] font-semibold text-red-600">{error}</p>}
        </div>
      ) : (
        <button
          onClick={() => setConfirmCancel(true)}
          className="text-red-500 hover:text-red-700 font-semibold text-xs transition"
        >
          Cancel Booking &amp; Request Refund →
        </button>
      )}
    </div>
  );
}
