import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MapPin, Calendar, Users, CreditCard, Ban, BadgeCheck, CalendarClock,
  ArrowRight, Globe, Lock, FileText, RotateCcw, AlertTriangle, ShieldCheck, CheckCircle2, Sparkles, X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBooking } from "../context/BookingContext";
import { useCurrency } from "../context/CurrencyContext";

/* ─── Status helpers ─────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  upcoming:  { label: "Upcoming & Active", color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  completed: { label: "Completed Trip",   color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled",        color: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-400" },
  refunded:  { label: "Cancelled & 100% Refunded", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};

const TABS = ["upcoming", "refunded", "completed", "all"];

/* ═══════════════════════════════════════════════════════════════════════
   LOGIN GATE — centered sign-in prompt (opens modal)
══════════════════════════════════════════════════════════════════════ */
function LoginGate() {
  const { openLoginModal } = useAuth();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 px-4 py-16 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-blue-200/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-56 h-56 rounded-full bg-indigo-200/30 blur-2xl pointer-events-none" />

      <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white px-8 sm:px-12 py-12 flex flex-col items-center text-center max-w-md w-full">
        <div className="w-16 h-16 rounded-2xl bg-[#008fe5] flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6">
          <Lock size={28} className="text-white" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">My Travel Bookings</h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          Sign in to view, manage, download e-tickets, or process 1-click instant refunds on your reservations.
        </p>

        <button
          onClick={openLoginModal}
          className="w-full bg-[#008fe5] hover:bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/25 hover:-translate-y-0.5 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          Sign In to Access Bookings <ArrowRight size={16} />
        </button>

        <div className="flex items-center gap-3 my-6 w-full">
          <div className="flex-1 border-t border-slate-200" />
          <span className="text-slate-400 text-xs font-bold uppercase">or</span>
          <div className="flex-1 border-t border-slate-200" />
        </div>

        <Link
          to="/explore"
          className="text-xs font-extrabold text-[#008fe5] hover:underline flex items-center gap-1"
        >
          <Globe size={14} /> Explore destinations &amp; flight deals first
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   BOOKING CARD
═══════════════════════════════════════════════════════════════════════ */
function BookingCard({ booking, onViewDetails, onRequestCancel }) {
  const { displayPrice } = useCurrency();
  const isRefunded = booking.status === "refunded" || booking.status === "cancelled";
  const st = STATUS_CONFIG[booking.status] || STATUS_CONFIG.upcoming;
  const bookingAmount = booking.amount || booking.totalAmount || 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col sm:flex-row">
      {/* Thumbnail */}
      <div className="relative w-full sm:w-44 h-44 sm:h-auto flex-shrink-0 bg-slate-100">
        <img
          src={booking.img || "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=600&q=80"}
          alt={booking.name || booking.packageName}
          className="w-full h-full object-cover"
        />
        {booking.paid && (
          <span className="absolute bottom-2 left-2 bg-emerald-500/90 backdrop-blur-sm text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
            PAID &amp; CONFIRMED
          </span>
        )}
        {isRefunded && (
          <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md">
            100% REFUNDED
          </span>
        )}
      </div>

      {/* Info & Details */}
      <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1.5 justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-900 text-base sm:text-lg leading-tight">
                {booking.name || booking.packageName}
              </h3>
            </div>
            <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${st.color}`}>
              {st.label}
            </span>
          </div>

          <p className="text-slate-500 text-xs font-semibold flex items-center gap-1 mb-3">
            <MapPin size={12} className="text-[#008fe5]" /> {booking.location || "Philippines"}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
              <Calendar size={13} className="text-[#008fe5]" /> {booking.startDate || "Flexible Dates"}
            </span>
            <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
              <Users size={13} className="text-[#008fe5]" /> {booking.travellers || 1} traveler{booking.travellers > 1 ? "s" : ""}
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              Ref: <strong className="text-slate-700">{booking.id || booking.referenceNumber}</strong>
            </span>
          </div>

          {/* Refund Notice Banner if Refunded */}
          {isRefunded && (
            <div className="mt-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl p-2.5 flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span className="font-bold">Refund of {displayPrice(bookingAmount)} credited back.</span>
              </div>
              <span className="font-mono text-[10px] font-bold text-emerald-700">{booking.refundReference || "RFND-PROCESSED"}</span>
            </div>
          )}
        </div>

        {/* Pricing and Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900">{displayPrice(bookingAmount)}</span>
            </div>
            <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
              <CreditCard size={11} /> {booking.paymentMethod?.toUpperCase() || "GCASH"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewDetails(booking)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileText size={14} /> View E-Voucher
            </button>

            {booking.status === "upcoming" && (
              <button
                onClick={() => onRequestCancel(booking)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-black px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={14} /> Cancel &amp; Refund
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   BOOKINGS DASHBOARD (shown when authenticated)
═══════════════════════════════════════════════════════════════════════ */
function BookingsDashboard() {
  const { user } = useAuth();
  const { bookings, cancelBookingTransaction, openBookingDetailsModal, walletBalance } = useBooking();
  const { displayPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState("upcoming");
  
  // Quick cancel & refund modal state
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancellingInProgress, setCancellingInProgress] = useState(false);
  const [refundSuccessData, setRefundSuccessData] = useState(null);

  const upcomingCount = bookings.filter((b) => b.status === "upcoming").length;
  const refundedCount = bookings.filter((b) => b.status === "refunded" || b.status === "cancelled").length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;

  const visible = bookings.filter((b) => {
    if (activeTab === "all") return true;
    if (activeTab === "refunded") return b.status === "refunded" || b.status === "cancelled";
    return b.status === activeTab;
  });

  const handleConfirmCancelAndRefund = async () => {
    if (!cancelModalBooking) return;
    setCancellingInProgress(true);
    try {
      const res = await cancelBookingTransaction(cancelModalBooking.id, "User requested refund");
      setCancellingInProgress(false);
      setRefundSuccessData({
        ...cancelModalBooking,
        refundReference: res.refundReference,
        refundAmount: res.refundAmount || cancelModalBooking.amount || cancelModalBooking.totalAmount || 0,
        newWalletBalance: res.newWalletBalance,
      });
      setCancelModalBooking(null);
    } catch {
      setCancellingInProgress(false);
      alert("Failed to cancel booking. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Page header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] text-[#008fe5] bg-blue-50 px-3 py-1 rounded-full border border-blue-100 mb-2">
            <Sparkles size={13} /> Self-Service Travel Hub
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">My Bookings &amp; Tickets</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your booked flights, hotel stays, and car rentals. Cancel and receive 100% automatic refunds with a single click.
          </p>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`rounded-3xl p-5 border text-left transition-all ${
              activeTab === "upcoming"
                ? "bg-white border-[#008fe5] ring-2 ring-blue-200 shadow-lg"
                : "bg-white border-slate-200/80 hover:border-slate-300 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-slate-400 uppercase">Active / Upcoming</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#008fe5] flex items-center justify-center">
                <CalendarClock size={16} />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900">{upcomingCount}</p>
            <p className="text-xs font-bold text-[#008fe5] mt-1">Ready for Travel</p>
          </button>

          <button
            onClick={() => setActiveTab("refunded")}
            className={`rounded-3xl p-5 border text-left transition-all ${
              activeTab === "refunded"
                ? "bg-white border-emerald-500 ring-2 ring-emerald-200 shadow-lg"
                : "bg-white border-slate-200/80 hover:border-slate-300 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-slate-400 uppercase">Refunded &amp; Cancelled</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <RotateCcw size={16} />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900">{refundedCount}</p>
            <p className="text-xs font-bold text-emerald-600 mt-1">100% Funds Returned</p>
          </button>

          <button
            onClick={() => setActiveTab("completed")}
            className={`rounded-3xl p-5 border text-left transition-all ${
              activeTab === "completed"
                ? "bg-white border-[#008fe5] ring-2 ring-blue-200 shadow-lg"
                : "bg-white border-slate-200/80 hover:border-slate-300 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-slate-400 uppercase">Completed Trips</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <BadgeCheck size={16} />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900">{completedCount}</p>
            <p className="text-xs font-bold text-slate-400 mt-1">Past Adventures</p>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: "upcoming", label: "Upcoming", count: upcomingCount },
            { id: "refunded", label: "Cancelled & Refunded", count: refundedCount },
            { id: "completed", label: "Completed", count: completedCount },
            { id: "all", label: "All Records", count: bookings.length },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black border transition ${
                activeTab === t.id
                  ? "bg-[#008fe5] text-white border-[#008fe5] shadow-md shadow-blue-500/20"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {visible.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-[#008fe5] rounded-3xl flex items-center justify-center mx-auto">
              <Globe size={28} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">No {activeTab} bookings found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Your flight, car, and hotel reservations will automatically appear here once booked.
              </p>
            </div>
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 bg-[#008fe5] hover:bg-blue-600 text-white font-black px-6 py-3 rounded-xl shadow-lg shadow-blue-500/20 text-xs transition"
            >
              <span>Explore Flights &amp; Destinations</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onViewDetails={openBookingDetailsModal}
                onRequestCancel={(b) => setCancelModalBooking(b)}
              />
            ))}
          </div>
        )}

      </div>

      {/* ── EASY 1-CLICK CANCEL & REFUND CONFIRMATION MODAL ───────────────────── */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
              <button
                onClick={() => setCancelModalBooking(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">Cancel &amp; Request 100% Refund?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                You are about to cancel: <strong className="text-slate-800">{cancelModalBooking.name || cancelModalBooking.packageName}</strong>.
              </p>
            </div>

            {/* Refund Calculation Box */}
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 space-y-2 text-xs text-emerald-900">
              <div className="flex items-center justify-between">
                <span className="font-bold">Original Paid Amount:</span>
                <span className="font-black text-sm">{displayPrice(cancelModalBooking.amount || cancelModalBooking.totalAmount || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold">Cancellation Penalty / Fee:</span>
                <span className="font-black text-emerald-600">{displayPrice(0)} (Zero Fee)</span>
              </div>
              <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-sm">
                <span className="font-black">Total Refund Credited:</span>
                <span className="font-black text-emerald-600 text-base">{displayPrice(cancelModalBooking.amount || cancelModalBooking.totalAmount || 0)}</span>
              </div>
              <p className="text-[11px] text-emerald-700 pt-1">
                ✓ Funds will be returned instantly to your <strong>{cancelModalBooking.paymentMethod?.toUpperCase() || "GCASH"}</strong> account.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelAndRefund}
                disabled={cancellingInProgress}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-3 rounded-xl text-xs shadow-lg shadow-rose-500/25 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {cancellingInProgress ? "Refunding..." : "Confirm & Refund"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── REFUND SUCCESS MODAL ──────────────────────────────────────────────── */}
      {refundSuccessData && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                Refund Processed Successfully
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-2">
                {displayPrice(refundSuccessData.refundAmount || 0)} credited to your{" "}
                <span className="text-amber-600">TravelConnect Money</span> wallet.
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {refundSuccessData.name || refundSuccessData.packageName || "Your booking"} has been cancelled
                and the refund has been added to your TravelConnect Money balance.
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 space-y-2 text-xs text-emerald-900 text-left">
              <div className="flex items-center justify-between">
                <span className="font-bold">Refund Reference:</span>
                <span className="font-mono font-black">{refundSuccessData.refundReference || "RFND-PROCESSED"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold">Credited Amount:</span>
                <span className="font-black text-emerald-600">{displayPrice(refundSuccessData.refundAmount || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold">New Wallet Balance:</span>
                <span className="font-black text-emerald-600">{displayPrice(refundSuccessData.newWalletBalance ?? walletBalance ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold">Status:</span>
                <span className="font-black text-emerald-600">Instant 100% Refund</span>
              </div>
            </div>

            <button
              onClick={() => setRefundSuccessData(null)}
              className="w-full bg-[#008fe5] hover:bg-blue-600 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 transition text-sm cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN EXPORT — conditional render based on auth
══════════════════════════════════════════════════════════════════════ */
export default function Bookings() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <BookingsDashboard /> : <LoginGate />;
}
