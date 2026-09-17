import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  MapPin, Calendar, Users, CreditCard, BadgeCheck, CalendarClock,
  ArrowRight, Globe, Lock, FileText, RotateCcw, ShieldCheck, CheckCircle2,
  Coins, Check, Download, Plane
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBooking } from "../context/BookingContext";
import { useCurrency } from "../context/CurrencyContext";
import { getRefundPreview, generateItineraryPdf } from "../services/api";

/* ─── Status helpers ─────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  upcoming: { label: "Active & Confirmed", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20", dot: "bg-emerald-500" },
  completed: { label: "Completed Journey", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20", dot: "bg-blue-500" },
  cancelled: { label: "Cancelled", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20", dot: "bg-slate-400" },
  refunded: { label: "100% Refunded", color: "bg-sky-500/10 text-[#008fe5] dark:text-[#38bdf8] border-sky-500/20", dot: "bg-[#008fe5]" },
};

/* ═══════════════════════════════════════════════════════════════════════
   LOGIN GATE — minimal luxury sign-in invitation
══════════════════════════════════════════════════════════════════════ */
function LoginGate() {
  const { openLoginModal } = useAuth();

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-16">
      <div className="relative bg-white dark:bg-[#0f1422] rounded-3xl shadow-xl dark:shadow-2xl border border-slate-200/80 dark:border-white/[0.08] px-8 sm:px-12 py-12 flex flex-col items-center text-center max-w-md w-full">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#008fe5] to-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6">
          <Lock size={26} />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-sky-500/10 text-[#008fe5] dark:text-[#38bdf8] border border-sky-500/25 mb-3 font-bold">
          <BadgeCheck size={12} /> Private Concierge Hub
        </div>

        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white mb-2">
          My Itineraries &amp; Bookings
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed mb-8">
          Sign in to view your verified hotel vouchers, flight e-tickets, chauffeur passes, or process 1-click automatic refunds.
        </p>

        <button
          onClick={openLoginModal}
          className="w-full bg-[#008fe5] hover:bg-blue-600 text-slate-950 font-bold py-4 rounded-2xl shadow-md hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
        >
          Sign In to Access Itineraries <ArrowRight size={15} />
        </button>

        <div className="flex items-center gap-3 my-6 w-full">
          <div className="flex-1 border-t border-slate-200 dark:border-white/[0.08]" />
          <span className="text-slate-400 text-[10px] font-mono uppercase tracking-widest">or</span>
          <div className="flex-1 border-t border-slate-200 dark:border-white/[0.08]" />
        </div>

        <Link
          to="/hotels"
          className="text-xs font-semibold text-[#008fe5] dark:text-[#38bdf8] hover:underline flex items-center gap-1.5"
        >
          <Globe size={14} /> Discover luxury sanctuaries &amp; bespoke retreats
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   VOUCHER CARD — minimal luxury architectural ticket
═══════════════════════════════════════════════════════════════════════ */
function BookingVoucherCard({ booking, onViewDetails, onRequestCancel, onDownloadPdf, downloadingRef }) {
  const { displayPrice } = useCurrency();
  const isRefunded = booking.status === "refunded" || booking.status === "cancelled";
  const st = STATUS_CONFIG[booking.status] || STATUS_CONFIG.upcoming;
  const bookingAmount = booking.amount || booking.totalAmount || 0;
  const flightSegments = Array.isArray(booking.bookingFlights) ? booking.bookingFlights : [];
  const seatCount = flightSegments.filter((f) => f.seatNumber).length;
  const isDownloading = downloadingRef === (booking.id || booking.referenceNumber);

  return (
    <div className="group relative rounded-3xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-white/[0.08] hover:border-amber-400/40 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col sm:flex-row">
      {/* Visual Thumbnail */}
      <div className="relative w-full sm:w-48 h-48 sm:h-auto flex-shrink-0 bg-slate-100 dark:bg-[#0a0e17]">
        <img
          src={booking.img || "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=600&q=80"}
          alt={booking.name || booking.packageName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 sm:opacity-0" />

        {booking.paid && (
          <span className="absolute bottom-3 left-3 bg-emerald-600/90 backdrop-blur-md text-white text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm font-bold">
            CONFIRMED
          </span>
        )}

        {isRefunded && (
          <span className="absolute top-3 left-3 bg-amber-500 text-slate-950 text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md font-bold">
            100% REFUNDED
          </span>
        )}
      </div>

      {/* Itinerary Details */}
      <div className="flex-1 p-6 flex flex-col justify-between gap-5">
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700 dark:text-amber-400 font-bold block mb-0.5">
                {booking.category?.toUpperCase() || "TRAVEL PACKAGE"} · ITINERARY VOUCHER
              </span>
              <h3 className="font-heading text-lg sm:text-xl font-bold text-slate-950 dark:text-white leading-tight">
                {booking.name || booking.packageName}
              </h3>
            </div>
            <span className={`text-[10px] font-mono uppercase tracking-wider px-3 py-1 rounded-full border whitespace-nowrap font-bold ${st.color}`}>
              {st.label}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-3 font-normal">
            <MapPin size={13} className="text-amber-500 shrink-0" />
            <span>{booking.location || "Philippines"}</span>
          </p>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/[0.04] px-3 py-1 rounded-xl text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-white/[0.06]">
              <Calendar size={13} className="text-amber-500" /> {booking.startDate || "Confirmed Schedule"}
            </span>
            <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/[0.04] px-3 py-1 rounded-xl text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-white/[0.06]">
              <Users size={13} className="text-amber-500" /> {booking.travellers || 1} Guest{booking.travellers > 1 ? "s" : ""}
            </span>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 ml-auto">
              REF: <strong className="text-slate-800 dark:text-slate-200">{booking.id || booking.referenceNumber}</strong>
            </span>
          </div>

          {/* Live Ticket Strip: confirmed seat numbers & flight status */}
          {flightSegments.length > 0 && (
            <div className="mt-4 rounded-2xl border border-slate-200/70 dark:border-white/[0.06] overflow-hidden">
              {flightSegments.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-50/70 dark:bg-white/[0.02] border-b border-slate-200/50 dark:border-white/[0.04] last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Plane size={13} className="text-[#008fe5] shrink-0" />
                    <span className="truncate">
                      {f.airline} {f.flightNumber} · {f.departureCity} → {f.arrivalCity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {f.seatNumber ? (
                      <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg font-mono font-black">
                        SEAT {f.seatNumber}
                      </span>
                    ) : (
                      <span className="bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-lg font-mono">
                        SEAT AT CHECK-IN
                      </span>
                    )}
                    <span className="bg-blue-500/10 text-[#008fe5] dark:text-[#38bdf8] border border-blue-500/20 px-2 py-0.5 rounded-lg font-black uppercase">
                      On Time
                    </span>
                  </div>
                </div>
              ))}
              {seatCount > 0 && (
                <div className="px-3.5 py-1.5 bg-emerald-500/5 text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">
                  ✓ {seatCount} confirmed seat{seatCount > 1 ? "s" : ""} assigned
                </div>
              )}
            </div>
          )}

          {/* Refund Notice Banner */}
          {isRefunded && (
            <div className="mt-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-3 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                <span className="font-semibold">Full refund of {displayPrice(bookingAmount)} credited to TravelConnect Money.</span>
              </div>
              <span className="font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-300">{booking.refundReference || "RFND-PROCESSED"}</span>
            </div>
          )}
        </div>

        {/* Pricing & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 pt-4 border-t border-slate-200/80 dark:border-white/[0.06]">
          <div className="text-center sm:text-left w-full sm:w-auto">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Total Investment</span>
            <div className="flex items-baseline justify-center sm:justify-start gap-1">
              <span className="font-heading text-2xl font-bold text-slate-950 dark:text-white">
                {displayPrice(bookingAmount)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center justify-center sm:justify-start gap-1 mt-0.5 font-mono">
              <CreditCard size={11} /> {booking.paymentMethod?.toUpperCase() || "GCASH / CARD"}
            </p>
          </div>

          <div className="w-full sm:w-auto flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => onDownloadPdf(booking)}
              disabled={isDownloading}
              className="flex-1 sm:flex-initial bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap min-w-[110px]"
            >
              {isDownloading ? (
                <>
                  <Check size={14} /> Saving…
                </>
              ) : (
                <>
                  <Download size={14} /> PDF Ticket
                </>
              )}
            </button>
            <button
              onClick={() => onViewDetails(booking)}
              className="flex-1 sm:flex-initial bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap min-w-[120px]"
            >
              <FileText size={14} /> View E-Voucher
            </button>

            {booking.status === "upcoming" && (
              <button
                onClick={() => onRequestCancel(booking)}
                className="w-full sm:w-auto flex-1 sm:flex-initial bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20 text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap min-w-[120px]"
              >
                <RotateCcw size={14} /> 1-Click Refund
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN BOOKINGS DASHBOARD
═══════════════════════════════════════════════════════════════════════ */
function BookingsDashboard() {
  const { bookings, cancelBookingTransaction, openBookingDetailsModal, walletBalance } = useBooking();
  const { displayPrice } = useCurrency();

  const [activeTab, setActiveTab] = useState("upcoming");
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancellingInProgress, setCancellingInProgress] = useState(false);
  const [refundSuccessData, setRefundSuccessData] = useState(null);
  const [refundPreview, setRefundPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadingRef, setDownloadingRef] = useState(null);
  const [actionNotice, setActionNotice] = useState("");

  // Auto-dismiss transient error notices.
  useEffect(() => {
    if (!actionNotice) return;
    const t = setTimeout(() => setActionNotice(""), 4000);
    return () => clearTimeout(t);
  }, [actionNotice]);

  const upcomingCount = bookings.filter((b) => b.status === "upcoming").length;
  const refundedCount = bookings.filter((b) => b.status === "refunded" || b.status === "cancelled").length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;

  const visible = bookings.filter((b) => {
    if (activeTab === "all") return true;
    if (activeTab === "refunded") return b.status === "refunded" || b.status === "cancelled";
    return b.status === activeTab;
  });

  // Fetch the tiered refund breakdown as soon as the cancel modal opens.
  const requestCancel = (booking) => {
    setRefundPreview(null);
    setCancelModalBooking(booking);
    setPreviewLoading(true);
    getRefundPreview(booking.id ?? booking.referenceNumber)
      .then((preview) => setRefundPreview(preview))
      .catch(() => setRefundPreview(null))
      .finally(() => setPreviewLoading(false));
  };

  const downloadPdf = async (booking) => {
    const ref = booking.id ?? booking.referenceNumber;
    setDownloadingRef(ref);
    try {
      const { blob, filename } = await generateItineraryPdf(ref);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Revoke AFTER the browser has started the download — revoking
      // synchronously can abort the blob before it is read.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("PDF download failed:", err);
      setActionNotice("Could not generate the PDF ticket right now. Please try again.");
    } finally {
      setDownloadingRef(null);
    }
  };

  const previewEffectiveAmount = refundPreview?.refundAmount
    ?? (cancelModalBooking?.amount || cancelModalBooking?.totalAmount || 0);

  const handleConfirmCancelAndRefund = async () => {
    if (!cancelModalBooking) return;
    setCancellingInProgress(true);
    try {
      const res = await cancelBookingTransaction(cancelModalBooking.id, "User requested refund");
      setCancellingInProgress(false);
      setRefundSuccessData({
        ...cancelModalBooking,
        refundReference: res.refundReference,
        refundAmount: res.refundAmount ?? previewEffectiveAmount,
        newWalletBalance: res.newWalletBalance,
        policyTier: res.policyTier,
      });
      setCancelModalBooking(null);
      setRefundPreview(null);
    } catch {
      setCancellingInProgress(false);
      setActionNotice("Failed to cancel booking. Please try again.");
    }
  };

  const policyBadge = (tier) => {
    switch (tier) {
      case "full": return { label: "100% Full Refund", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 fill-emerald-500" };
      case "partial": return { label: "Partial Refund (50%)", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 fill-amber-500" };
      case "credit": return { label: "Travel Credit", cls: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20 fill-sky-500" };
      default: return { label: "Refund", cls: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 fill-slate-500" };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e17] text-slate-900 dark:text-slate-100 pb-24 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between pb-8 border-b border-slate-200 dark:border-white/[0.08] gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[#008fe5] dark:text-[#38bdf8] bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20 mb-2 font-bold">
              <BadgeCheck size={13} /> Self-Service Travel Hub
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-950 dark:text-white tracking-tight">
              My Bookings &amp; Itineraries
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
              Manage your confirmed flights, 5-star haven reservations, and luxury private vehicles with instant 1-click refund protection.
            </p>
          </div>

          {/* TravelConnect Money Quick Pill */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-[#008fe5] dark:text-[#38bdf8]">
              <Coins size={20} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                TravelConnect Money
              </span>
              <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {displayPrice(walletBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-2 my-8">
          {[
            { id: "upcoming", label: "Active Journeys", count: upcomingCount },
            { id: "refunded", label: "Cancelled & Refunded", count: refundedCount },
            { id: "completed", label: "Past Journeys", count: completedCount },
            { id: "all", label: "All Itineraries", count: bookings.length },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 border ${activeTab === t.id
                ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20 font-bold"
                : "bg-white dark:bg-[#0f1422] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                }`}
            >
              <span>{t.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${activeTab === t.id
                ? "bg-slate-950/20 text-slate-950"
                : "bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300"
                }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* List of Bookings */}
        {visible.length === 0 ? (
          <div className="py-20 text-center space-y-4 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] p-8 shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CalendarClock size={24} />
            </div>
            <h3 className="font-heading text-xl font-bold text-slate-950 dark:text-white">
              No bookings under this filter
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Plan your next luxury escape across our curated flights, sanctuaries, and private fleets.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                to="/hotels"
                className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-amber-500/20 transition"
              >
                Browse Hotels
              </Link>
              <Link
                to="/cars"
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-white text-xs font-semibold border border-slate-200 dark:border-white/[0.1] transition"
              >
                Browse Cars
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {visible.map((booking) => (
              <BookingVoucherCard
                key={booking.id}
                booking={booking}
                onViewDetails={openBookingDetailsModal}
                onRequestCancel={requestCancel}
                onDownloadPdf={downloadPdf}
                downloadingRef={downloadingRef}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Instant Refund Confirmation Modal ──────────────────────── */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <RotateCcw size={22} />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-heading text-xl font-bold">Request Instant Refund?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                You are about to cancel <strong className="text-slate-900 dark:text-white">{cancelModalBooking.name || cancelModalBooking.packageName}</strong>.
              </p>
            </div>

            {/* Cancellation Policy Breakdown */}
            <div className="space-y-2">
              {previewLoading ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-center text-xs font-semibold text-slate-500 dark:text-slate-400 animate-pulse">
                  Calculating your refund…
                </div>
              ) : (
                <>
                  <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${policyBadge(refundPreview?.policyTier).cls}`}>
                    <span className="font-bold flex items-center gap-2">
                      <ShieldCheck size={14} />
                      {policyBadge(refundPreview?.policyTier).label}
                    </span>
                    <span className="font-mono font-black text-sm">
                      {displayPrice(previewEffectiveAmount)}
                    </span>
                  </div>

                  {refundPreview?.message && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {refundPreview.message}
                    </p>
                  )}

                  {!refundPreview?.policyTier && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Cancelling within 7 days of booking qualifies for a 100% full refund. After day 7, a partial
                      refund or travel credit applies.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Booking Ref:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{cancelModalBooking.id || cancelModalBooking.referenceNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Refund Destination:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">TravelConnect Wallet</span>
              </div>
              {(refundPreview?.policyTier === "credit") && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Refund Type:</span>
                  <span className="font-semibold text-sky-600 dark:text-sky-400">Travel Credit (No Cashback)</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={cancellingInProgress}
                onClick={() => setCancelModalBooking(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-xs font-semibold transition"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={cancellingInProgress}
                onClick={handleConfirmCancelAndRefund}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-md flex items-center justify-center gap-1.5"
              >
                {cancellingInProgress ? "Processing..." : "Confirm & Refund"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Refund Success Notice ───────────────────────────────────── */}
      {refundSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-md bg-white dark:bg-[#0f172a] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-center text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 size={28} />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-heading text-2xl font-bold">
                {refundSuccessData.policyTier === "credit"
                  ? "Travel Credit Issued"
                  : "Refund Processed Successfully"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {refundSuccessData.policyTier === "credit"
                  ? "A travel credit of "
                  : "The amount of "}
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{displayPrice(refundSuccessData.refundAmount)}</strong>
                {" "}has been applied to your TravelConnect Money wallet.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${policyBadge(refundSuccessData.policyTier).cls}`}>
                {policyBadge(refundSuccessData.policyTier).label}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.06] text-[10px] font-mono text-slate-500 dark:text-slate-400">
                Wallet Balance: {displayPrice(refundSuccessData.newWalletBalance)}
              </span>
            </div>

            <button
              onClick={() => setRefundSuccessData(null)}
              className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md hover:bg-amber-400 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Inline toast for transient errors (replaces alert()) */}
      {actionNotice && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] max-w-sm w-full px-4">
          <div className="bg-red-600 text-white text-xs font-semibold rounded-xl shadow-xl px-4 py-3 flex items-center gap-2">
            <span className="flex-1">{actionNotice}</span>
            <button
              onClick={() => setActionNotice("")}
              className="ml-2 text-white/70 hover:text-white font-bold"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Bookings() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <BookingsDashboard /> : <LoginGate />;
}
