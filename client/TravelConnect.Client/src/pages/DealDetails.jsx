import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2, Star, ShieldCheck, Package, ArrowLeft, Calendar, MapPin,
  ArrowRight, HeadphonesIcon, ChevronLeft, ChevronRight, Award, XCircle,
  Plane, BedDouble, CarFront
} from "lucide-react";
import { packagesApi } from "../services/api";
import { useBooking } from "../context/BookingContext";
import { useCurrency } from "../context/CurrencyContext";
import { FALLBACK_DEALS, COMBO_DEALS } from "../data/fallbackDeals";
import FavoriteButton from "../components/shared/FavoriteButton";

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

const COMPONENT_META = {
  flight: { icon: Plane, label: "Flight", chip: "bg-sky-50 text-sky-700 border-sky-200" },
  hotel: { icon: BedDouble, label: "Hotel", chip: "bg-amber-50 text-amber-700 border-amber-200" },
  car: { icon: CarFront, label: "Car", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const DEFAULT_IMG =
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80";

export default function DealDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openCheckoutModal } = useBooking();
  const { displayPrice } = useCurrency();
  // Combo bundles live in the client catalogue (no backend entity yet), so
  // resolve them synchronously on first render instead of from an effect.
  const comboDeal = COMBO_DEALS.find((d) => String(d.id) === String(id));
  const [deal, setDeal] = useState(() => comboDeal || null);
  const [loading, setLoading] = useState(() => !comboDeal);
  const [galleryIdx, setGalleryIdx] = useState(0);

  useEffect(() => {
    if (comboDeal) return;
    let active = true;
    packagesApi
      .get(id)
      .then((data) => { if (active) setDeal(data); })
      .catch(() => {
        if (!active) return;
        const fallback = FALLBACK_DEALS.find((d) => String(d.id) === String(id));
        setDeal(fallback || null);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, comboDeal]);

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
  const components = deal.combo?.components || [];
  const isCombo = components.length > 0;
  const savePct = deal.originalPrice
    ? Math.round((1 - Number(deal.price) / Number(deal.originalPrice)) * 100)
    : 0;
  const gallery = [
    { label: "Overview", image: deal.imageUrl || DEFAULT_IMG },
  ];

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-16">
      {/* ── Breadcrumb & Back Nav ─────────────────────────────────────────── */}
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

      {/* ── Hero Showcase ─────────────────────────────────────────────────── */}
      <section className="relative pt-8 pb-12 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Title Bar */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-[#008fe5]/10 text-[#008fe5] border border-[#008fe5]/25 font-bold">
                  {isCombo ? `${deal.combo.label} Bundle` : (deal.tag || "Package Deal")}
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                  <Calendar size={11} /> {deal.duration || "Flexible Dates"}
                </span>
                {savePct > 0 && (
                  <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                    Save {savePct}%
                  </span>
                )}
              </div>
              <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 leading-tight">
                {deal.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-medium flex items-center gap-2">
                <MapPin size={14} className="text-[#008fe5]" />
                {deal.location}
                <span className="text-slate-300">·</span>
                <span className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star size={13} className="fill-amber-400" /> {Number(deal.rating || 0).toFixed(1)}
                </span>
                <span className="text-slate-400">({deal.reviews || 0} verified reviews)</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <FavoriteButton
                type="package"
                item={deal}
                className="w-12 h-12 bg-slate-100 border border-slate-200 text-slate-700 hover:text-rose-500"
              />
              <button
                onClick={() => openCheckoutModal(toBooking(deal))}
                className="px-6 py-3 rounded-2xl bg-[#008fe5] hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-blue-500/25 transition-all flex items-center gap-2"
              >
                <Award size={15} /> Book This Deal
              </button>
            </div>
          </div>

          {/* Showcase Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Main Stage */}
            <div className="lg:col-span-9 relative">
              <div className="relative rounded-3xl overflow-hidden border border-slate-200 bg-slate-900 h-[340px] sm:h-[480px] shadow-xl group">
                <img
                  src={gallery[galleryIdx].image}
                  alt={`${deal.name} — ${gallery[galleryIdx].label}`}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />

                <div className="absolute top-5 left-5 bg-black/60 backdrop-blur-md border border-white/15 rounded-full px-4 py-1.5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-200">
                    {isCombo ? "Verified Bundle" : "Verified TravelConnect Deal"}
                  </span>
                </div>

                {gallery.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous view"
                      onClick={() => setGalleryIdx((galleryIdx - 1 + gallery.length) % gallery.length)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/15 flex items-center justify-center text-white transition"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      aria-label="Next view"
                      onClick={() => setGalleryIdx((galleryIdx + 1) % gallery.length)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/15 flex items-center justify-center text-white transition"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}

                {/* Bottom Spec Preview Bar */}
                <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-3 px-5 flex items-center justify-between text-xs text-white">
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span className="hidden sm:inline">Best-Rate Guarantee</span>
                    <span className="hidden sm:inline">· Free Cancellation (48 hrs)</span>
                  </span>
                  <span className="font-mono text-[#7dd3fc] text-[11px]">
                    {deal.duration || "Flexible Dates"}
                  </span>
                </div>
              </div>

              {/* Thumbnails strip */}
              {gallery.length > 1 && (
                <div className="flex items-center gap-3 mt-4 overflow-x-auto pb-1">
                  {gallery.map((slide, idx) => (
                    <button
                      key={slide.label}
                      onClick={() => setGalleryIdx(idx)}
                      className={`relative rounded-2xl overflow-hidden border-2 transition-all h-20 w-32 flex-shrink-0 ${
                        idx === galleryIdx
                          ? "border-[#008fe5] shadow-md shadow-blue-500/20"
                          : "border-slate-200 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={slide.image} alt={slide.label} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Booking Card */}
            <div className="lg:col-span-3 space-y-4">
              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#008fe5] block font-bold">
                  {isCombo ? "Bundle Price" : "Package Price"}
                </span>

                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-heading text-3xl font-black text-slate-900">{displayPrice(Number(deal.price || 0))}</span>
                    {deal.originalPrice ? (
                      <span className="text-sm text-slate-400 line-through font-semibold">
                        {displayPrice(Number(deal.originalPrice || 0))}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 font-semibold">/ person</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Taxes, fees &amp; every bundle inclusion covered</p>
                </div>

                <button
                  onClick={() => openCheckoutModal(toBooking(deal))}
                  className="w-full bg-gradient-to-r from-[#008fe5] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-extrabold py-4 rounded-2xl shadow-xl shadow-blue-500/25 hover:-translate-y-0.5 transition text-sm flex items-center justify-center gap-2"
                >
                  <span>{isCombo ? "Book This Bundle" : "Book This Package Deal"}</span>
                  <ArrowRight size={16} />
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
      </section>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Main Dossier Column */}
          <div className="lg:col-span-8 space-y-10">

            {/* Bundle Breakdown (combos only) */}
            {isCombo && (
              <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="font-heading text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Package size={24} className="text-[#008fe5]" /> What&rsquo;s Inside Your Bundle
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {deal.combo.perks?.join(" · ") || "Everything reserved in a single checkout"}
                  </p>
                </div>

                <div className="space-y-3">
                  {components.map((c) => {
                    const meta = COMPONENT_META[c.type] || { icon: Package, label: "Add-on" };
                    const Icon = meta.icon;
                    return (
                      <div
                        key={`${c.type}-${c.name}`}
                        className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[#008fe5] flex-shrink-0">
                          <Icon size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${meta.chip}`}>
                            {meta.label}
                          </span>
                          <p className="text-sm font-extrabold text-slate-900 mt-1 leading-tight">{c.name}</p>
                          <p className="text-[11px] text-slate-500 font-medium">{c.detail}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-heading font-black text-slate-900">{displayPrice(Number(c.price || 0))}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">included</p>
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="text-xs text-slate-500 font-medium">
                      {deal.originalPrice ? (
                        <>
                          Standalone value:{" "}
                          <span className="line-through font-semibold">{displayPrice(Number(deal.originalPrice || 0))}</span>
                          <span className="ml-2 text-emerald-600 font-black">You save {savePct}%</span>
                        </>
                      ) : (
                        "All components confirmed in one booking"
                      )}
                    </div>
                    <div className="font-heading font-black text-[#008fe5] text-xl">
                      {displayPrice(Number(deal.price || 0))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Package Inclusions */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-5">
              <h2 className="font-heading text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={24} className="text-[#008fe5]" /> {isCombo ? "Bundle Inclusions" : "Package Inclusions"}
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
            </section>

            {/* Itinerary */}
            {itinerary.length > 0 && (
              <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
                <h2 className="font-heading text-2xl font-extrabold text-slate-900 flex items-center gap-2">
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
              </section>
            )}

            {/* Exclusions */}
            {exclusions.length > 0 && (
              <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-4">
                <h2 className="font-heading text-xl font-extrabold text-slate-900">What&rsquo;s Not Included</h2>
                <ul className="space-y-2 text-sm text-slate-600 font-medium">
                  {exclusions.map((ex, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <XCircle size={15} className="text-slate-300 mt-0.5 shrink-0" /> {ex}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Right Column: Reservation Sidebar */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200/80 sticky top-24 space-y-5">
              <h3 className="font-heading text-lg font-extrabold text-slate-900 pb-3 border-b border-slate-100">
                {isCombo ? "Book This Bundle" : "Book Package Deal"}
              </h3>

              {isCombo && (
                <div className="space-y-2 text-xs">
                  {components.map((c, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 text-slate-600">
                      <span className="truncate">{c.icon} {c.name}</span>
                      <span className="font-bold text-slate-800 shrink-0">{displayPrice(Number(c.price || 0))}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                <span className="font-black text-slate-900 text-sm">Total Deal Price</span>
                <div className="text-right">
                  <span className="font-heading font-black text-[#008fe5] text-2xl">{displayPrice(Number(deal.price || 0))}</span>
                  {deal.originalPrice ? (
                    <span className="block text-[10px] text-slate-400 line-through font-semibold">
                      {displayPrice(Number(deal.originalPrice || 0))}
                    </span>
                  ) : (
                    <span className="block text-[10px] text-slate-400 font-semibold">/ person</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => openCheckoutModal(toBooking(deal))}
                className="w-full bg-[#008fe5] hover:bg-blue-600 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 transition text-sm text-center"
              >
                Proceed to Checkout
              </button>

              <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><ShieldCheck size={13} className="text-emerald-500" /> Best-Rate Guarantee</span>
                <span>•</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={13} className="text-blue-500" /> Pay via GCash</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2 text-xs">
                <p className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <HeadphonesIcon size={14} className="text-[#008fe5]" /> Need custom dates?
                </p>
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  Our travel specialists can adjust travel dates, add nights, or upgrade your flights and rental car.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}