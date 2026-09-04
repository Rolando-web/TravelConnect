import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2, Star, ShieldCheck, Package, ArrowLeft, Calendar, MapPin, Sparkles, HeadphonesIcon
} from "lucide-react";
import { packagesApi } from "../services/api";
import { useBooking } from "../context/BookingContext";
import { useCurrency } from "../context/CurrencyContext";

const toBooking = (deal) => ({
  id: `PKG-${deal.id}`,
  name: deal.name,
  location: deal.location,
  price: Number(deal.price || 0),
  duration: deal.duration || "",
  img: deal.imageUrl,
  category: "package",
});

const toList = (field) =>
  (field || "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

export default function DealDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openCheckoutModal } = useBooking();
  const { displayPrice } = useCurrency();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    packagesApi
      .get(id)
      .then((data) => { if (active) setDeal(data); })
      .catch(() => { if (active) setDeal(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-slate-600 font-semibold">Loading deal...</p>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-slate-600 font-semibold">Package not found.</p>
        <Link to="/deals" className="text-[#008fe5] font-bold hover:underline">Back to Deals</Link>
      </div>
    );
  }

  const inclusions = toList(deal.inclusions);
  const exclusions = toList(deal.exclusions);
  const itinerary = toList(deal.itinerary);

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-16">
      {/* ── Breadcrumb & Back Nav ────────────────────────────────────────── */}
      <div className="bg-slate-900 text-white py-4 px-4 sm:px-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/deals")}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <ArrowLeft size={16} /> Back to Exclusive Deals
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link to="/" className="hover:underline">Home</Link> /
            <Link to="/deals" className="hover:underline">Deals</Link> /
            <span className="text-slate-200 font-bold truncate max-w-[150px] sm:max-w-none">{deal.name}</span>
          </div>
        </div>
      </div>

      {/* ── Hero Banner (package photo background) ─────────────────────── */}
      <div className="relative text-white overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={deal.imageUrl || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80"}
            alt={deal.name}
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/75 via-slate-900/55 to-slate-900/85" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            {/* Banner Main Text */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[11px] font-extrabold bg-[#008fe5] text-white px-3 py-1 rounded-full uppercase tracking-wider`}>
                  {deal.tag || "PACKAGE"}
                </span>
                <span className="bg-white/10 text-slate-200 border border-white/20 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Package size={14} className="text-amber-400" /> {deal.duration || "Flexible Dates"}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight drop-shadow-md">
                {deal.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-200 font-medium">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star size={16} className="fill-amber-400" /> {Number(deal.rating || 0).toFixed(1)} ({deal.reviews || 0} verified traveler reviews)
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin size={15} className="text-[#008fe5]" /> {deal.location}
                </span>
              </div>

              <p className="text-slate-200 text-sm leading-relaxed max-w-2xl drop-shadow">
                {deal.description}
              </p>
            </div>

            {/* Quick Pricing Card */}
            <div className="bg-white text-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Package Price</span>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">{displayPrice(Number(deal.price || 0))}</span>
                  <span className="text-xs text-slate-500 font-semibold">/ person</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Taxes, fees &amp; all bundle inclusions covered</p>
              </div>

              <button
                onClick={() => openCheckoutModal(toBooking(deal))}
                className="w-full bg-gradient-to-r from-[#008fe5] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-extrabold py-4 rounded-2xl shadow-xl shadow-blue-500/25 hover:-translate-y-0.5 transition text-sm flex items-center justify-center gap-2"
              >
                <span>Book This Package Deal</span>
                <Sparkles size={16} />
              </button>

              <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1"><ShieldCheck size={13} className="text-emerald-500" /> Instant Confirmation</span>
                <span>•</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={13} className="text-blue-500" /> Free Cancellation</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Inclusions & Itinerary ─────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Full Package Details & Inclusions */}
          <div className="lg:col-span-2 space-y-8">
            {/* Gallery Image */}
            <div className="relative rounded-3xl overflow-hidden shadow-lg h-72 sm:h-96">
              <img
                src={deal.imageUrl || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80"}
                alt={deal.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Package size={12} className="text-amber-400" /> Verified TravelConnect Deal
              </div>
            </div>

            {/* Inclusions */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-5">
              <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={24} className="text-[#008fe5]" /> Package Inclusions
              </h2>
              {inclusions.length === 0 ? (
                <p className="text-sm text-slate-500">Full inclusion details coming soon.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {inclusions.map((inc, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-700 font-medium p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> {inc}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Itinerary */}
            {itinerary.length > 0 && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
                <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Calendar size={24} className="text-[#008fe5]" /> Tour Itinerary
                </h2>
                <div className="space-y-4">
                  {itinerary.map((item, i) => (
                    <div key={i} className="relative pl-10">
                      <div className="absolute left-1.5 top-0 w-6 h-6 rounded-full bg-[#008fe5] text-white text-xs font-black flex items-center justify-center ring-4 ring-white">
                        {i + 1}
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">{item}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exclusions */}
            {exclusions.length > 0 && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-4">
                <h2 className="text-xl font-extrabold text-slate-900">What&rsquo;s Not Included</h2>
                <ul className="space-y-2 text-sm text-slate-600 font-medium">
                  {exclusions.map((ex, i) => (
                    <li key={i} className="flex items-start gap-2">• {ex}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column: Reservation Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200/80 sticky top-24 space-y-5">
              <h3 className="text-lg font-extrabold text-slate-900 pb-3 border-b border-slate-100">
                Book Package Deal
              </h3>

              <div className="space-y-3 text-xs">
                <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-black text-slate-900 text-sm">Total Deal Price</span>
                  <span className="font-black text-[#008fe5] text-2xl">{displayPrice(Number(deal.price || 0))}</span>
                </div>
              </div>

              <button
                onClick={() => openCheckoutModal(toBooking(deal))}
                className="w-full bg-[#008fe5] hover:bg-blue-600 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 transition text-sm text-center"
              >
                Proceed to Checkout
              </button>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2 text-xs">
                <p className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <HeadphonesIcon size={14} className="text-[#008fe5]" /> Need custom dates?
                </p>
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  Our travel specialists can adjust travel dates, flight upgrades, or add extra nights for your party.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
