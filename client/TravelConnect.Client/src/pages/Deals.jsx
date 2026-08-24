import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Tag, Clock, Copy, CheckCheck, Zap, Shield, CreditCard, HeadphonesIcon, RefreshCcw, ArrowRight, Star, ChevronDown
} from "lucide-react";
import { useBooking } from "../context/BookingContext";

/* ─── Data ─────────────────────────────────────────────────────────── */

const PROMO_CODES = [
  { code: "SUMMER26", label: "25% off all summer/autumn packages", badge: "Ending Soon", expires: "Oct 31" },
  { code: "WELCOME50", label: "$50 off for new members", badge: "New Members", expires: "Dec 31" },
  { code: "HONEYMOON", label: "10% off all honeymoon packages", badge: "Couples", expires: "Dec 31" },
  { code: "BALI15", label: "$15 off first S.E. Asia packages", badge: "Regional", expires: "Sep 30" },
];

const DEALS = [
  {
    id: 1,
    name: "Tokyo Neon & Culture",
    location: "Tokyo, Japan · 5 days",
    badge: "EARLY BIRD",
    badgeColor: "bg-amber-500",
    discount: 25,
    original: 2495,
    price: 1870,
    savings: 625,
    code: "EARLY2027",
    season: "Early Bird",
    img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=700&q=80",
    rating: 4.9,
    nights: 5,
    spotsLeft: null,
  },
  {
    id: 2,
    name: "Bali Serenity Escape",
    location: "Bali, Indonesia · 7 days",
    badge: "TOP RATED",
    badgeColor: "bg-rose-500",
    discount: 20,
    original: 1299,
    price: 1039,
    savings: 260,
    code: "SUMMER26",
    season: "Seasonal",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80",
    rating: 4.8,
    nights: 7,
    spotsLeft: null,
  },
  {
    id: 3,
    name: "Swiss Alps Winter Escape",
    location: "Switzerland · 10 days",
    badge: "SEASONAL",
    badgeColor: "bg-blue-600",
    discount: 20,
    original: 3844,
    price: 3075,
    savings: 769,
    code: "SUMMER26",
    season: "Seasonal",
    img: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=700&q=80",
    rating: 4.9,
    nights: 10,
    spotsLeft: null,
  },
  {
    id: 4,
    name: "Paris Romance Package",
    location: "Paris, France · 5 days",
    badge: "MEMBER EXCLUSIVE",
    badgeColor: "bg-purple-600",
    discount: 15,
    original: 1810,
    price: 1539,
    savings: 271,
    code: "WELCOME50",
    season: "Member",
    img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=700&q=80",
    rating: 4.8,
    nights: 5,
    spotsLeft: null,
  },
  {
    id: 5,
    name: "Santorini Sunset Retreat",
    location: "Greece · 6 days",
    badge: "HOT DEAL",
    badgeColor: "bg-orange-500",
    discount: 15,
    original: 1880,
    price: 1598,
    savings: 282,
    code: "BALI15",
    season: "Flash",
    img: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=700&q=80",
    rating: 4.9,
    nights: 6,
    spotsLeft: 4,
  },
  {
    id: 6,
    name: "Maldives Overwater Escape",
    location: "Maldives · 8 days",
    badge: "HONEYMOON",
    badgeColor: "bg-pink-500",
    discount: 10,
    original: 3800,
    price: 3420,
    savings: 380,
    code: "HONEYMOON",
    season: "Honeymoon",
    img: "https://images.unsplash.com/photo-1540202404-a2f29016b523?w=700&q=80",
    rating: 5.0,
    nights: 8,
    spotsLeft: null,
  },
];

const STATS = [
  { val: "6", label: "Active Deals" },
  { val: "Up to 25%", label: "Max Discount" },
  { val: "44", label: "Days Available" },
  { val: "Dec 31", label: "Latest Expiry" },
];

const SORT_OPTIONS = ["Low↑", "Price", "Ending Soon"];

const PERKS = [
  { icon: Shield, title: "Price Guarantee", desc: "Found cheaper? We match it." },
  { icon: CreditCard, title: "Flexible Payment", desc: "Pay in instalments, no fees." },
  { icon: HeadphonesIcon, title: "24/7 Support", desc: "Our team is always one call away." },
  { icon: RefreshCcw, title: "Free Cancellation", desc: "Up to 48 hrs before departure." },
];

/* ─── Component ────────────────────────────────────────────────────── */
export default function Deals() {
  const { openCheckoutModal } = useBooking();
  const [copiedCode, setCopiedCode] = useState(null);
  const [sortBy, setSortBy] = useState("Low↑");

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sorted = [...DEALS].sort((a, b) => {
    if (sortBy === "Low↑") return a.price - b.price;
    if (sortBy === "Price") return b.price - a.price;
    if (sortBy === "Ending Soon") return a.id - b.id;
    return 0;
  });

  return (
    <div className="w-full bg-slate-50 min-h-screen">
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-indigo-900 via-blue-800 to-sky-700 text-white py-16 px-4 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 right-0 w-72 h-72 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest bg-white/15 backdrop-blur-sm border border-white/20 text-white/90 rounded-full px-4 py-1.5 mb-6">
            <Zap size={12} className="fill-amber-400 text-amber-400" />
            LIMITED TIME OFFERS
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-3">
            Exclusive Travel
          </h1>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-amber-400 mb-4">
            Deals &amp; Discounts
          </h2>
          <p className="text-blue-200 text-base max-w-lg mx-auto mb-10">
            Flash sales, member exclusives, and seasonal offers — handpicked packages at prices that won&rsquo;t last.
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-8 sm:gap-16">
            {STATS.map(({ val, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl sm:text-3xl font-extrabold text-white">{val}</p>
                <p className="text-blue-300 text-xs mt-0.5 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Promo Codes ─────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-2">
          <Tag size={13} className="text-[#008fe5]" /> Active Promo Codes — click to copy
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROMO_CODES.map((promo) => (
            <button
              key={promo.code}
              onClick={() => handleCopy(promo.code)}
              className="group text-left bg-white border-2 border-dashed border-gray-200 hover:border-[#008fe5] rounded-xl p-4 transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-extrabold text-gray-900 text-sm tracking-wider">
                  {promo.code}
                </span>
                {copiedCode === promo.code ? (
                  <CheckCheck size={15} className="text-green-500" />
                ) : (
                  <Copy size={13} className="text-gray-400 group-hover:text-[#008fe5] transition-colors" />
                )}
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">{promo.label}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] font-bold text-[#008fe5] bg-blue-50 rounded-full px-2 py-0.5">
                  {promo.badge}
                </span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Clock size={10} /> Expires {promo.expires}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Featured Deal Banner ─────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="relative rounded-3xl overflow-hidden min-h-[200px] flex items-end">
          <img
            src="https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80"
            alt="Tokyo Neon"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
          <div className="relative z-10 p-7 flex flex-col sm:flex-row items-end sm:items-center justify-between w-full gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-full mb-3">
                <Star size={10} className="fill-white" /> EARLY BIRD · FEATURED DEAL
              </span>
              <h3 className="text-white font-extrabold text-2xl sm:text-3xl mb-1">Tokyo Neon &amp; Culture</h3>
              <p className="text-white/70 text-sm">
                Book by Oct 31 — biggest discount of the year · Tokyo, Japan · 5 days
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-right">
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full mr-2">-25% OFF</span>
                <span className="text-white font-extrabold text-3xl">$1,870</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                  Use Code: EARLY2027
                </span>
                <button
                  onClick={() => openCheckoutModal(DEALS[0], "EARLY2027")}
                  className="bg-[#008fe5] hover:bg-blue-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  Book Now →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── All Deals Grid ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">All Deals</h2>
            <p className="text-gray-400 text-xs mt-0.5">{DEALS.length} offers available right now</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">SORT BY</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setSortBy(opt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  sortBy === opt
                    ? "bg-[#008fe5] text-white border-[#008fe5]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#008fe5]"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map((deal) => (
            <div
              key={deal.id}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 group border border-gray-100"
            >
              {/* Image */}
              <div className="relative h-44 overflow-hidden">
                <img
                  src={deal.img}
                  alt={deal.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <span className={`absolute top-3 left-3 text-[10px] font-bold text-white px-2.5 py-1 rounded-full ${deal.badgeColor}`}>
                  ● {deal.badge}
                </span>
                <span className="absolute top-3 right-3 bg-red-500 text-white text-[11px] font-extrabold px-2 py-0.5 rounded-full">
                  -{deal.discount}%
                </span>
                {deal.spotsLeft && (
                  <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Zap size={10} className="text-amber-400" /> {deal.spotsLeft} left at this price
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-extrabold text-gray-900 text-base mb-0.5">{deal.name}</h3>
                <p className="text-gray-400 text-xs mb-3">{deal.location}</p>

                {/* Pricing */}
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-gray-400 text-xs line-through">${deal.original.toLocaleString()}</p>
                    <p className="text-2xl font-extrabold text-gray-900">${deal.price.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400">You save</p>
                    <p className="text-green-600 font-bold text-sm">${deal.savings}</p>
                  </div>
                </div>

                {/* Promo code */}
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 mb-4 border border-dashed border-gray-200">
                  <span className="text-xs text-gray-500 font-mono tracking-wider">{deal.code}</span>
                  <button
                    onClick={() => handleCopy(deal.code)}
                    className="text-[#008fe5] text-xs font-semibold hover:underline flex items-center gap-1"
                  >
                    {copiedCode === deal.code ? (
                      <><CheckCheck size={12} className="text-green-500" /> Copied!</>
                    ) : (
                      <><Copy size={12} /> Copy code</>
                    )}
                  </button>
                </div>

                {/* CTA */}
                <button
                  onClick={() => openCheckoutModal(deal, deal.code)}
                  className="w-full text-center bg-gradient-to-r from-[#008fe5] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-2.5 rounded-xl text-sm shadow-md shadow-blue-400/20 hover:-translate-y-0.5 transition-all duration-200"
                >
                  Book This Deal
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Perks Section ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-6">
        <div className="bg-white border border-gray-100 rounded-3xl p-10 text-center shadow-sm">
          <h2 className="text-xl font-extrabold text-gray-900 mb-1">Why book a deal with us?</h2>
          <p className="text-gray-400 text-sm mb-8">Every promoted package comes with our full service guarantee.</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {PERKS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <Icon size={22} className="text-[#008fe5]" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
