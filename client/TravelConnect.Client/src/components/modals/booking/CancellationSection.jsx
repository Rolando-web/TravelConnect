import { useState } from "react";
import { AlertTriangle } from "lucide-react";

export default function CancellationSection({ bookingId, onCancelConfirm }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleConfirm = async () => {
    setIsCancelling(true);
    try {
      await onCancelConfirm(bookingId);
      setConfirmCancel(false);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
      {confirmCancel ? (
        <div className="flex items-center gap-3 w-full bg-red-50 p-3 rounded-xl border border-red-200 text-xs">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <span className="text-red-700 font-semibold flex-1">Confirm cancellation &amp; payment refund request?</span>
          <button
            onClick={handleConfirm}
            disabled={isCancelling}
            className="bg-red-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-red-700"
          >
            {isCancelling ? "Cancelling..." : "Yes, Cancel Booking"}
          </button>
          <button
            onClick={() => setConfirmCancel(false)}
            className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-bold text-xs"
          >
            No
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmCancel(true)}
          className="text-red-500 hover:text-red-700 font-semibold text-xs transition"
        >
          Cancel Booking &amp; Process Refund →
        </button>
      )}
    </div>
  );
}
