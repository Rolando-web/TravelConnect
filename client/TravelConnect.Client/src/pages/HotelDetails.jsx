import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Star, MapPin, ArrowLeft, ShieldCheck,
  ChevronLeft, ChevronRight, ChevronDown, KeyRound,
  Award, Check, BedDouble, AlertCircle, PhoneCall
} from "lucide-react";
import { hotelsApi } from "../services/api";
import { useBooking } from "../context/BookingContext";
import { useCurrency } from "../context/CurrencyContext";
import FavoriteButton from "../components/shared/FavoriteButton";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80";

const LUXURY_FALLBACK_HOTELS = [
  {
    id: 1,
    name: "Shangri-La Boracay Resort & Spa",
    location: "Boracay, Visayas",
    pricePerNight: 16500,
    rating: 4.9,
    reviews: 420,
    roomsAvailable: 12,
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80",
    tier: "Private Island Sanctuary",
    tagline: "Secluded beachfront luxury with cliffside infinity pools",
    amenities: "Private Plunge Pool|Spa Sanctuary|Secluded Beach|Gourmet Dining|Speedboat Transfer|Free High-Speed Wi-Fi",
    highlights: ["Speedboat Airport Transfer", "Daily Champagne Breakfast", "Complimentary Sea Kayaking"]
  },
  {
    id: 2,
    name: "El Nido Pangulasian Island Eco-Luxe",
    location: "El Nido, Palawan",
    pricePerNight: 24800,
    rating: 5.0,
    reviews: 310,
    roomsAvailable: 6,
    imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=80",
    tier: "Signature Eco-Luxe",
    tagline: "Pristine marine sanctuary with private villa beach frontage",
    amenities: "Private Beach|Coral Reef Snorkeling|Infinity Pool|Organic Spa|Private Butler|Free Wi-Fi",
    highlights: ["Marine Sanctuary Excursion", "Private Villa Butler", "Sunset Catamaran Cruise"]
  },
  {
    id: 3,
    name: "Aegean Blue Cliffside Suites",
    location: "Santorini, Greece",
    pricePerNight: 19200,
    rating: 4.9,
    reviews: 419,
    roomsAvailable: 8,
    imageUrl: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1600&q=80",
    tier: "Caldera View Suite",
    tagline: "Panoramic Aegean sunsets and carved cliff plunge pools",
    amenities: "Caldera Plunge Pool|Greek Breakfast Deck|Private Terrace|Airport Transfer|Cocktail Bar",
    highlights: ["Private Caldera Sunset Deck", "Daily Sommelier Wine Tasting", "Helicopter Transfer Option"]
  },
  {
    id: 4,
    name: "Aman Tokyo Horizon Residence",
    location: "Tokyo, Japan",
    pricePerNight: 28500,
    rating: 4.9,
    reviews: 512,
    roomsAvailable: 5,
    imageUrl: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1600&q=80",
    tier: "High-Elevation Sanctuary",
    tagline: "Serene Japanese minimalism high above the Otemachi district",
    amenities: "Thermal Traditional Baths|Panoramic Pool|30-meter High Ceiling Lounge|Bespoke Spa",
    highlights: ["Traditional Onsen Access", "Exclusive Tea Master Ceremony", "Chauffeur Airport Escort"]
  },
  {
    id: 5,
    name: "Bali Cliffside Pool Villas",
    location: "Uluwatu, Bali",
    pricePerNight: 14500,
    rating: 4.8,
    reviews: 356,
    roomsAvailable: 14,
    imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1600&q=80",
    tier: "Oceanview Haven",
    tagline: "Suspended 150 meters above the Indian Ocean with infinity water cascades",
    amenities: "Infinity Pool|Ayurvedic Spa|Clifftop Dining|Yoga Pavilion|Free Wi-Fi",
    highlights: ["Daily Morning Yoga Sessions", "Floating Villa Breakfast", "Direct Beach Club Access"]
  },
  {
    id: 6,
    name: "Le Rêve Paris Boutique Palace",
    location: "Paris, France",
    pricePerNight: 21500,
    rating: 4.8,
    reviews: 540,
    roomsAvailable: 9,
    imageUrl: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1600&q=80",
    tier: "Haute Hospitality",
    tagline: "Parisian elegance minutes from the Champs-Élysées with private gardens",
    amenities: "Courtyard Garden|Michelin-starred Dining|Concierge Keys|Dior Spa|Free Wi-Fi",
    highlights: ["Private Museum Access Pass", "Courtyard Champagne Lounge", "Limousine Transfers"]
  }
];

const ANGLE_SHOTS = [
  { label: "Master Suite", image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80" },
  { label: "Private Plunge Pool", image: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1600&q=80" },
  { label: "Dining Veranda", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1600&q=80" },
];

const STAY_OPTIONS = [
  { nights: 1, label: "1 Night Stay", discount: 0 },
  { nights: 3, label: "3 Nights (Save 10%)", discount: 0.10 },
  { nights: 7, label: "7 Nights (Save 20%)", discount: 0.20 },
];

export default function HotelDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openCheckoutModal } = useBooking();
  const { displayPrice } = useCurrency();

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [selectedNights, setSelectedNights] = useState(3);
  const [showBreakdown, setShowBreakdown] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    hotelsApi
      .get(id)
      .then((data) => {
        if (!active) return;
        if (data && data.id) {
          setHotel({
            ...data,
            tier: Number(data.pricePerNight) > 15000 ? "Private Sanctuary" : "Bespoke Stay",
            tagline: data.description || "Unrivalled hospitality, serene privacy, and immaculate service.",
            rating: Number(data.rating || 4.9),
            reviews: data.reviews || 240,
          });
        } else {
          const match = LUXURY_FALLBACK_HOTELS.find((h) => String(h.id) === String(id));
          setHotel(match || LUXURY_FALLBACK_HOTELS[0]);
        }
      })
      .catch(() => {
        if (!active) return;
        const match = LUXURY_FALLBACK_HOTELS.find((h) => String(h.id) === String(id));
        setHotel(match || LUXURY_FALLBACK_HOTELS[0]);
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
        <p className="text-xs font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400">Opening Sanctuary Dossier...</p>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e17] text-slate-900 dark:text-white flex flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertCircle size={36} className="text-amber-500" />
        <h2 className="font-heading text-2xl font-bold">Property Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">The selected sanctuary may currently be closed for private residency.</p>
        <Link
          to="/hotels"
          className="mt-2 px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider"
        >
          Return to All Sanctuaries
        </Link>
      </div>
    );
  }

  const primary = hotel.imageUrl || FALLBACK_IMG;
  const gallery = [
    { label: "Exterior View", image: primary },
    ...ANGLE_SHOTS.filter((s) => s.image !== primary)
  ];
  const activeSlide = gallery[galleryIdx] || gallery[0];

  const nightly = Number(hotel.pricePerNight || 0);
  const activeStayOption = STAY_OPTIONS.find((o) => o.nights === selectedNights) || STAY_OPTIONS[1];
  const rawTotal = nightly * selectedNights;
  const discountAmount = Math.round(rawTotal * activeStayOption.discount);
  const finalTotal = rawTotal - discountAmount;

  const toBooking = (hotelObj, nightsCount) => ({
    id: `HOTEL-${hotelObj.id}`,
    name: hotelObj.name,
    location: hotelObj.location,
    price: finalTotal,
    duration: `${nightsCount} Nights Stay`,
    img: hotelObj.imageUrl,
    category: "hotel",
  });

  const suiteSpecs = [
    { Icon: BedDouble, label: "Living Space", value: "95 sqm (1,020 sq ft)", sub: "Open-plan indoor & outdoor terrace" },
    { Icon: Star, label: "Bedding Configuration", value: "King Serta Featherbed", sub: "600-thread count Egyptian linens" },
    { Icon: Award, label: "Occupancy", value: "Up to 3 Guests", sub: "Child extra bed complimentary" },
    { Icon: PhoneCall, label: "Butler Service", value: "24/7 Dedicated Butler", sub: "On-call luggage & dining concierge" },
  ];

  const inclusions = [
    {
      title: "Roundtrip Speedboat / Tarmac Transfer",
      sub: `Seamless arrival service directly from the airport terminal to ${hotel.name}.`,
      badge: "Complimentary"
    },
    {
      title: "Daily Gourmet Champagne Breakfast",
      sub: "A la carte hot dishes, fresh local juices, and barista-brewed coffee served anywhere in the resort.",
      badge: "Included"
    },
    {
      title: "Evening Sundowner Cocktails",
      sub: "Signature artisan cocktails and canapés served at sunset overlooking the horizon.",
      badge: "VIP Privilege"
    },
    {
      title: "Thermal Suite & Spa Hydrotherapy",
      sub: "Unlimited access to steam chambers, Finnish sauna, and vitality hydrotherapy pools.",
      badge: "Wellness"
    },
    {
      title: "Complimentary High-Speed Satellite Wi-Fi",
      sub: "High-bandwidth connectivity throughout all suites, private decks, and resort grounds.",
      badge: "Unlimited"
    },
    {
      title: "Flexible 24h Cancellation Guarantee",
      sub: "Full refund privilege when notice is provided at least 24 hours prior to scheduled check-in.",
      badge: "Risk-Free"
    },
  ];

  return (
    <div className="w-full bg-slate-50 dark:bg-[#0a0e17] text-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-300 pb-20">
      {/* ─── Breadcrumb ───────────────────── */}
      <div className="relative z-30 bg-white dark:bg-[#070b13] border-b border-slate-200 dark:border-white/[0.07] py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/hotels")}
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 transition"
          >
            <ArrowLeft size={15} /> All Sanctuaries
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <Link to="/" className="hover:text-slate-900 dark:hover:text-slate-300 transition">Home</Link> /
            <Link to="/hotels" className="hover:text-slate-900 dark:hover:text-slate-300 transition">Hotels</Link> /
            <span className="text-amber-700 dark:text-amber-300 font-semibold truncate max-w-[140px] sm:max-w-none">{hotel.name}</span>
          </div>
        </div>
      </div>

      {/* ─── Showcase Gallery Hero ─────────────────────────── */}
      <section className="relative pt-8 pb-12 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-white/[0.07] overflow-hidden bg-white dark:bg-gradient-to-b dark:from-[#070b13] dark:to-[#0a0e17]">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Title Bar */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25 font-bold">
                  {hotel.tier || "5-Star Luxury Haven"}
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08] flex items-center gap-1">
                  <Star size={11} className="text-amber-500 fill-amber-500" /> {Number(hotel.rating || 4.9).toFixed(1)} Rating
                </span>
              </div>
              <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-bold text-slate-950 dark:text-white leading-tight">
                {hotel.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal flex items-center gap-2">
                <MapPin size={14} className="text-amber-500" />
                <span>{hotel.location} · Seamless airport &amp; tarmac transfer included</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <FavoriteButton
                type="hotel"
                item={hotel}
                className="w-12 h-12 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white hover:text-rose-500"
              />
              <button
                onClick={() => openCheckoutModal(toBooking(hotel, selectedNights))}
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-amber-500/20 transition-all flex items-center gap-2"
              >
                <KeyRound size={15} /> Reserve Suite
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
                  alt={`${hotel.name} — ${activeSlide.label}`}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

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
                    <span className="hidden sm:inline">Verified Luxury Haven</span>
                    <span>· Free Cancellation up to 24h</span>
                  </span>
                  <span className="font-mono text-amber-300 text-[11px]">
                    {hotel.roomsAvailable ?? 8} Suites Available
                  </span>
                </div>
              </div>

              {/* Thumbnails */}
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
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#008fe5] dark:text-[#38bdf8] block font-bold">
                  Resort Privileges
                </span>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                    <span className="text-slate-500 dark:text-slate-400">Breakfast</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Check size={13} /> Included Daily
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                    <span className="text-slate-500 dark:text-slate-400">Airport Transfer</span>
                    <span className="text-[#008fe5] dark:text-[#38bdf8] font-semibold">Speedboat / Car</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                    <span className="text-slate-500 dark:text-slate-400">Early Check-In</span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold">Upon Request</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Sanctuary Host</span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold">24/7 Butler</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                    <p className="text-sky-800 dark:text-sky-200/90 font-medium">
                      "{hotel.tagline || 'Unrivalled hospitality, serene privacy, and immaculate service.'}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Host Assistance Card */}
              <div className="p-5 rounded-3xl bg-slate-100 dark:bg-[#121929] border border-sky-500/30 text-xs space-y-2">
                <div className="flex items-center gap-2 text-[#008fe5] dark:text-[#38bdf8] font-semibold">
                  <Award size={14} /> Personal Hospitality Butler
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Prefer a specific floor, dietary arrangement, or private beach candlelit dinner? Your host arranges everything prior to your arrival.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Suite Specs & Inclusions ─────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Main Column */}
          <div className="lg:col-span-8 space-y-12">
            {/* Suite Specifications */}
            <section className="space-y-6">
              <div className="border-b border-slate-200 dark:border-white/[0.07] pb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-400 block mb-1 font-bold">
                  Suite Architecture &amp; Amenities
                </span>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
                  Room &amp; Suite Specifications
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {suiteSpecs.map(({ Icon, label, value, sub }) => (
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
                  Complimentary With Every Stay
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
                    Direct Sanctuary Booking
                  </span>
                  <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white">Reserve Suite</h3>
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25 font-bold">
                  Instant Confirmation
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Nightly Investment Rate
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="font-heading text-3xl sm:text-4xl font-bold text-slate-950 dark:text-white">
                    {displayPrice(nightly)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">/ night</span>
                </div>
              </div>

              {/* Duration Selector */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Select Length of Stay
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {STAY_OPTIONS.map((opt) => (
                    <button
                      key={opt.nights}
                      type="button"
                      onClick={() => setSelectedNights(opt.nights)}
                      className={`py-2.5 px-2 rounded-2xl text-center border transition-all ${
                        selectedNights === opt.nights
                          ? "bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-md shadow-amber-500/20"
                          : "bg-slate-50 dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.07]"
                      }`}
                    >
                      <span className="block font-mono text-[11px]">{opt.nights} {opt.nights === 1 ? "Night" : "Nights"}</span>
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
                      <span>Stay ({selectedNights} × {displayPrice(nightly)})</span>
                      <span className="text-slate-900 dark:text-white font-mono font-medium">{displayPrice(rawTotal)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Sanctuary Length Privilege</span>
                        <span className="font-mono font-bold">-{displayPrice(discountAmount)}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span>Daily Gourmet Breakfast</span>
                      <span className="text-[#008fe5] dark:text-[#38bdf8] font-semibold">Included</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Airport / Tarmac Transfer</span>
                      <span className="text-[#008fe5] dark:text-[#38bdf8] font-semibold">Included</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/[0.08] text-sm font-bold text-slate-950 dark:text-white">
                      <span>Total Investment</span>
                      <span className="text-xl text-[#008fe5] dark:text-[#38bdf8] font-mono">{displayPrice(finalTotal)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Reservation CTA Button */}
              <button
                onClick={() => openCheckoutModal(toBooking(hotel, selectedNights))}
                className="w-full py-4 rounded-2xl bg-[#008fe5] hover:bg-[#007bc4] text-white font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-blue-500/25 hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <KeyRound size={16} /> Confirm &amp; Reserve Suite
              </button>

              <div className="pt-2 text-center space-y-1.5">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal flex items-center justify-center gap-1.5">
                  <ShieldCheck size={14} className="text-[#008fe5]" />
                  <span>Zero Booking Fees · 100% Refundable up to 24h</span>
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
