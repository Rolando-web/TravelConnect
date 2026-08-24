import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Plane, Hotel, Car, CheckCircle2, Star, Clock, ShieldCheck, Tag, Copy, CheckCheck, ArrowLeft, Calendar, MapPin, Sparkles, AlertCircle, HeadphonesIcon
} from "lucide-react";
import { DEALS } from "../data/dealsData";
import { useBooking } from "../context/BookingContext";

export default function DealDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openCheckoutModal } = useBooking();
  const [copied, setCopied] = useState(false);

  const deal = DEALS.find((d) => d.id === parseInt(id, 10)) || DEALS[0];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(deal.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBundleIcon = (type) => {
    switch (type) {
      case "flight-hotel-car":
        return <><Plane size={14} /> + <Hotel size={14} /> + <Car size={14} /></>;
      case "flight-hotel":
        return <><Plane size={14} /> + <Hotel size={14} /></>;
      default:
        return <><Hotel size={14} /> + <Car size={14} /></>;
    }
  };

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

      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <div className="relative bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            {/* Banner Main Text */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[11px] font-extrabold text-white px-3 py-1 rounded-full uppercase tracking-wider ${deal.badgeColor}`}>
                  {deal.badge}
                </span>
                <span className="bg-red-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                  -{deal.discount}% OFF
                </span>
                <span className="bg-white/10 text-slate-200 border border-white/20 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                  {getBundleIcon(deal.bundleType)}
                  <span>{deal.bundleLabel}</span>
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
                {deal.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-300 font-medium">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star size={16} className="fill-amber-400" /> {deal.rating} ({deal.reviewsCount} verified traveler reviews)
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin size={15} className="text-[#008fe5]" /> {deal.location}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar size={15} className="text-emerald-400" /> {deal.nights} Nights Stay Included
                </span>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed max-w-2xl">
                {deal.shortDesc}
              </p>
            </div>

            {/* Quick Pricing Card */}
            <div className="bg-white text-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Package Price</span>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  Save ₱{deal.savings.toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400 line-through">₱{deal.original.toLocaleString()}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">₱{deal.price.toLocaleString()}</span>
                  <span className="text-xs text-slate-500 font-semibold">/ person</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Taxes, fees &amp; all bundle inclusions covered</p>
              </div>

              {/* Promo Code Box */}
              <div className="bg-blue-50/70 rounded-2xl p-3 border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-blue-600 font-bold uppercase">Promo Code Applied</p>
                  <p className="text-sm font-extrabold text-slate-900 font-mono">{deal.code}</p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="bg-white text-[#008fe5] hover:bg-blue-100 text-xs font-bold px-3 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1 transition"
                >
                  {copied ? <CheckCheck size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <button
                onClick={() => openCheckoutModal(deal, deal.code)}
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
                src={deal.img}
                alt={deal.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Tag size={12} className="text-amber-400" /> Verified TravelConnect Deal
              </div>
            </div>

            {/* Inclusions Overview Box */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 size={24} className="text-[#008fe5]" /> Package Inclusions &amp; What&rsquo;s Covered
                </h2>
              </div>

              {/* 1. Flight Inclusions */}
              {deal.inclusions.flight && (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#008fe5] flex items-center justify-center">
                      <Plane size={20} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Roundtrip Airfare Included</h3>
                      <p className="text-xs text-slate-500 font-semibold">{deal.inclusions.flight.airline} · {deal.inclusions.flight.flightNo}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 pt-2 border-t border-slate-200/60 font-medium">
                    <p>• <strong>Route:</strong> {deal.inclusions.flight.route}</p>
                    <p>• <strong>Baggage:</strong> {deal.inclusions.flight.baggage}</p>
                    <p className="sm:col-span-2">• <strong>Cabin:</strong> {deal.inclusions.flight.cabin}</p>
                  </div>
                </div>
              )}

              {/* 2. Hotel Inclusions */}
              {deal.inclusions.hotel && (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <Hotel size={20} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">{deal.inclusions.hotel.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                        <Star size={13} className="fill-amber-400" /> {deal.inclusions.hotel.stars} Star Accommodation · {deal.inclusions.hotel.roomType}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 pt-2 border-t border-slate-200/60 text-xs text-slate-700 font-medium">
                    <p className="font-bold text-slate-900 mb-1">Resort Perks Included:</p>
                    {deal.inclusions.hotel.perks.map((perk, i) => (
                      <p key={i} className="flex items-center gap-2">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> {perk}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Car Rental Inclusions */}
              {deal.inclusions.car && (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Car size={20} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Vehicle &amp; Rental Included</h3>
                      <p className="text-xs text-slate-500 font-semibold">{deal.inclusions.car.model} ({deal.inclusions.car.transmission})</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 pt-2 border-t border-slate-200/60 font-medium">
                    {deal.inclusions.car.features.map((feat, i) => (
                      <p key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-amber-500 shrink-0" /> {feat}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Extra Tours & Perks */}
              {deal.inclusions.extras && (
                <div className="pt-2">
                  <h4 className="font-extrabold text-slate-900 text-sm mb-3">Tours &amp; Additional Benefits</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {deal.inclusions.extras.map((ex, idx) => (
                      <div key={idx} className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs font-semibold text-slate-800 flex items-center gap-2">
                        <Sparkles size={14} className="text-[#008fe5] shrink-0" />
                        <span>{ex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Day-by-day Itinerary */}
            {deal.itinerary && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
                <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Calendar size={24} className="text-[#008fe5]" /> Day-by-Day Tour Itinerary
                </h2>
                <div className="space-y-4 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  {deal.itinerary.map((item) => (
                    <div key={item.day} className="relative pl-10">
                      <div className="absolute left-1.5 top-0 w-6 h-6 rounded-full bg-[#008fe5] text-white text-xs font-black flex items-center justify-center ring-4 ring-white">
                        {item.day}
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                        <h3 className="font-extrabold text-slate-900 text-sm">{item.title}</h3>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
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
                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <span>Regular Package Price</span>
                  <span className="line-through text-slate-400">₱{deal.original.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-600 font-bold">
                  <span>Discount Applied ({deal.code})</span>
                  <span>-₱{deal.savings.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-black text-slate-900 text-sm">Total Deal Price</span>
                  <span className="font-black text-[#008fe5] text-2xl">₱{deal.price.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => openCheckoutModal(deal, deal.code)}
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
