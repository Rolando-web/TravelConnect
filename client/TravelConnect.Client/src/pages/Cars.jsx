import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Car, Fuel, Users, Gauge, Filter, Eye, ShieldCheck,
  MapPin, ArrowRight, CheckCircle2, SlidersHorizontal, LayoutGrid,
  LayoutList, Search, X, Calendar, KeyRound, ChevronRight, Star,
  Award, Clock, Compass, HelpCircle, Check
} from "lucide-react";
import { useBooking } from "../context/BookingContext";
import { useCurrency } from "../context/CurrencyContext";
import { useTheme } from "../context/ThemeContext";
import FavoriteButton from "../components/shared/FavoriteButton";
import { carsApi } from "../services/api";

const TYPE_FILTERS = [
  { id: "All", label: "All Fleet" },
  { id: "SUV", label: "Luxury SUVs" },
  { id: "Sedan", label: "Prestige Sedans" },
  { id: "Van", label: "Chauffeur Vans" },
  { id: "Convertible", label: "Convertibles" },
  { id: "MPV", label: "Executive MPVs" },
];

const CARS_HERO_IMAGE =
  "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1920&q=80";

const LUXURY_FALLBACK_CARS = [
  {
    id: 101,
    name: "Mercedes-Maybach S-Class",
    type: "Sedan",
    location: "Manila — Ninoy Aquino Int'l Airport",
    pricePerDay: 18500,
    transmission: "Automatic",
    seats: 4,
    fuelType: "Twin-Turbo Hybrid",
    imageUrl: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1600&q=80",
    tier: "Prestige Tier",
    tagline: "Chauffeur Flagship",
    acceleration: "4.4s 0-100",
    highlights: ["Rear First-Class Recline", "Burmester 4D Audio", "Acoustic Glass Insulation"]
  },
  {
    id: 102,
    name: "Range Rover Autobiography LWB",
    type: "SUV",
    location: "Cebu & Mactan VIP Terminal",
    pricePerDay: 16800,
    transmission: "Automatic",
    seats: 5,
    fuelType: "Mild Hybrid V8",
    imageUrl: "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1600&q=80",
    tier: "Flagship SUV",
    tagline: "Commanding Stance",
    acceleration: "4.6s 0-100",
    highlights: ["Executive Class Seating", "All-Wheel Steering", "Panoramic Meridian Lounge"]
  },
  {
    id: 103,
    name: "Porsche 911 Targa 4S",
    type: "Convertible",
    location: "Tagaytay & South Coast Highway",
    pricePerDay: 22500,
    transmission: "PDK Dual-Clutch",
    seats: 2,
    fuelType: "Twin-Turbo Boxer",
    imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
    tier: "Iconic Grand Tourer",
    tagline: "Open-Air Driving Emotion",
    acceleration: "3.6s 0-100",
    highlights: ["Sport Chrono Package", "Bose Surround Acoustics", "Active Sport Exhaust"]
  },
  {
    id: 104,
    name: "Lexus LM 350h Royal Lounge",
    type: "Van",
    location: "Manila — BGC & Makati VIP Direct",
    pricePerDay: 14500,
    transmission: "Automatic",
    seats: 4,
    fuelType: "Self-Charging Hybrid",
    imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1600&q=80",
    tier: "VIP Executive Lounge",
    tagline: "Mobile First-Class Suite",
    acceleration: "8.7s 0-100",
    highlights: ["48-inch Privacy Partition Screen", "Ottoman Massage Recliners", "Chilled Flute Bar"]
  },
  {
    id: 105,
    name: "BMW 740i Pure Excellence",
    type: "Sedan",
    location: "Clark Freeport Zone",
    pricePerDay: 15200,
    transmission: "Steptronic Sport",
    seats: 5,
    fuelType: "TwinPower Turbo",
    imageUrl: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1600&q=80",
    tier: "Contemporary Executive",
    tagline: "Technological Opulence",
    acceleration: "5.4s 0-100",
    highlights: ["Sky Lounge Panoramic Roof", "CraftedClarity Glass Accents", "Executive Drive Pro"]
  },
  {
    id: 106,
    name: "Toyota Alphard Executive Lounge",
    type: "MPV",
    location: "Davao & Samal Island VIP Port",
    pricePerDay: 11000,
    transmission: "Automatic",
    seats: 7,
    fuelType: "Gasoline V6",
    imageUrl: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1600&q=80",
    tier: "Chauffeur Choice",
    tagline: "Whisper-Quiet Transport",
    acceleration: "8.5s 0-100",
    highlights: ["Nappa Leather Captain Chairs", "Ceiling Reading Illumination", "Dual Sunroofs"]
  }
];

const toCarBooking = (car, days = 3) => ({
  id: `CAR-${car.id}`,
  name: `${car.name} Rental (${car.type})`,
  location: car.location,
  price: Number(car.pricePerDay || 0) * days,
  duration: `${days} Days Rental`,
  img: car.imageUrl,
  category: "car",
});

export default function Cars() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { openCheckoutModal } = useBooking();
  const { displayPrice, selectedCurrency, currentCurrency } = useCurrency();
  const { isDark } = useTheme();

  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [transmissionFilter, setTransmissionFilter] = useState("All");
  const [sortBy, setSortBy] = useState("featured");
  const [layoutMode, setLayoutMode] = useState("list"); // 'list' (Showroom Studio) or 'grid' (Architectural Gallery)
  const [activeDossierCar, setActiveDossierCar] = useState(null);

  const queryFrom = (searchParams.get("from") || "").toLowerCase().trim();

  useEffect(() => {
    let active = true;
    setLoading(true);
    carsApi
      .list()
      .then((data) => {
        if (!active) return;
        if (Array.isArray(data) && data.length > 0) {
          const enriched = data.map((c) => ({
            ...c,
            tier: Number(c.pricePerDay) > 10000 ? "Prestige Tier" : Number(c.pricePerDay) > 3000 ? "Executive Class" : "Curated Selection",
            tagline: c.type === "SUV" ? "All-Terrain Elegance" : c.type === "Van" ? "Chauffeur Escort" : "Effortless Touring",
            acceleration: c.type === "Sedan" ? "5.2s 0-100" : "6.8s 0-100",
            highlights: [
              "White-Glove Airport Handover",
              "Complimentary 24/7 Roadside Concierge",
              "Comprehensive Damage Protection Waiver"
            ]
          }));
          setCars(enriched);
        } else {
          setCars(LUXURY_FALLBACK_CARS);
        }
      })
      .catch(() => {
        if (active) setCars(LUXURY_FALLBACK_CARS);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredCars = useMemo(() => {
    return cars
      .filter((car) => {
        const matchesType =
          selectedType === "All" ||
          (car.type || "").toLowerCase().includes(selectedType.toLowerCase());

        const matchesQueryFrom =
          !queryFrom || (car.location || "").toLowerCase().includes(queryFrom);

        const matchesSearch =
          !searchQuery.trim() ||
          (car.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (car.location || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (car.type || "").toLowerCase().includes(searchQuery.toLowerCase());

        const matchesTransmission =
          transmissionFilter === "All" ||
          (car.transmission || "").toLowerCase().includes(transmissionFilter.toLowerCase());

        return matchesType && matchesQueryFrom && matchesSearch && matchesTransmission;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return Number(a.pricePerDay) - Number(b.pricePerDay);
        if (sortBy === "price-desc") return Number(b.pricePerDay) - Number(a.pricePerDay);
        return 0; // featured default
      });
  }, [cars, selectedType, queryFrom, searchQuery, transmissionFilter, sortBy]);

  const flagshipCar = useMemo(() => {
    return cars.find((c) => c.tier === "Prestige Tier" || Number(c.pricePerDay) > 12000) || cars[0] || LUXURY_FALLBACK_CARS[0];
  }, [cars]);

  const hasActiveFilters = selectedType !== "All" || searchQuery || transmissionFilter !== "All" || sortBy !== "featured";

  const resetFilters = () => {
    setSelectedType("All");
    setSearchQuery("");
    setTransmissionFilter("All");
    setSortBy("featured");
  };

  return (
    <div className="w-full bg-slate-50 dark:bg-[#0a0e17] text-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-300">
      {/* ─── Editorial Header / Concierge Masthead ─────────────────────── */}
      <section className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-white/[0.07] overflow-hidden">
        {/* Hero Background Image */}
        <div className="absolute inset-0">
          <img
            src={CARS_HERO_IMAGE}
            alt="Luxury chauffeur fleet"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-50 dark:to-[#0a0e17]" />
        </div>

        <div className="relative max-w-7xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-[0.2em] uppercase bg-white/15 text-white border border-white/25 backdrop-blur-md shadow-lg">
            <Car size={13} className="text-amber-300" />
            <span>The Private Fleet · Chauffeur &amp; Bespoke Hire</span>
          </div>

          <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-[0.06em] max-w-4xl mx-auto leading-[1.02] drop-shadow-lg">
            Drive the <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-amber-200 to-amber-400">Extraordinary</span>.
          </h1>

          <p className="text-slate-200 text-sm sm:text-base max-w-2xl mx-auto font-normal leading-relaxed drop-shadow">
            Prestige sedans, executive vans, and grand tourers — delivered to your airport terminal, hotel, or villa, fully insured and ready to go.
          </p>

          {/* Minimalist Trust Ribbon */}
          <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left border-t border-white/20">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white">
              <div className="p-2 rounded-xl bg-white/15 text-amber-300 shrink-0">
                <KeyRound size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">White-Glove Delivery</p>
                <p className="text-[11px] text-slate-200">Tarmac &amp; villa handover</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white">
              <div className="p-2 rounded-xl bg-white/15 text-amber-300 shrink-0">
                <ShieldCheck size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Zero Bond Deposit</p>
                <p className="text-[11px] text-slate-200">Transparent waivers included</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white">
              <div className="p-2 rounded-xl bg-white/15 text-amber-300 shrink-0">
                <Clock size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">24/7 Dedicated Host</p>
                <p className="text-[11px] text-slate-200">Real-time driver support</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white">
              <div className="p-2 rounded-xl bg-white/15 text-amber-300 shrink-0">
                <Award size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Immaculate Detailing</p>
                <p className="text-[11px] text-slate-200">Multi-stage sanitization</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Flagship Featured Car ────────────────────────────── */}
      {flagshipCar && !hasActiveFilters && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-white via-slate-50 to-sky-50/30 dark:from-[#131b2e] dark:via-[#0e1524] dark:to-[#0a0e17] border border-slate-200 dark:border-[#008fe5]/20 shadow-xl dark:shadow-2xl p-6 sm:p-10 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-5 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.25em] bg-[#008fe5]/10 text-[#008fe5] dark:text-sky-300 border border-[#008fe5]/25">
                  <Star size={11} className="fill-current text-[#008fe5]" /> Featured Car
                </div>

                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">{flagshipCar.type} · {flagshipCar.location}</p>
                  <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl text-slate-950 dark:text-white font-bold leading-tight">
                    {flagshipCar.name}
                  </h2>
                  <p className="text-xs text-[#008fe5] dark:text-sky-300 mt-1.5 font-medium">{flagshipCar.tagline || "Peak automotive luxury and effortless authority"}</p>
                </div>

                <div className="grid grid-cols-3 gap-3 py-4 border-y border-slate-200 dark:border-white/[0.08]">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-mono">SEATING</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{flagshipCar.seats} First-Class</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-mono">DRIVETRAIN</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate block">{flagshipCar.transmission}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-mono">POWERTRAIN</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate block">{flagshipCar.fuelType}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pt-2">
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-mono uppercase">Daily Rate</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-bold text-slate-950 dark:text-white font-heading">{displayPrice(Number(flagshipCar.pricePerDay || 0))}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">/ 24 hrs</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate(`/cars/${flagshipCar.id}`)}
                      className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-800 dark:text-white text-xs font-semibold tracking-wide border border-slate-200 dark:border-white/[0.1] transition-all flex items-center gap-1.5"
                    >
                      <Eye size={14} /> View Details
                    </button>
                    <button
                      onClick={() => openCheckoutModal(toCarBooking(flagshipCar))}
                      className="px-6 py-3 rounded-2xl bg-[#008fe5] hover:bg-[#007bc4] text-white text-xs font-bold tracking-wider uppercase transition-all shadow-md shadow-blue-500/20 hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      Reserve <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 relative group">
                <div className="relative h-72 sm:h-96 lg:h-[420px] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/[0.1] bg-slate-100 dark:bg-[#0c121e]">
                  <img
                    src={flagshipCar.imageUrl || "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1600&q=80"}
                    alt={flagshipCar.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                  <FavoriteButton
                    type="car"
                    item={flagshipCar}
                    className="absolute top-4 right-4 bg-white/90 dark:bg-black/50 backdrop-blur-md border border-slate-200 dark:border-white/20"
                  />
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-[#008fe5]" /> Tarmac Handover Included
                    </span>
                    <span className="font-mono text-sky-300 text-[11px]">{flagshipCar.acceleration || "Performance Tested"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── Concierge Filter & Command Bar ────────────────────────────── */}
      <section className="sticky top-16 z-20 bg-white/90 dark:bg-[#0a0e17]/90 backdrop-blur-xl border-y border-slate-200 dark:border-white/[0.07] py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Class Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1 text-[11px] uppercase tracking-widest font-mono">
              <Filter size={13} className="text-[#008fe5]" /> Class:
            </span>
            {TYPE_FILTERS.map((f) => {
              const active = selectedType === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedType(f.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? "bg-[#008fe5] text-white shadow-md shadow-blue-500/20"
                      : "bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200/80 dark:border-white/[0.05]"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Search, Sort, Layout Switcher */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search model or city..."
                className="w-full bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200/70 dark:hover:bg-white/[0.07] focus:bg-white dark:focus:bg-white/[0.09] text-slate-900 dark:text-white pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] focus:border-[#008fe5] focus:outline-none transition-all placeholder:text-slate-400 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Transmission Select */}
            <select
              value={transmissionFilter}
              onChange={(e) => setTransmissionFilter(e.target.value)}
              className="bg-slate-100 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 py-2 px-3 rounded-xl border border-slate-200 dark:border-white/[0.08] focus:border-[#008fe5] focus:outline-none cursor-pointer text-xs"
            >
              <option value="All" className="bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white">All Drivetrains</option>
              <option value="Automatic" className="bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white">Automatic</option>
              <option value="Manual" className="bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white">Manual / PDK</option>
            </select>

            {/* Price Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-100 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 py-2 px-3 rounded-xl border border-slate-200 dark:border-white/[0.08] focus:border-[#008fe5] focus:outline-none cursor-pointer text-xs"
            >
              <option value="featured" className="bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white">Best</option>
              <option value="price-asc" className="bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white">Price: Low to High</option>
              <option value="price-desc" className="bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white">Price: High to Low</option>
            </select>

            {/* Layout Toggle (Studio List vs Gallery Grid) */}
            <div className="flex items-center bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl p-0.5">
              <button
                onClick={() => setLayoutMode("list")}
                title="List view"
                className={`p-1.5 rounded-lg transition ${
                  layoutMode === "list" ? "bg-[#008fe5] text-white font-bold" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <LayoutList size={15} />
              </button>
              <button
                onClick={() => setLayoutMode("grid")}
                title="Grid view"
                className={`p-1.5 rounded-lg transition ${
                  layoutMode === "grid" ? "bg-[#008fe5] text-white font-bold" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <LayoutGrid size={15} />
              </button>
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-2.5 py-1.5 rounded-lg text-[11px] text-[#008fe5] dark:text-sky-300 bg-[#008fe5]/10 hover:bg-[#008fe5]/20 border border-[#008fe5]/25 transition flex items-center gap-1"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ─── Fleet Section ────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-slate-200 dark:border-white/[0.06] gap-2">
          <div>
            <span className="text-[11px] font-mono tracking-widest uppercase text-[#008fe5] dark:text-sky-300 block mb-1">
              Available Now
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
              {filteredCars.length} {filteredCars.length === 1 ? "car" : "cars"} found
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Prices in{" "}
            <span className="text-[#008fe5] dark:text-sky-300 font-mono font-bold">{selectedCurrency} ({currentCurrency.symbol})</span>
          </p>
        </div>

        {loading ? (
          <div className="py-24 text-center space-y-4">
            <div className="w-10 h-10 mx-auto rounded-full border-2 border-[#008fe5]/20 border-t-[#008fe5] animate-spin" />
            <p className="text-xs tracking-widest uppercase font-mono text-slate-500 dark:text-slate-400">Loading cars...</p>
          </div>
        ) : filteredCars.length === 0 ? (
          <div className="py-20 text-center space-y-4 rounded-3xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] max-w-xl mx-auto p-8 shadow-sm">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#008fe5]/10 text-[#008fe5] dark:text-sky-300 flex items-center justify-center">
              <Car size={22} />
            </div>
            <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white">No cars match your search</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Try a different category or clear your filters.
            </p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-xs font-semibold text-slate-800 dark:text-white transition border border-slate-200 dark:border-white/[0.1]"
            >
              Reset All Filters
            </button>
          </div>
        ) : layoutMode === "list" ? (
          /* ── Mode 1: Showroom Studio Panel Layout ── */
          <div className="space-y-6">
            {filteredCars.map((car) => (
              <div
                key={car.id}
                className="group relative rounded-3xl bg-white dark:bg-[#0f1422] hover:bg-slate-50/80 dark:hover:bg-[#131b2e] border border-slate-200/80 dark:border-white/[0.08] hover:border-[#008fe5]/50 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-xl"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                  {/* Left Column: Visual */}
                  <div
                    className="lg:col-span-5 relative h-64 sm:h-72 lg:h-[320px] overflow-hidden bg-slate-100 dark:bg-[#0a0e17] cursor-pointer"
                    onClick={() => navigate(`/cars/${car.id}`)}
                  >
                    <img
                      src={car.imageUrl || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80"}
                      alt={car.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70 lg:hidden" />

                    <span className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-sky-300 text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full border border-sky-400/20">
                      {car.tier || car.type || "Prestige"}
                    </span>

                    <FavoriteButton
                      type="car"
                      item={car}
                      className="absolute top-4 right-4 bg-white/90 dark:bg-black/60 backdrop-blur-md border border-slate-200 dark:border-white/10"
                    />

                    <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-[11px] text-white bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                      <MapPin size={12} className="text-[#008fe5]" />
                      <span className="truncate max-w-[200px]">{car.location}</span>
                    </div>
                  </div>

                  {/* Right Column: Details */}
                  <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-mono tracking-widest uppercase text-slate-500 dark:text-slate-400">
                          {car.type} Series · {car.transmission}
                        </span>
                        <span className="text-[11px] text-[#008fe5] dark:text-sky-300 font-semibold flex items-center gap-1">
                          <ShieldCheck size={13} className="text-[#008fe5]" /> Zero Excess Option
                        </span>
                      </div>

                      <h3
                        onClick={() => navigate(`/cars/${car.id}`)}
                        className="font-heading text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white hover:text-[#008fe5] dark:hover:text-sky-300 transition-colors cursor-pointer leading-snug"
                      >
                        {car.name}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-1">
                        {car.tagline || "Engineered for unmatched comfort, whisper-quiet cruising, and effortless dignity."}
                      </p>

                      {/* Technical Specs Strip */}
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-4 mt-4 border-y border-slate-200 dark:border-white/[0.06] text-xs">
                        <div className="flex items-center gap-2">
                          <Users size={15} className="text-[#008fe5] shrink-0" />
                          <div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight font-mono">CAPACITY</span>
                            <span className="text-slate-800 dark:text-slate-200 font-semibold">{car.seats} Seats</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Gauge size={15} className="text-[#008fe5] shrink-0" />
                          <div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight font-mono">DRIVE</span>
                            <span className="text-slate-800 dark:text-slate-200 font-semibold truncate">{car.transmission}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Fuel size={15} className="text-[#008fe5] shrink-0" />
                          <div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight font-mono">ENERGY</span>
                            <span className="text-slate-800 dark:text-slate-200 font-semibold truncate">{car.fuelType}</span>
                          </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-2">
                          <CheckCircle2 size={15} className="text-[#008fe5] shrink-0" />
                          <div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight font-mono">DELIVERY</span>
                            <span className="text-slate-800 dark:text-slate-200 font-semibold">VIP Handover</span>
                          </div>
                        </div>
                      </div>

                      {/* Inclusions */}
                      <div className="flex flex-wrap items-center gap-2 mt-4 text-[11px] text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] px-2.5 py-1 rounded-lg">
                          <Check size={12} className="text-[#008fe5]" /> Free Airport Drop-off
                        </span>
                        <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] px-2.5 py-1 rounded-lg">
                          <Check size={12} className="text-[#008fe5]" /> Unlimited Kilometers
                        </span>
                        <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] px-2.5 py-1 rounded-lg">
                          <Check size={12} className="text-[#008fe5]" /> 24/7 Roadside Chaperone
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-slate-200 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                      <div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider block">Daily Rate</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white font-heading">
                            {displayPrice(Number(car.pricePerDay || 0))}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">/ 24 hrs</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setActiveDossierCar(car)}
                          className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.09] text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-white/[0.08] transition flex items-center gap-1.5"
                        >
                          <Eye size={14} /> Quick Look
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/cars/${car.id}`)}
                          className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.09] text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-white/[0.08] transition"
                        >
                          Full Details
                        </button>
                        <button
                          type="button"
                          onClick={() => openCheckoutModal(toCarBooking(car))}
                          className="px-5 py-2.5 rounded-xl bg-[#008fe5] hover:bg-[#007bc4] text-white text-xs font-bold tracking-wider uppercase shadow-md shadow-blue-500/20 hover:-translate-y-0.5 transition"
                        >
                          Reserve
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Mode 2: Architectural Gallery Layout (2-Column) ── */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredCars.map((car) => (
              <div
                key={car.id}
                className="group relative rounded-3xl bg-white dark:bg-[#0f1422] hover:bg-slate-50 dark:hover:bg-[#131b2e] border border-slate-200/80 dark:border-white/[0.08] hover:border-[#008fe5]/40 transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-xl"
              >
                <div>
                  <div
                    className="relative h-64 sm:h-72 overflow-hidden bg-slate-100 dark:bg-[#0a0e17] cursor-pointer"
                    onClick={() => navigate(`/cars/${car.id}`)}
                  >
                    <img
                      src={car.imageUrl || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80"}
                      alt={car.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70" />

                    <span className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-sky-300 text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full border border-sky-400/20">
                      {car.tier || car.type || "Prestige"}
                    </span>

                    <FavoriteButton
                      type="car"
                      item={car}
                      className="absolute top-4 right-4 bg-white/90 dark:bg-black/60 backdrop-blur-md border border-slate-200 dark:border-white/10"
                    />

                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white">
                      <span className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[11px]">
                        <MapPin size={12} className="text-[#008fe5]" /> {car.location}
                      </span>
                      <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[11px] font-mono text-sky-300">
                        {car.transmission}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <span className="text-[10px] font-mono tracking-widest uppercase text-slate-500 dark:text-slate-400 block mb-1">
                        {car.type} Series · {car.fuelType}
                      </span>
                      <h3
                        onClick={() => navigate(`/cars/${car.id}`)}
                        className="font-heading text-2xl font-bold text-slate-950 dark:text-white hover:text-[#008fe5] dark:hover:text-sky-300 transition-colors cursor-pointer"
                      >
                        {car.name}
                      </h3>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-200 dark:border-white/[0.06] text-xs">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-[#008fe5]" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{car.seats} Seats</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Gauge size={14} className="text-[#008fe5]" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{car.transmission}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Fuel size={14} className="text-[#008fe5]" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{car.fuelType}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 flex items-end justify-between border-t border-slate-200 dark:border-white/[0.06] mt-4 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider block">Daily Rate</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-slate-950 dark:text-white font-heading">
                        {displayPrice(Number(car.pricePerDay || 0))}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">/ day</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveDossierCar(car)}
                      className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.09] text-slate-700 dark:text-slate-300 transition border border-slate-200 dark:border-white/[0.08]"
                      title="Quick Look"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/cars/${car.id}`)}
                      className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.09] text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-white/[0.08] transition"
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => openCheckoutModal(toCarBooking(car))}
                      className="px-4 py-2.5 rounded-xl bg-[#008fe5] hover:bg-[#007bc4] text-white text-xs font-bold tracking-wider uppercase transition shadow-md shadow-blue-500/20"
                    >
                      Reserve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Concierge Inquiry Banner ──────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl relative overflow-hidden">
          <div className="space-y-2 max-w-xl">
            <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 block">
              Chauffeur &amp; Extended Lease Service
            </span>
            <h3 className="font-heading text-2xl sm:text-3xl font-bold">
              Need a chauffeur or airport pickup?
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed">
              Tell us your itinerary and we will arrange a professional driver, tarmac pickup, or multi-day lease anywhere in the country.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <Link
              to="/hotels"
              className="px-6 py-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-semibold border border-white/[0.1] transition-all"
            >
              Explore Hotels
            </Link>
            <button
              onClick={() => {
                const sampleCar = filteredCars[0] || cars[0];
                if (sampleCar) openCheckoutModal(toCarBooking(sampleCar, 5));
              }}
              className="px-6 py-3 rounded-2xl bg-[#008fe5] hover:bg-[#007bc4] text-slate-950 text-xs font-bold tracking-wider uppercase shadow-lg hover:shadow-blue-500/25 transition-all"
            >
              Get a Quote
            </button>
          </div>
        </div>
      </section>

      {/* ─── Vehicle Dossier Modal ────────────────────────────────────── */}
      {activeDossierCar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#008fe5]/30 rounded-3xl overflow-hidden shadow-2xl space-y-0 text-slate-900 dark:text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Image */}
            <div className="relative h-64 w-full bg-slate-900 overflow-hidden">
              <img
                src={activeDossierCar.imageUrl || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80"}
                alt={activeDossierCar.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
              <button
                onClick={() => setActiveDossierCar(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 border border-white/20 transition"
              >
                <X size={18} />
              </button>
              <div className="absolute bottom-4 left-6">
                <span className="text-[10px] font-mono uppercase tracking-widest text-sky-300 bg-black/60 px-3 py-1 rounded-full border border-sky-400/30">
                  {activeDossierCar.tier || activeDossierCar.type}
                </span>
                <h3 className="font-heading text-3xl font-bold text-white mt-1">{activeDossierCar.name}</h3>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 sm:p-8 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/[0.08] pb-4">
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-[#008fe5]" /> {activeDossierCar.location}</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{activeDossierCar.type} Class</span>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Passenger</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{activeDossierCar.seats} Seats</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Gearbox</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{activeDossierCar.transmission}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Fuel/Power</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{activeDossierCar.fuelType}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Assistance</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">24/7 Included</span>
                </div>
              </div>

              {/* Inclusions */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400">Included with Every Rental</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#008fe5] shrink-0" />
                    <span>Complimentary airport/villa delivery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#008fe5] shrink-0" />
                    <span>Comprehensive vehicle damage waiver</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#008fe5] shrink-0" />
                    <span>Unlimited daily mileage allowance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#008fe5] shrink-0" />
                    <span>Free cancellation up to 24h prior</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 bg-slate-50 dark:bg-[#0a0f1d] border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block">Daily Rate</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-heading text-slate-950 dark:text-white">{displayPrice(Number(activeDossierCar.pricePerDay || 0))}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">/ 24 hrs</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const carId = activeDossierCar.id;
                    setActiveDossierCar(null);
                    navigate(`/cars/${carId}`);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-white/[0.05] hover:bg-slate-300 dark:hover:bg-white/[0.1] text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/[0.1] transition"
                >
                  Full Page View
                </button>
                <button
                  onClick={() => {
                    const target = activeDossierCar;
                    setActiveDossierCar(null);
                    openCheckoutModal(toCarBooking(target));
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#008fe5] hover:bg-[#007bc4] text-slate-950 text-xs font-bold uppercase tracking-wider shadow-md shadow-blue-500/20 transition"
                >
                  Reserve Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
