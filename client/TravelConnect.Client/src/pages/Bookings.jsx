import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MapPin, Calendar, Users, CreditCard, X, CheckCircle, Clock,
  ArrowRight, Globe, Lock, FileText, Shield
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBooking } from "../context/BookingContext";

/* ─── Status helpers ─────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  upcoming:  { label: "Upcoming",  color: "bg-blue-100 text-blue-700",   dot: "bg-blue-500" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-500",     dot: "bg-red-400" },
};

const TABS = ["upcoming", "completed", "cancelled"];

/* ═══════════════════════════════════════════════════════════════════════
   LOGIN GATE — centered sign-in prompt (opens modal)
══════════════════════════════════════════════════════════════════════ */
function LoginGate() {
  const { openLoginModal } = useAuth();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 px-4 py-16 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-blue-200/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-56 h-56 rounded-full bg-indigo-200/30 blur-2xl pointer-events-none" />

      {/* Card */}
      <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white px-10 py-12 flex flex-col items-center text-center max-w-sm w-full">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#008fe5] to-blue-600 flex items-center justify-center shadow-lg shadow-blue-400/30 mb-6">
          <Lock size={28} className="text-white" />
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">My Bookings</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          Sign in to view and manage all your upcoming, completed, and cancelled trips.
        </p>

        {/* Primary CTA */}
        <button
          onClick={openLoginModal}
          className="w-full bg-gradient-to-r from-[#008fe5] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-400/25 hover:-translate-y-0.5 transition-all duration-200 text-sm flex items-center justify-center gap-2"
        >
          Sign In to View Bookings <ArrowRight size={15} />
        </button>

        {/* Secondary */}
        <div className="flex items-center gap-3 my-5 w-full">
          <div className="flex-1 border-t border-gray-200" />
          <span className="text-gray-400 text-xs">or</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>
        <Link
          to="/explore"
          className="text-sm font-semibold text-[#008fe5] hover:underline flex items-center gap-1"
        >
          <Globe size={14} /> Explore destinations first
        </Link>

        <p className="text-[10px] text-gray-300 mt-6 leading-relaxed">
          By signing in you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   BOOKING CARD
══════════════════════════════════════════════════════════════════════ */
function BookingCard({ booking, onViewDetails, onCancel }) {
  const st = STATUS_CONFIG[booking.status] || STATUS_CONFIG.upcoming;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col sm:flex-row">
      {/* Thumbnail */}
      <div className="relative w-full sm:w-36 h-36 sm:h-auto flex-shrink-0">
        <img
          src={booking.img || "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&q=80"}
          alt={booking.name || booking.packageName}
          className="w-full h-full object-cover"
        />
        {booking.paid && (
          <span className="absolute bottom-2 left-2 bg-green-500/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
            PAID
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-extrabold text-gray-900 text-base">{booking.name || booking.packageName}</h3>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${st.color}`}>
              {st.label}
            </span>
          </div>
          <p className="text-gray-400 text-xs flex items-center gap-1 mb-3">
            <MapPin size={11} /> {booking.location}
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar size={11} /> {booking.startDate} — {booking.endDate}
            </span>
            <span className="flex items-center gap-1">
              <Users size={11} /> {booking.travellers} traveller{booking.travellers > 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-[10px] text-gray-300 mt-1.5 font-mono">Ref: {booking.id || booking.referenceNumber}</p>
        </div>

        {/* Amount + actions */}
        <div className="flex flex-col items-end gap-2">
          <p className="text-2xl font-extrabold text-gray-900">
            ₱{(booking.amount || booking.totalAmount || 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <CreditCard size={11} /> {booking.paymentMethod || "Credit Card"}
          </p>

          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => onViewDetails(booking)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1"
            >
              <FileText size={13} /> View Receipt
            </button>

            {booking.status === "upcoming" && (
              <button
                onClick={() => onCancel(booking.id)}
                className="border border-red-200 text-red-400 hover:bg-red-50 hover:border-red-400 text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-200"
              >
                Cancel
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
══════════════════════════════════════════════════════════════════════ */
function BookingsDashboard() {
  const { user } = useAuth();
  const { bookings, cancelBookingTransaction, openBookingDetailsModal } = useBooking();
  const [activeTab, setActiveTab] = useState("upcoming");

  const counts = TABS.reduce((acc, t) => {
    acc[t] = bookings.filter((b) => b.status === t).length;
    return acc;
  }, {});

  const visible = bookings.filter((b) => b.status === activeTab);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">My Bookings</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Track and manage your travel bookings &amp; payment transactions
            {user?.name && (
              <>, <span className="text-gray-600 font-semibold">{user.name}</span></>
            )}
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Upcoming", count: counts.upcoming, icon: Clock, color: "text-blue-500 bg-blue-50" },
            { label: "Completed", count: counts.completed, icon: CheckCircle, color: "text-green-500 bg-green-50" },
            { label: "Cancelled", count: counts.cancelled, icon: X, color: "text-red-400 bg-red-50" },
          ].map(({ label, count, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-xl font-extrabold text-gray-900">{count}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                activeTab === tab
                  ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}{" "}
              <span className={`text-[11px] font-bold ml-1 ${activeTab === tab ? "text-blue-300" : "text-gray-400"}`}>
                ({counts[tab]})
              </span>
            </button>
          ))}
        </div>

        {/* Booking cards */}
        {visible.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe size={28} className="text-gray-300" />
            </div>
            <h3 className="text-gray-700 font-bold text-lg mb-1">No {activeTab} bookings</h3>
            <p className="text-gray-400 text-sm mb-5">Start planning your next adventure!</p>
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 bg-[#008fe5] text-white font-bold px-6 py-2.5 rounded-xl shadow-md hover:bg-blue-600 hover:-translate-y-0.5 transition-all duration-200 text-sm"
            >
              Browse Destinations <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onViewDetails={openBookingDetailsModal}
                onCancel={cancelBookingTransaction}
              />
            ))}
          </div>
        )}

        {/* Explore more CTA */}
        <div className="mt-10 flex justify-center">
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 text-[#008fe5] hover:underline font-semibold text-sm"
          >
            <ArrowRight size={15} /> Explore more destinations
          </Link>
        </div>
      </div>
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
