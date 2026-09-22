import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  MapPin, ArrowLeft, ShieldCheck, Users, Gauge, Fuel,
  ChevronLeft, ChevronRight, ChevronDown, KeyRound, Timer,
  Award, Star, Check, AlertCircle
} from "lucide-react";
import { carsApi } from "../services/api";
import { useBooking } from "../context/BookingContext";
import { useCurrency } from "../context/CurrencyContext";
import FavoriteButton from "../components/shared/FavoriteButton";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1600&q=80";

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
    acceleration: "4.4s 0-100 km/h",
    power: "503 HP",
    status: "Active",
    highlights: ["Rear First-Class Recline", "Burmester 4D Audio", "Acoustic Glass Insulation", "Executive Chilled Bar"]
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
    imageUrl: "https://images.unsplash.com/photo-1541348263662-e0c82661c00e?auto=format&fit=crop&w=1600&q=80",
    tier: "Flagship SUV",
    tagline: "Commanding Stance",
    acceleration: "4.6s 0-100 km/h",
    power: "523 HP",
    status: "Active",
    highlights: ["Executive Class Seating", "All-Wheel Steering", "Panoramic Meridian Lounge", "Terrain Response 2"]
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
    acceleration: "3.6s 0-100 km/h",
    power: "443 HP",
    status: "Active",
    highlights: ["Sport Chrono Package", "Bose Surround Acoustics", "Active Sport Exhaust", "PASM Sport Suspension"]
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
    acceleration: "8.7s 0-100 km/h",
    power: "247 HP",
    status: "Active",
    highlights: ["48-inch Privacy Partition Screen", "Ottoman Massage Recliners", "Chilled Flute Bar", "Mark Levinson 3D"]
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
    acceleration: "5.4s 0-100 km/h",
    power: "375 HP",
    status: "Active",
    highlights: ["Sky Lounge Panoramic Roof", "CraftedClarity Glass Accents", "Executive Drive Pro", "BMW Curved Display"]
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
    acceleration: "8.5s 0-100 km/h",
    power: "296 HP",
    status: "Active",
    highlights: ["Nappa Leather Captain Chairs", "Ceiling Reading Illumination", "Dual Sunroofs", "JBL Premium Audio"]
  }
];

const ANGLE_SHOTS = [
  { label: "Exterior Stance", image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80" },
  { label: "Interior Lounge", image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1600&q=80" },
  { label: "Cockpit & Controls", image: "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1600&q=80" },
];

const DURATION_OPTIONS = [
  { days: 1, label: "24 Hours", discount: 0 },
  { days: 3, label: "3 Days (Recommended)", discount: 0.05 },
  { days: 7, label: "7 Days VIP Week", discount: 0.12 },
];

export default function CarDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openCheckoutModal } = useBooking();
  const { displayPrice } = useCurrency();

  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [selectedDays, setSelectedDays] = useState(3);
  const [showBreakdown, setShowBreakdown] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    carsApi
      .get(id)
      .then((data) => {
        if (!active) return;
        if (data && data.id) {
          setCar({
            ...data,
            tier: Number(data.pricePerDay) > 10000 ? "Prestige Tier" : Number(data.pricePerDay) > 3000 ? "Executive Class" : "Curated Selection",
            tagline: data.type === "SUV" ? "All-Terrain Elegance" : data.type === "Van" ? "Chauffeur Escort" : "Effortless Touring",
            acceleration: data.type === "Sedan" ? "5.2s 0-100 km/h" : "6.8s 0-100 km/h",
            power: "320 HP",
            status: data.status || "Active"
          });
        } else {
          const fallbackMatch = LUXURY_FALLBACK_CARS.find((c) => String(c.id) === String(id));
          setCar(fallbackMatch || LUXURY_FALLBACK_CARS[0]);
        }
      })
      .catch(() => {
        if (!active) return;
        const fallbackMatch = LUXURY_FALLBACK_CARS.find((c) => String(c.id) === String(id));
        setCar(fallbackMatch || LUXURY_FALLBACK_CARS[0]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e17] text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
        <p className="text-xs font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400">Retrieving Vehicle Dossier...</p>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e17] text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertCircle size={36} className="text-amber-500" />
        <h2 className="font-heading text-2xl font-bold">Vehicle Specification Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">The vehicle requested may have concluded its reservation window.</p>
        <Link
          to="/cars"
          className="mt-2 px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider"
        >
          Return to Fleet Collection
        </Link>
      </div>
    );
  }

  const primary = car.imageUrl || FALLBACK_IMG;
  const gallery = [
    { label: "Showcase", image: primary },
    ...ANGLE_SHOTS.filter((s) => s.image !== primary)
  ];
  const activeSlide = gallery[galleryIdx] || gallery[0];

  const daily = Number(car.pricePerDay || 0);
  const activeDurationOption = DURATION_OPTIONS.find((o) => o.days === selectedDays) || DURATION_OPTIONS[1];
  const rawTotal = daily * selectedDays;
  const discountAmount = Math.round(rawTotal * activeDurationOption.discount);
  const finalTotal = rawTotal - discountAmount;

  const toBooking = (carObj, daysCount) => ({
    id: `CAR-${carObj.id}`,
    name: `${carObj.name} Rental (${carObj.type})`,
    location: carObj.location,
    price: finalTotal,
    duration: `${daysCount} Days Rental`,
    img: carObj.imageUrl,
    category: "car",
  });

  const specCards = [
    { Icon: Users, label: "Seating Capacity", value: `${car.seats} First-Class Seats`, sub: "Nappa leather executive configuration" },
    { Icon: Gauge, label: "Transmission", value: car.transmission, sub: "Dynamic drive selector & paddle-shift" },
    { Icon: Fuel, label: "Powertrain & Energy", value: car.fuelType, sub: "High-efficiency acoustic damping" },
    { Icon: Timer, label: "0-100 Acceleration", value: car.acceleration || "4.8s Benchmark", sub: "Factory certified performance" },
  ];

  const inclusions = [
    {
      title: "White-Glove Airport Handover",
      sub: `Hand-delivered directly to private jet FBO or commercial arrival gate at ${car.location}.`,
      badge: "VIP Service"
    },
    {
      title: "Zero-Deductible Damage Waiver",
      sub: "Comprehensive loss & damage protection included with zero security bond lock.",
      badge: "Full Protection"
    },
    {
      title: "Unlimited Touring Mileage",
      sub: "Absolute freedom to explore with no restrictive kilometer caps or distance penalties.",
      badge: "Unlimited"
    },
    {
      title: "24/7 Dedicated Concierge Host",
      sub: "Direct phone and messaging contact with your assigned automotive host at all times.",
      badge: "Always Active"
    },
    {
      title: "Full Bespoke Sanitization",
      sub: "Multi-stage interior sterilization and ozone detailing performed prior to delivery.",
      badge: "Sanitized"
    },
    {
      title: "Flexible 24h Cancellation",
      sub: "100% full refund guarantee when adjusted up to 24 hours before your scheduled handover.",
      badge: "Risk-Free"
    },
  ];

  return (
    <div className="w-full bg-slate-50 dark:bg-[#0a0e17] text-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-300 pb-20">
      {/* ─── Breadcrumb ───────────────────── */}
      <div className="relative z-30 bg-white dark:bg-[#070b13] border-b border-slate-200 dark:border-white/[0.07] py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/cars")}
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 transition"
          >
            <ArrowLeft size={15} /> Fleet Collection
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <Link to="/" className="hover:text-slate-900 dark:hover:text-slate-300 transition">Home</Link> /
            <Link to="/cars" className="hover:text-slate-900 dark:hover:text-slate-300 transition">Cars</Link> /
            <span className="text-amber-700 dark:text-amber-300 font-semibold truncate max-w-[140px] sm:max-w-none">{car.name}</span>
          </div>
        </div>
      </div>

      {/* ─── Showcase Gallery Hero ─────────────────────────── */}
      <section className="relative pt-8 pb-12 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-white/[0.07] overflow-hidden bg-white dark:bg-gradient-to-b dark:from-[#070b13] dark:to-[#0a0e17]">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Title Bar */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25 font-bold">
                  {car.tier || "Prestige Fleet"}
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]">
                  {car.type} Series
                </span>
              </div>
              <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-bold text-slate-950 dark:text-white leading-tight">
                {car.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal flex items-center gap-2">
                <MapPin size={14} className="text-amber-500" />
                <span>Stationed at {car.location} · Available for immediate tarmac or villa handover</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <FavoriteButton
                type="car"
                item={car}
                className="w-12 h-12 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white hover:text-rose-500"
              />
              <button
                onClick={() => openCheckoutModal(toBooking(car, selectedDays))}
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-amber-500/20 transition-all flex items-center gap-2"
              >
                <KeyRound size={15} /> Reserve This Vehicle
              </button>
            </div>
          </div>

          {/* Panoramic Visual Canvas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Main Stage */}
            <div className="lg:col-span-9 relative">
              <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-white/[0.1] bg-slate-900 h-[340px] sm:h-[480px] shadow-xl group">
                <img
                  src={activeSlide.image}
                  alt={`${car.name} — ${activeSlide.label}`}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                {/* Perspective Badge */}
                <div className="absolute top-5 left-5 bg-black/60 backdrop-blur-md border border-white/15 rounded-full px-4 py-1.5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-200">
                    {activeSlide.label}
                  </span>
                </div>

                {/* Nav Arrows */}
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

                {/* Bottom Spec Preview Bar */}
                <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-3 px-5 flex items-center justify-between text-xs text-white">
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-amber-400" />
                    <span className="hidden sm:inline">Certified Concierge Vehicle</span>
                    <span>· Zero Security Bond</span>
                  </span>
                  <span className="font-mono text-amber-300 text-[11px]">
                    {car.acceleration || "Performance Ready"}
                  </span>
                </div>
              </div>

              {/* Thumbnails Strip */}
              <div className="flex items-center gap-3 mt-4 overflow-x-auto pb-1 scrollbar-none">
                {gallery.map((slide, idx) => (
                  <button
                    key={slide.label}
                    onClick={() => setGalleryIdx(idx)}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all h-20 w-32 flex-shrink-0 ${
                      idx === galleryIdx
                        ? "border-amber-500 shadow-md shadow-amber-500/20 scale-100"
                        : "border-slate-200 dark:border-white/10 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={slide.image} alt={slide.label} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30" />
                    <span className="absolute bottom-1.5 left-2 text-[9px] font-mono uppercase tracking-wider text-white">
                      {slide.label.split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Metrics Column */}
            <div className="lg:col-span-3 space-y-4">
              <div className="p-6 rounded-3xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-400 block font-bold">
                  Automotive Highlights
                </span>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                    <span className="text-slate-500 dark:text-slate-400">Class Rating</span>
                    <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                      <Star size={12} className="text-amber-500 fill-current" /> 5.0 Star Luxe
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                    <span className="text-slate-500 dark:text-slate-400">Chauffeur Ready</span>
                    <span className="text-amber-700 dark:text-amber-300 font-semibold">Available on Request</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                    <span className="text-slate-500 dark:text-slate-400">Delivery Status</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Check size={13} /> Immediate Dispatch
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Fuel Policy</span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold">Full-to-Full</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                    <p className="text-amber-800 dark:text-amber-200/90 font-medium">
                      "{car.tagline || 'Engineered for commanding luxury, whisper-quiet cruising, and effortless dignity.'}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Host Assistance Card */}
              <div className="p-5 rounded-3xl bg-slate-100 dark:bg-[#121929] border border-sky-500/30 text-xs space-y-2">
                <div className="flex items-center gap-2 text-[#008fe5] dark:text-[#38bdf8] font-semibold">
                  <Award size={14} /> Personal Automotive Host
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Need a custom tarmac meet, security detail, or child safety seats? Your host prepares every detail prior to arrival.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Specifications & Inclusions ────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Main Dossier Column */}
          <div className="lg:col-span-8 space-y-12">
            {/* Technical Specifications Grid */}
            <section className="space-y-6">
              <div className="border-b border-slate-200 dark:border-white/[0.07] pb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-400 block mb-1 font-bold">
                  Engineering &amp; Cabin Architecture
                </span>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
                  Vehicle Specifications
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {specCards.map(({ Icon, label, value, sub }) => (
                  <div
                    key={label}
                    className="p-5 rounded-3xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-white/[0.08] hover:border-amber-400/40 transition-all flex items-start gap-4 shadow-sm"
                  >
                    <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300 shrink-0">
                      <Icon size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        {label}
                      </span>
                      <p className="font-heading text-lg font-bold text-slate-950 dark:text-white mt-0.5">{value}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Inclusions */}
            <section className="space-y-6">
              <div className="border-b border-slate-200 dark:border-white/[0.07] pb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-400 block mb-1 font-bold">
                  Complimentary With Every Reservation
                </span>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
                  The White-Glove Standard
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {inclusions.map((item) => (
                  <div
                    key={item.title}
                    className="p-5 rounded-3xl bg-white dark:bg-[#0f1422] border border-slate-200/80 dark:border-white/[0.08] flex items-start gap-4 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                      <Check size={13} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                        <span className="text-[9px] font-mono uppercase tracking-wider bg-slate-100 dark:bg-white/[0.05] text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full border border-slate-200 dark:border-white/10 font-bold">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ─── Sticky Concierge Reservation Sidebar ──────────────────── */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            <aside className="rounded-3xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-amber-400/30 p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-6 relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/[0.08]">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-400 block font-bold">
                    Bespoke Hire
                  </span>
                  <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white">Reserve Vehicle</h3>
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25 font-bold">
                  Available Now
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Daily Investment Rate
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="font-heading text-3xl sm:text-4xl font-bold text-slate-950 dark:text-white">
                    {displayPrice(daily)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">/ 24 hrs</span>
                </div>
              </div>

              {/* Duration Selector */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Select Rental Window
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setSelectedDays(opt.days)}
                      className={`py-2.5 px-2 rounded-2xl text-center border transition-all ${
                        selectedDays === opt.days
                          ? "bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-md shadow-amber-500/20"
                          : "bg-slate-50 dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.07]"
                      }`}
                    >
                      <span className="block font-mono text-[11px]">{opt.days} {opt.days === 1 ? "Day" : "Days"}</span>
                      {opt.discount > 0 && (
                        <span className="text-[9px] block text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                          Save {Math.round(opt.discount * 100)}%
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Breakdown */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02] overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="w-full flex items-center justify-between p-3.5 text-slate-700 dark:text-slate-300 transition"
                >
                  <span className="font-mono text-[11px] uppercase tracking-wider font-semibold">Investment Breakdown</span>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform ${showBreakdown ? "rotate-180" : ""}`} />
                </button>

                {showBreakdown && (
                  <div className="p-4 pt-1 space-y-2 border-t border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Rate ({selectedDays} × {displayPrice(daily)})</span>
                      <span className="text-slate-900 dark:text-white font-mono font-medium">{displayPrice(rawTotal)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Duration Privilege Discount</span>
                        <span className="font-mono font-bold">-{displayPrice(discountAmount)}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span>Damage Waiver &amp; Insurance</span>
                      <span className="text-amber-700 dark:text-amber-300 font-semibold">Included</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Airport / Hotel Handover</span>
                      <span className="text-amber-700 dark:text-amber-300 font-semibold">Free Delivery</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/[0.08] text-sm font-bold text-slate-950 dark:text-white">
                      <span>Total Investment</span>
                      <span className="text-xl text-amber-700 dark:text-amber-300 font-mono">{displayPrice(finalTotal)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Reservation CTA Button */}
              <button
                onClick={() => openCheckoutModal(toBooking(car, selectedDays))}
                className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-widest transition-all shadow-md hover:shadow-amber-500/25 hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <KeyRound size={16} /> Confirm &amp; Reserve Vehicle
              </button>

              <div className="pt-2 text-center space-y-1.5">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal flex items-center justify-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber-500" />
                  <span>Zero Bond Hold · 100% Refundable up to 24h</span>
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  Supported via PayMongo (GCash, Cards, PayMaya)
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
