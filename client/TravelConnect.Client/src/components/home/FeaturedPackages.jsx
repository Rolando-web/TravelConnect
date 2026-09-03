import { useState, useEffect } from "react";
import {
  Star, Clock, MapPin, ArrowRight, Plane, Hotel, Car, ShieldCheck,
  CheckCircle2, Sparkles, Tag, Users, Eye
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useBooking } from "../../context/BookingContext";
import { packagesApi } from "../../services/api";

const fmtPrice = (p) => `₱${Number(p || 0).toLocaleString()}`;

const badge = (pkg) => {
  const map = {
    "Best Seller": { bg: "bg-emerald-500", text: "Best Seller", glow: "shadow-emerald-500/30" },
    "Top Rated": { bg: "bg-amber-500", text: "Top Rated", glow: "shadow-amber-500/30" },
    Luxury: { bg: "bg-purple-600", text: "Luxury Tier", glow: "shadow-purple-500/30" },
    Cultural: { bg: "bg-blue-600", text: "Cultural Immersion", glow: "shadow-blue-500/30" },
    "Ultra-Luxury": { bg: "bg-indigo-600", text: "Ultra Luxury", glow: "shadow-indigo-500/30" },
    "City Break": { bg: "bg-rose-500", text: "City Break", glow: "shadow-rose-500/30" },
  };
  return map[pkg.tag] || { bg: "bg-[#008fe5]", text: pkg.tag || "Featured", glow: "shadow-blue-500/30" };
};

export default function FeaturedPackages() {
  const navigate = useNavigate();
  const { openCheckoutModal } = useBooking();
  const [packages, setPackages] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    let active = true;
    packagesApi
      .list("/featured/6")
      .then((data) => { if (active) setPackages(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setPackages([]); });
    return () => { active = false; };
  }, []);

  if (packages.length === 0) return null;

  const categories = [
    { id: "all", label: "All Curated Journeys" },
    { id: "popular", label: "Top Rated" },
    { id: "luxury", label: "Luxury & Villas" },
    { id: "tropical", label: "Islands & Beaches" },
  ];

  const filtered = packages.filter((pkg) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "popular") return Number(pkg.rating || 0) >= 4.8;
    if (activeCategory === "luxury") return pkg.tag?.toLowerCase().includes("luxury") || Number(pkg.price || 0) > 10000;
    if (activeCategory === "tropical") return pkg.location?.toLowerCase().includes("philippines") || pkg.location?.toLowerCase().includes("bali") || pkg.name?.toLowerCase().includes("beach");
    return true;
  });

  return (
    <section id="packages" className="py-24 bg-white scroll-mt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] text-[#008fe5] bg-blue-50 px-3.5 py-1 rounded-full border border-blue-100">
              <Sparkles size={13} /> Complete Vacation Bundles
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              Featured All-Inclusive Offers
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl">
              Every package includes guaranteed roundtrip flights, vetted luxury accommodations, rental transport, and instant TravelConnect refund protection.
            </p>
          </div>
          
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-[#008fe5] text-white text-xs font-black px-6 py-3.5 rounded-2xl transition-all shadow-md hover:shadow-blue-500/20 active:scale-95 w-fit"
          >
            <span>Explore All 30+ Packages</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* Category Pill Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-10 pb-2 border-b border-slate-100">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeCategory === c.id
                  ? "bg-[#008fe5] text-white shadow-md shadow-blue-500/25 scale-105"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Informative Package Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(filtered.length > 0 ? filtered : packages).map((pkg) => {
            const b = badge(pkg);
            const originalPrice = Math.round(Number(pkg.price || 3000) * 1.25);

            return (
              <div 
                key={pkg.id}
                className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col group relative"
              >
                {/* Top Image Banner */}
                <div className="relative h-64 w-full overflow-hidden bg-slate-100">
                  <img 
                    src={pkg.imageUrl || "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=85"} 
                    alt={pkg.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/30" />

                  {/* Badges on Image */}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    <span className={`text-[10px] font-black text-white px-3 py-1 rounded-full uppercase tracking-wider ${b.bg} shadow-lg ${b.glow}`}>
                      {b.text}
                    </span>
                    <span className="bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <ShieldCheck size={11} /> 100% Refundable
                    </span>
                  </div>

                  {/* Rating Badge */}
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1 text-xs font-black text-slate-900 shadow-md">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    <span>{Number(pkg.rating || 4.9).toFixed(1)}</span>
                    <span className="text-slate-400 text-[10px] font-semibold">({pkg.reviews || 48})</span>
                  </div>

                  {/* Location & Duration tag on bottom of photo */}
                  <div className="absolute bottom-3.5 left-4 right-4 flex items-center justify-between text-white text-xs font-bold">
                    <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-sm px-3 py-1 rounded-full text-[11px]">
                      <MapPin size={12} className="text-[#008fe5]" />
                      <span>{pkg.location || "Philippines"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-sm px-3 py-1 rounded-full text-[11px]">
                      <Clock size={12} className="text-amber-400" />
                      <span>{pkg.duration || "4 Days / 3 Nights"}</span>
                    </div>
                  </div>
                </div>

                {/* Body Details Section */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 group-hover:text-[#008fe5] transition-colors leading-snug">
                      {pkg.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-1.5 leading-relaxed">
                      {pkg.description || "Enjoy a premium bundled itinerary featuring scenic tours, private transit, and curated stays."}
                    </p>
                  </div>

                  {/* Inclusions Row (Informative Bundle Pill Icons) */}
                  <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/60 space-y-2">
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">
                      Guaranteed Package Inclusions:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Plane size={13} className="text-[#008fe5] shrink-0" />
                        <span className="truncate">Roundtrip Flights</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Hotel size={13} className="text-indigo-500 shrink-0" />
                        <span className="truncate">4★/5★ Luxury Resort</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Car size={13} className="text-emerald-500 shrink-0" />
                        <span className="truncate">Airport Transfers</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-amber-500 shrink-0" />
                        <span className="truncate">Curated Guided Tour</span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Action Section */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 line-through font-bold">
                          {fmtPrice(originalPrice)}
                        </span>
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          SAVE 25%
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">
                          {fmtPrice(pkg.price)}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">/ person</span>
                      </div>
                    </div>

                    <button
                      onClick={() => openCheckoutModal(pkg)}
                      className="bg-[#008fe5] hover:bg-blue-600 active:scale-95 text-white font-black px-6 py-3 rounded-2xl text-xs transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Book Now</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

