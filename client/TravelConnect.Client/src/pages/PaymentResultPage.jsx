import { useEffect } from "react";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";

// Landing page for PayMongo redirects (hosted checkout + card 3-D Secure).
// It runs inside the payment popup: after the bank/e-wallet flow PayMongo
// sends the user here, the opener tab keeps polling the payment backend so
// the booking continues in the main window. This page only finishes the
// popup side of the loop.
export default function PaymentResultPage() {
  useEffect(() => {
    if (document.referrer && window.opener) {
      try {
        window.opener.focus();
      } catch {
        /* cross-origin popup — ignore */
      }
    }
  }, []);

  const params = new URLSearchParams(window.location.search);
  const ok = (params.get("status") || "").toLowerCase() === "success";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl p-8 text-center">
        {ok ? (
          <>
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white">Payment Complete</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Your payment went through. You can close this window and finish up in the main tab.
            </p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center mx-auto mb-4">
              <XCircle size={28} className="text-rose-500" />
            </div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white">Payment Not Completed</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              The payment was cancelled or interrupted. Close this window and go back to the main tab — nothing was charged.
            </p>
          </>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-semibold">
          <RefreshCw size={13} className="animate-pulse" />
          The main window is still confirming your booking…
        </div>

        <button
          onClick={() => window.close()}
          className="mt-5 w-full bg-slate-900 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-3 rounded-xl text-sm transition cursor-pointer"
        >
          Close Window
        </button>
      </div>
    </div>
  );
}