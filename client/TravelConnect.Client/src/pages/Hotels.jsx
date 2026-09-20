import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Hotel, Star, MapPin, Eye, ShieldCheck,
  Search, X, LayoutGrid, LayoutList,
  BedDouble, Waves, Coffee, Compass, KeyRound
} from "lucide-react";
import { useBooking } from "../context/BookingContext";
import { useCurrency } from "../context/CurrencyContext";
import { useAvailable } from "../context/AvailableContext";
import FavoriteButton from "../components/shared/FavoriteButton";
import PageHeroCarousel from "../components/shared/PageHeroCarousel";
import { hotelsApi } from "../services/api";

const HOTEL_CATEGORIES = [
  { id: "All", label: "All Stays" },
  { id: "Resort", label: "Resorts" },
  { id: "Suites", label: "Suites" },
  { id: "Grand", label: "Penthouses" },
  { id: "Lodge", label: "Lodges" },
];

const HOTEL_HERO_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2000&q=80",
    alt: "Luxury resort poolside with palm trees at dusk",
  },
  {
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=2000&q=80",
    alt: "White-washed cliffside suites above a turquoise sea",
  },
  {
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=2000&q=80",
    alt: "Private villa with infinity pool overlooking the ocean",
  },
  {
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=2000&q=80",
    alt: "Beachfront resort villa with sparkling pool at sunset",
  },
];

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
    tagline: "Secluded beachfront luxury with cliffside infinity pools and private coves",
    amenities: "Private Plunge Pool|Spa Sanctuary|Secluded Beach|Gourmet Dining|Speedboat Transfer|Free High-Speed Wi-Fi",
    highlights: ["Speedboat Airport Transfer", "Daily Champagne Breakfast", "Complimentary Sea Kayaking"],
    roomSize: "110 sqm (1,184 sq ft)",
    bedType: "King Master Bed",
    view: "Direct White Beach Panorama"
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
    tagline: "Pristine marine sanctuary with private villa beach frontage and UNESCO biosphere",
    amenities: "Private Beach|Coral Reef Snorkeling|Infinity Pool|Organic Spa|Private Butler|Free Wi-Fi",
    highlights: ["Marine Sanctuary Excursion", "Private Villa Butler", "Sunset Catamaran Cruise"],
    roomSize: "135 sqm (1,450 sq ft)",
    bedType: "Grand King Canopy",
    view: "Bacuit Bay Sunset Vista"
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
    tagline: "Panoramic Aegean sunsets and hand-carved cliff plunge pools in Oia",
    amenities: "Caldera Plunge Pool|Greek Breakfast Deck|Private Terrace|Airport Transfer|Cocktail Bar",
    highlights: ["Private Caldera Sunset Deck", "Daily Sommelier Wine Tasting", "Helicopter Transfer Option"],
    roomSize: "85 sqm (915 sq ft)",
    bedType: "King Cave Bedding",
    view: "Endless Caldera & Aegean Horizon"
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
    tagline: "Serene Japanese minimalism high above the Otemachi district with Mount Fuji views",
    amenities: "Thermal Traditional Baths|Panoramic Pool|30-meter High Ceiling Lounge|Bespoke Spa",
    highlights: ["Traditional Onsen Access", "Exclusive Tea Master Ceremony", "Chauffeur Airport Escort"],
    roomSize: "140 sqm (1,506 sq ft)",
    bedType: "Japanese Imperial King",
    view: "Tokyo Skyline & Imperial Palace"
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
    tagline: "Suspended 150 meters above the Indian Ocean with infinity water cascades and temple sunsets",
    amenities: "Infinity Pool|Ayurvedic Spa|Clifftop Dining|Yoga Pavilion|Free Wi-Fi",
    highlights: ["Daily Morning Yoga Sessions", "Floating Villa Breakfast", "Direct Beach Club Access"],
    roomSize: "120 sqm (1,290 sq ft)",
    bedType: "Balinese Teak King",
    view: "Indian Ocean Cliff Edge"
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
    tagline: "Parisian elegance minutes from the Champs-Élysées with private courtyard gardens",
    amenities: "Courtyard Garden|Michelin-starred Dining|Concierge Keys|Dior Spa|Free Wi-Fi",
    highlights: ["Private Museum Access Pass", "Courtyard Champagne Lounge", "Limousine Transfers"],
    roomSize: "90 sqm (970 sq ft)",
    bedType: "French Royal King",
    view: "Haussmannian Garden Courtyard"
  }
];

const toHotelBooking = (hotel, nights = 3) => ({
  id: `HOTEL-${hotel.id}`,
  name: hotel.name,
  location: hotel.location,
  price: Number(hotel.pricePerNight || 0) * nights,
  duration: `${nights} Nights`,
  img: hotel.imageUrl,
  category: "hotel",
});

export default function Hotels() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { openCheckoutModal } = useBooking();
  const { displayPrice, selectedCurrency } = useCurrency();
  const { hotelCities } = useAvailable();

  const [hotels, setHotels] = useState([]);
  const [, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCity, setSelectedCity] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [layoutMode, setLayoutMode] = useState("pavilion"); // 'pavilion' (compact horizontal) or 'gallery' (compact grid)

  const queryDestination = (searchParams.get("destination") || "").toLowerCase().trim();

  useEffect(() => {
    let active = true;
    setLoading(true);
    hotelsApi
      .list()
      .then((data) => {
        if (!active) return;
        if (Array.isArray(data) && data.length > 0) {
          const enriched = data.map((h, i) => {
            const fallback = LUXURY_FALLBACK_HOTELS[i % LUXURY_FALLBACK_HOTELS.length];
            return {
              ...h,
              tier: Number(h.pricePerNight) > 18000 ? "Private Island Sanctuary" : "5-Star Haven",
              tagline: h.description || fallback.tagline,
              rating: Number(h.rating || 4.9),
              reviews: h.reviews || 220,
              roomSize: fallback.roomSize,
              bedType: fallback.bedType,
              view: fallback.view,
              highlights: fallback.highlights
            };
          });
          setHotels(enriched);
        } else {
          setHotels(LUXURY_FALLBACK_HOTELS);
        }
      })
      .catch(() => {
        if (active) setHotels(LUXURY_FALLBACK_HOTELS);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredHotels = useMemo(() => {
    return hotels
      .filter((hotel) => {
        const matchesCat =
          selectedCategory === "All" ||
          (hotel.name || "").toLowerCase().includes(selectedCategory.toLowerCase()) ||
          (hotel.tier || "").toLowerCase().includes(selectedCategory.toLowerCase());

        const matchesCity =
          selectedCity === "All" ||
          (hotel.location || "").toLowerCase().includes(selectedCity.toLowerCase());

        const matchesQuery =
          !queryDestination ||
          (hotel.location || "").toLowerCase().includes(queryDestination);

        const matchesSearch =
          !searchQuery.trim() ||
          (hotel.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (hotel.location || "").toLowerCase().includes(searchQuery.toLowerCase());

        return matchesCat && matchesCity && matchesQuery && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return Number(a.pricePerNight) - Number(b.pricePerNight);
        if (sortBy === "price-desc") return Number(b.pricePerNight) - Number(a.pricePerNight);
        if (sortBy === "rating") return Number(b.rating) - Number(a.rating);
        return 0;
      });
  }, [hotels, selectedCategory, selectedCity, queryDestination, searchQuery, sortBy]);

  const hasActiveFilters = selectedCategory !== "All" || selectedCity !== "All" || searchQuery || sortBy !== "featured";

  const resetFilters = () => {
    setSelectedCategory("All");
    setSelectedCity("All");
    setSearchQuery("");
    setSortBy("featured");
  };

  return (
    <div className="w-full bg-slate-50 dark:bg-[#070b13] text-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-300 pb-20">
      
      {/* ─── Architectural Editorial Masthead ─────────────────────────── */}
      <PageHeroCarousel slides={HOTEL_HERO_SLIDES} className="pt-20 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-[0.2em] uppercase bg-white/15 text-white border border-white/25 backdrop-blur-md shadow-lg">
            <Compass size={14} className="text-amber-300" />
            <span>Curated Resorts &amp; Private Havens</span>
          </div>

          <h1 className="font-heading text-5xl sm:text-7xl font-bold text-white tracking-[0.06em] leading-[1.02] drop-shadow-lg">
            Stay Somewhere <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-amber-200 to-amber-400">Beautiful</span>.
          </h1>

          <p className="text-slate-200 text-xs sm:text-sm max-w-2xl mx-auto font-normal leading-relaxed drop-shadow">
            Curated private islands, oceanfront cliffside suites, and alpine sanctuaries with 100% refund protection.
          </p>

          {/* Curated Category Filter Pills */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            {HOTEL_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 border ${
                    active
                      ? "bg-[#008fe5] text-white border-[#008fe5] shadow-md shadow-blue-500/20"
                      : "bg-white/15 text-white border-white/30 backdrop-blur-md hover:bg-white/25"
                  }`}
                >
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </PageHeroCarousel>

      {/* ─── Concierge Filter Ribbon ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0a0f1d] border border-slate-200/80 dark:border-white/[0.07] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by hotel name, private island, or country..."
              className="w-full bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200/70 dark:hover:bg-white/[0.07] focus:bg-white dark:focus:bg-white/[0.08] text-slate-900 dark:text-white pl-9 pr-8 py-2 rounded-xl border border-slate-200/80 dark:border-white/[0.08] focus:border-[#008fe5] focus:outline-none transition-all placeholder:text-slate-400 text-xs font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Destination Selector */}
            {hotelCities && hotelCities.length > 0 && (
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-slate-100 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 py-2 px-3 rounded-xl border border-slate-200/80 dark:border-white/[0.08] focus:border-[#008fe5] focus:outline-none cursor-pointer text-xs"
              >
                <option value="All" className="bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white">All Destinations</option>
                {hotelCities.map((c) => (
                  <option key={c.code || c.city} value={c.city} className="bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white">
                    {c.city}
                  </option>
                ))}
              </select>
            )}

            {/* Layout Toggle (List vs Gallery) */}
            <div className="flex items-center bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] rounded-xl p-0.5">
              <button
                onClick={() => setLayoutMode("pavilion")}
                title="List view"
                className={`p-1.5 rounded-lg transition ${
                  layoutMode === "pavilion" ? "bg-[#008fe5] text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <LayoutList size={15} />
              </button>
              <button
                onClick={() => setLayoutMode("gallery")}
                title="Gallery view"
                className={`p-1.5 rounded-lg transition ${
                  layoutMode === "gallery" ? "bg-[#008fe5] text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <LayoutGrid size={15} />
              </button>
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-2.5 py-1.5 rounded-xl text-[11px] text-[#008fe5] dark:text-[#38bdf8] bg-[#008fe5]/10 hover:bg-[#008fe5]/20 border border-[#008fe5]/25 transition flex items-center gap-1 font-semibold"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ─── Hotels Listing Section ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.06]">
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-slate-950 dark:text-white">
            {filteredHotels.length} {filteredHotels.length === 1 ? "stay" : "stays"} found
          </h2>

          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Prices in {selectedCurrency}
          </span>
        </div>

        {/* Sort Bar — Trip.com style quick sort tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-7">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
            Sort by
          </span>
          {[
            { id: "featured", label: "Best" },
            { id: "rating", label: "Top Rated" },
            { id: "price-asc", label: "Cheapest" },
            { id: "price-desc", label: "Highest Price" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSortBy(id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                sortBy === id
                  ? "bg-[#008fe5] border-[#008fe5] text-white shadow-md shadow-blue-500/25"
                  : "bg-white dark:bg-white/[0.04] border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:border-[#008fe5]/50 hover:text-[#008fe5] dark:hover:text-[#38bdf8]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Empty State */}
        {filteredHotels.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#0a0f1d] rounded-2xl border border-slate-200 dark:border-white/[0.07] p-8 max-w-lg mx-auto space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#008fe5]/10 text-[#008fe5] dark:text-[#38bdf8] flex items-center justify-center mx-auto">
              <Hotel size={24} />
            </div>
            <h3 className="font-heading text-lg font-bold text-slate-950 dark:text-white">
              No stays match your search
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              We couldn't find any stays matching your filters. Try a different destination or clear your keywords.
            </p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl bg-[#008fe5] text-white text-xs font-bold hover:bg-[#007bc4] transition shadow-md shadow-blue-500/20"
            >
              Reset Filters
            </button>
          </div>
        ) : layoutMode === "pavilion" ? (
          
          /* ─── Compact Horizontal Sanctuary Cards (NO EMPTY SPACE) ──────── */
          <div className="space-y-4">
            {filteredHotels.map((hotel) => (
              <div
                key={hotel.id}
                className="bg-white dark:bg-[#0a0f1d] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/[0.07] hover:border-[#008fe5]/50 dark:hover:border-[#008fe5]/50 shadow-sm hover:shadow-md transition-all duration-200 group"
              >
                <div className="flex flex-col md:flex-row">
                  
                  {/* Left: Fixed Dimension Photo Frame */}
                  <div className="w-full md:w-72 lg:w-80 h-52 md:h-60 shrink-0 relative overflow-hidden bg-slate-900">
                    <img
                      src={hotel.imageUrl}
                      alt={hotel.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                    
                    <span className="absolute top-3 left-3 bg-[#008fe5] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                      {hotel.tier || "5-Star Haven"}
                    </span>

                    <div className="absolute top-3 right-3">
                      <FavoriteButton type="hotel" item={hotel} />
                    </div>

                    <div className="absolute bottom-2.5 left-3 right-3 text-white flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 font-bold text-amber-300">
                        <Star size={12} className="fill-amber-400 text-amber-400" /> {Number(hotel.rating || 4.9).toFixed(1)}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold [text-shadow:0_1px_3px_rgba(0,0,0,0.85)] ${
                          (hotel.roomsAvailable ?? 8) <= 4
                            ? "text-rose-300"
                            : (hotel.roomsAvailable ?? 8) <= 8
                              ? "text-amber-300"
                              : "text-emerald-300"
                        }`}
                      >
                        {hotel.roomsAvailable ?? 8} suites left
                      </span>
                    </div>
                  </div>

                  {/* Right: Cohesive Content & Action Dock (Natural Flow, No Dead Space) */}
                  <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between gap-3">
                    
                    {/* Header & Description */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider">
                        <MapPin size={12} className="text-[#008fe5] shrink-0" />
                        <span>{hotel.location}</span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span>{hotel.reviews} reviews</span>
                      </div>

                      <h3
                        onClick={() => navigate(`/hotels/${hotel.id}`)}
                        className="font-heading text-lg sm:text-xl font-bold text-slate-950 dark:text-white group-hover:text-[#008fe5] transition cursor-pointer leading-snug"
                      >
                        {hotel.name}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 leading-relaxed">
                        {hotel.tagline}
                      </p>
                    </div>

                    {/* Suite Specifications Chips */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] text-[11px]">
                        <BedDouble size={13} className="text-[#008fe5] shrink-0" />
                        <span>{hotel.bedType || "King Master Bed"}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] text-[11px]">
                        <Waves size={13} className="text-[#008fe5] shrink-0" />
                        <span>{hotel.view || "Horizon Vista"}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] text-[11px]">
                        <Coffee size={13} className="text-[#008fe5] shrink-0" />
                        <span>Breakfast Included</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px]">
                        <ShieldCheck size={13} className="shrink-0" />
                        <span>100% Refundable</span>
                      </div>
                    </div>

                    {/* Bottom Pricing Bar & Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl sm:text-2xl font-bold font-heading text-slate-950 dark:text-white">
                            {displayPrice(Number(hotel.pricePerNight || 0))}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">/ night</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Taxes &amp; privileges included
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/hotels/${hotel.id}`)}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200/80 dark:border-white/[0.08] transition flex items-center gap-1"
                        >
                          <Eye size={13} /> View Details
                        </button>
                        <button
                          onClick={() => openCheckoutModal(toHotelBooking(hotel, 3))}
                          className="px-5 py-2 rounded-xl bg-[#008fe5] hover:bg-[#007bc4] text-white text-xs font-bold tracking-wider uppercase transition shadow-sm shadow-blue-500/20 hover:-translate-y-0.5 flex items-center gap-1.5"
                        >
                          <KeyRound size={13} /> Reserve
                        </button>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            ))}
          </div>

        ) : (

          /* ─── Compact Sanctuary Gallery View (Architectural 3-Col Grid) ─── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredHotels.map((hotel) => (
              <div
                key={hotel.id}
                className="bg-white dark:bg-[#0a0f1d] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/[0.07] hover:border-[#008fe5]/50 dark:hover:border-[#008fe5]/50 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Photo Frame */}
                  <div className="relative h-52 overflow-hidden bg-slate-900">
                    <img
                      src={hotel.imageUrl}
                      alt={hotel.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                    
                    <span className="absolute top-2.5 left-2.5 bg-[#008fe5] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {hotel.tier || "5-Star Haven"}
                    </span>

                    <div className="absolute top-2.5 right-2.5">
                      <FavoriteButton type="hotel" item={hotel} />
                    </div>

                    <div className="absolute bottom-2.5 left-3 right-3 text-white flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 font-bold text-amber-300">
                        <Star size={12} className="fill-amber-400 text-amber-400" /> {Number(hotel.rating || 4.9).toFixed(1)}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold [text-shadow:0_1px_3px_rgba(0,0,0,0.85)] ${
                          (hotel.roomsAvailable ?? 8) <= 4
                            ? "text-rose-300"
                            : (hotel.roomsAvailable ?? 8) <= 8
                              ? "text-amber-300"
                              : "text-emerald-300"
                        }`}
                      >
                        {hotel.roomsAvailable ?? 8} left
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono uppercase">
                      <MapPin size={11} className="text-[#008fe5]" />
                      <span>{hotel.location}</span>
                    </div>

                    <h3
                      onClick={() => navigate(`/hotels/${hotel.id}`)}
                      className="font-heading text-base font-bold text-slate-950 dark:text-white group-hover:text-[#008fe5] transition cursor-pointer leading-snug"
                    >
                      {hotel.name}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {hotel.tagline}
                    </p>

                    <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1"><BedDouble size={12} className="text-[#008fe5]" /> {hotel.bedType || "King Bed"}</span>
                      <span className="flex items-center gap-1"><Coffee size={12} className="text-[#008fe5]" /> Breakfast</span>
                    </div>
                  </div>
                </div>

                {/* Footer Pricing & CTA */}
                <div className="p-4 pt-0">
                  <div className="pt-2.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between gap-2">
                    <div>
                      <span className="text-base font-bold font-heading text-slate-950 dark:text-white">
                        {displayPrice(Number(hotel.pricePerNight || 0))}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono ml-1">/ night</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => navigate(`/hotels/${hotel.id}`)}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-200 text-xs font-semibold"
                        title="View Details"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        onClick={() => openCheckoutModal(toHotelBooking(hotel, 3))}
                        className="px-3.5 py-1.5 rounded-lg bg-[#008fe5] hover:bg-[#007bc4] text-white text-xs font-bold tracking-wider uppercase transition shadow-sm shadow-blue-500/20"
                      >
                        Reserve
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        )}

      </section>

    </div>
  );
}
