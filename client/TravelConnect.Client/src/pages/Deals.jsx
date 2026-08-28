import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Tag, Clock, Copy, CheckCheck, Zap, Shield, CreditCard, HeadphonesIcon, RefreshCcw, Star, Plane, Hotel, Car, Eye
} from "lucide-react";
import { useBooking } from "../context/BookingContext";
import { DEALS } from "../data/dealsData";
import PageHeroCarousel from "../components/shared/PageHeroCarousel";

const DEAL_HERO_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1920&q=80",
    alt: "Travel adventure destination",
  },
  {
    image: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1920&q=80",
    alt: "Tropical beach paradise deal",
  },
  {
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cab0?auto=format&fit=crop&w=1920&q=80",
    alt: "Airplane wing over clouds",
  },
  {
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1920&q=80",
    alt: "Road trip travel package",
  },
];

const PROMO_CODES = [
  { code: "SUMMER26", label: "25% off all summer & autumn packages", badge: "Ending Soon", expires: "Oct 31" },
  { code: "WELCOME50", label: "₱2,500 off for new members", badge: "New Members", expires: "Dec 31" },
  { code: "HONEYMOON", label: "10% off all honeymoon luxury villas", badge: "Couples", expires: "Dec 31" },
  { code: "BALI15", label: "₱1,500 off S.E. Asia packages", badge: "Regional", expires: "Sep 30" },
];

const STATS = [
  { val: `${DEALS.length}`, label: "Active Deals" },
  { val: "Up to 25%", label: "Max Discount" },
  { val: "PHP (₱)", label: "Currency" },
  { val: "Dec 31", label: "Latest Expiry" },
];

const SORT_OPTIONS = ["Low Price", "High Price", "Top Rated"];

const PERKS = [
  { icon: Shield, title: "Best Rate Guarantee", desc: "Found a cheaper rate elsewhere? We match it in PHP." },
  { icon: CreditCard, title: "Flexible Payment Options", desc: "Pay quickly and securely via GCash or Maya e-wallets." },
  { icon: HeadphonesIcon, title: "24/7 Local Support", desc: "Our Manila-based team is always one call away." },
  { icon: RefreshCcw, title: "Free Cancellation", desc: "Up to 48 hrs before your flight departure." },
];

export default function Deals() {
  const { openCheckoutModal } = useBooking();
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState(null);
  const [sortBy, setSortBy] = useState("Low Price");

  const handleCopy = (code, e) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sorted = [...DEALS].sort((a, b) => {
    if (sortBy === "Low Price") return a.price - b.price;
    if (sortBy === "High Price") return b.price - a.price;
    if (sortBy === "Top Rated") return b.rating - a.rating;
    return 0;
  });

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-16">
      {/* ── Hero Banner ────────────────────────────────────────────────────────── */}
      <PageHeroCarousel slides={DEAL_HERO_SLIDES} className="py-16 px-4 pb-20">
        <div className="max-w-7xl mx-auto text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest bg-white/15 backdrop-blur-md border border-white/20 text-white rounded-full px-4 py-1.5 mb-2">
            <Zap size={13} className="fill-amber-400 text-amber-400" /> EXCLUSIVE PHILIPPINES &amp; GLOBAL DEALS
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight drop-shadow-md">
            Handpicked Travel Bundles
          </h1>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-400 drop-shadow">
            Flight + Hotel + Car Packages in PHP (₱)
          </h2>
          <p className="text-slate-200 text-sm max-w-xl mx-auto pt-1 drop-shadow">
            Click on any deal card to inspect full inclusions, flight schedules, resort perks, and day-by-day itineraries!
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-8 sm:gap-16 pt-6">
            {STATS.map(({ val, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl sm:text-3xl font-black text-white">{val}</p>
                <p className="text-slate-300 text-xs mt-0.5 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </PageHeroCarousel>

      {/* ── Active Promo Codes ────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-xs font-extrabold text-slate-500 mb-3 flex items-center gap-2">
          <Tag size={14} className="text-[#008fe5]" /> Active Travel Promo Codes — click to copy
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROMO_CODES.map((promo) => (
            <button
              key={promo.code}
              onClick={(e) => handleCopy(promo.code, e)}
              className="group text-left bg-white border-2 border-dashed border-slate-200 hover:border-[#008fe5] rounded-2xl p-4 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-black text-slate-900 text-sm font-mono tracking-wider">
                  {promo.code}
                </span>
                {copiedCode === promo.code ? (
                  <CheckCheck size={16} className="text-emerald-500" />
                ) : (
                  <Copy size={14} className="text-slate-400 group-hover:text-[#008fe5] transition-colors" />
                )}
              </div>
              <p className="text-slate-600 text-xs font-medium leading-relaxed mb-2">{promo.label}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-[#008fe5] bg-blue-50 rounded-full px-2.5 py-0.5">
                  {promo.badge}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                  <Clock size={11} /> Exp. {promo.expires}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Featured Deal Banner ──────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div
          onClick={() => navigate(`/deals/${DEALS[0].id}`)}
          className="relative rounded-3xl overflow-hidden min-h-[220px] flex items-end cursor-pointer group shadow-xl border border-slate-200/80"
        >
          <img
            src={DEALS[0].img}
            alt={DEALS[0].name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent" />
          <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row items-end sm:items-center justify-between w-full gap-4 text-white">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 bg-amber-500 text-slate-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                <Star size={11} className="fill-slate-900" /> FEATURED DEAL OF THE MONTH
              </span>
              <h3 className="font-black text-2xl sm:text-3xl text-white">{DEALS[0].name}</h3>
              <p className="text-slate-300 text-xs sm:text-sm">
                {DEALS[0].location} · {DEALS[0].bundleLabel}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-right">
                <span className="bg-red-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full mr-2">-25% OFF</span>
                <span className="font-black text-3xl text-white">₱{DEALS[0].price.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/deals/${DEALS[0].id}`); }}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1 transition"
                >
                  <Eye size={14} /> View Details
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); openCheckoutModal(DEALS[0], DEALS[0].code); }}
                  className="bg-[#008fe5] hover:bg-blue-600 text-white text-xs font-extrabold px-5 py-2 rounded-xl shadow-lg transition"
                >
                  Book Deal →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── All Deals Grid ────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900">All Featured Deals</h2>
            <p className="text-xs text-slate-500 mt-0.5">Click any card to inspect full bundle inclusions &amp; day-by-day itinerary</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-400 uppercase">Sort by:</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setSortBy(opt)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition ${
                  sortBy === opt
                    ? "bg-[#008fe5] text-white border-[#008fe5]"
                    : "bg-white text-slate-700 border-slate-200 hover:border-[#008fe5]"
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
              onClick={() => navigate(`/deals/${deal.id}`)}
              className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col justify-between cursor-pointer"
            >
              <div>
                {/* Card Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={deal.img}
                    alt={deal.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className={`absolute top-3 left-3 text-[10px] font-extrabold text-white px-3 py-1 rounded-full uppercase tracking-wider ${deal.badgeColor}`}>
                    {deal.badge}
                  </span>
                  <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                    -{deal.discount}%
                  </span>
                  <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                    {deal.bundleType === "flight-hotel-car" ? (
                      <><Plane size={12} /> + <Hotel size={12} /> + <Car size={12} /></>
                    ) : (
                      <><Plane size={12} /> + <Hotel size={12} /></>
                    )}
                    <span>{deal.bundleLabel}</span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 space-y-3">
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight group-hover:text-[#008fe5] transition-colors">
                    {deal.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">{deal.location}</p>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star size={13} className="fill-amber-400" /> {deal.rating} Rating
                    </span>
                    <span className="text-[#008fe5] font-extrabold flex items-center gap-1 text-[11px]">
                      <Eye size={13} /> View Inclusions &rarr;
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing & CTA */}
              <div className="p-5 pt-0 border-t border-slate-100 mt-3">
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <span className="text-xs text-slate-400 line-through">₱{deal.original.toLocaleString()}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">₱{deal.price.toLocaleString()}</span>
                      <span className="text-xs text-slate-500 font-semibold">/ person</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Total Savings</span>
                    <p className="text-xs font-black text-emerald-600">₱{deal.savings.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/deals/${deal.id}`); }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1"
                  >
                    <Eye size={14} /> Details
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openCheckoutModal(deal, deal.code); }}
                    className="w-full bg-[#008fe5] hover:bg-blue-600 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md hover:-translate-y-0.5 transition"
                  >
                    Book Deal
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Perks ────────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-10 text-center shadow-sm">
          <h2 className="text-2xl font-black text-slate-900 mb-1">Why book a deal with TravelConnect?</h2>
          <p className="text-slate-500 text-xs sm:text-sm mb-8 max-w-lg mx-auto">All featured packages include full travel insurance options, verified resort stays, and 24/7 hotline support.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PERKS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#008fe5] flex items-center justify-center mb-1">
                  <Icon size={20} />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">{title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed font-medium">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
