import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Package, Star, ArrowRight, Globe, TrendingUp, Users, Plane, Hotel } from "lucide-react";
import { useBooking } from "../context/BookingContext";

/* ─── Data ─────────────────────────────────────────────────────────── */

const DESTINATIONS = [
  {
    id: 1,
    name: "Santorini",
    country: "Greece",
    region: "Europe",
    style: ["Resort", "Romantic"],
    type: "destination",
    price: 78200,
    rating: 4.9,
    duration: "7 nights",
    size: "large",
    img: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80",
    tag: "ICONIC",
  },
  {
    id: 2,
    name: "Kyoto",
    country: "Japan",
    region: "Asia",
    style: ["Cultural", "Adventure"],
    type: "destination",
    price: 68500,
    rating: 4.8,
    duration: "5 nights",
    size: "small",
    img: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
    tag: "CULTURAL",
  },
  {
    id: 3,
    name: "Patagonia",
    country: "Argentina / Chile",
    region: "Americas",
    style: ["Adventure"],
    type: "destination",
    price: 185000,
    rating: 4.9,
    duration: "12 nights",
    size: "medium",
    img: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80",
    tag: "ADVENTURE",
  },
  {
    id: 4,
    name: "Amalfi Coast",
    country: "Italy",
    region: "Europe",
    style: ["Romantic", "Resort"],
    type: "destination",
    price: 98000,
    rating: 4.8,
    duration: "6 nights",
    size: "medium",
    img: "https://images.unsplash.com/photo-1534239143101-1b1c627395c5?w=800&q=80",
    tag: "ROMANTIC",
  },
  {
    id: 5,
    name: "Maldives",
    country: "Maldives",
    region: "Asia",
    style: ["Resort", "Beach"],
    type: "destination",
    price: 189000,
    rating: 5.0,
    duration: "7 nights",
    size: "small",
    img: "https://images.unsplash.com/photo-1540202404-a2f29016b523?w=800&q=80",
    tag: "LUXURY",
  },
  {
    id: 6,
    name: "Machu Picchu",
    country: "Peru",
    region: "Americas",
    style: ["Adventure", "Cultural"],
    type: "destination",
    price: 112000,
    rating: 4.9,
    duration: "8 nights",
    size: "medium",
    img: "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80",
    tag: "WONDER",
  },
  {
    id: 7,
    name: "Swiss Alps",
    country: "Switzerland",
    region: "Europe",
    style: ["Adventure", "Nature"],
    type: "destination",
    price: 156000,
    rating: 4.9,
    duration: "7 nights",
    size: "medium",
    img: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80",
    tag: "PANORAMIC",
  },
  {
    id: 8,
    name: "Dubai",
    country: "UAE",
    region: "Middle East",
    style: ["City", "Luxury"],
    type: "destination",
    price: 64500,
    rating: 4.7,
    duration: "5 nights",
    size: "small",
    img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80",
    tag: "ICONIC",
  },
  {
    id: 9,
    name: "Queenstown",
    country: "New Zealand",
    region: "Oceania",
    style: ["Adventure", "Nature"],
    type: "destination",
    price: 145000,
    rating: 4.8,
    duration: "9 nights",
    size: "large",
    img: "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=800&q=80",
    tag: "ADVENTURE",
  },
];

const ARTICLES = [
  {
    id: 1,
    category: "CURATED COLLECTION",
    title: "The Art of Slow Travel",
    desc: "Curated journeys that linger in a single region long enough to feel the local rhythm, fostering appreciation, deeper stories — the opposite of a flight-and-hotel rush.",
    img: "https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=600&q=80",
    tag: "EDITOR'S PICK",
  },
  {
    id: 2,
    category: "TRENDING",
    title: "Volcanic Archipelagos",
    desc: "From the Azores to the Galápagos, travellers are seeking out lava-field landscapes that feel primordial — the ultimate antidote to an overtouristed world.",
    img: "https://images.unsplash.com/photo-1474631245212-32dc3c8310c6?w=600&q=80",
    tag: "TRENDING",
  },
  {
    id: 3,
    category: "NOMINATED",
    title: "Trans-Siberian by Design",
    desc: "A golden-age rail liner has risen again for 2026 — private cabins, curated stops in Irkutsk and Lake Baikal, and a dining car worth lingering in.",
    img: "https://images.unsplash.com/photo-1527684651001-731c474bbb5a?w=600&q=80",
    tag: "NOMINATED",
  },
];

const REGIONS = ["All", "Asia", "Europe", "Americas", "Middle East", "Oceania"];
const STYLES = ["All", "Resort", "Adventure", "City", "Cultural", "Romantic", "Beach", "Nature"];

/* ─── Tag color helper ─────────────────────────────────────────────── */
const tagColors = {
  "EDITOR'S PICK": "bg-amber-500",
  TRENDING: "bg-rose-500",
  NOMINATED: "bg-indigo-500",
  ICONIC: "bg-blue-600",
  CULTURAL: "bg-purple-600",
  ADVENTURE: "bg-green-600",
  ROMANTIC: "bg-pink-500",
  LUXURY: "bg-yellow-500 text-gray-900",
  WONDER: "bg-orange-500",
  PANORAMIC: "bg-teal-500",
  BEACH: "bg-cyan-500",
};

/* ─── Component ────────────────────────────────────────────────────── */
export default function Explore() {
  const { openCheckoutModal } = useBooking();
  const [activeTab, setActiveTab] = useState("Destinations");
  const [activeRegion, setActiveRegion] = useState("All");
  const [activeStyle, setActiveStyle] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = DESTINATIONS.filter((d) => {
    const matchRegion = activeRegion === "All" || d.region === activeRegion;
    const matchStyle = activeStyle === "All" || d.style.includes(activeStyle);
    const matchSearch =
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.country.toLowerCase().includes(search.toLowerCase());
    return matchRegion && matchStyle && matchSearch;
  });

  return (
    <div className="w-full bg-slate-50 min-h-screen">
      {/* ── Hero Banner ─────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 pt-14 pb-10 px-4 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-blue-200/40 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-48 h-48 rounded-full bg-indigo-200/30 blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          <p className="text-[#008fe5] text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
            <Globe size={14} /> EXPLORE THE WORLD
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-4">
            Discover your{" "}
            <span className="block text-[#008fe5]">next chapter.</span>
          </h1>
          <p className="text-gray-500 text-base sm:text-lg max-w-lg mb-8 leading-relaxed">
            Curated destinations and tailored journeys handpicked by our travel experts.
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap gap-6 text-sm">
            {[
              { icon: Globe, val: "9+", label: "Regions" },
              { icon: Package, val: "190+", label: "Packages" },
              { icon: Users, val: "58k+", label: "Journeys" },
              { icon: Star, val: "4.9/5", label: "Avg Rating" },
            ].map(({ icon: Icon, val, label }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon size={15} className="text-[#008fe5]" />
                <span className="font-bold text-gray-900">{val}</span>
                <span className="text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tabs + Filters ──────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          {["Destinations", "Packages"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${
                activeTab === tab
                  ? "bg-[#008fe5] text-white border-[#008fe5] shadow-md shadow-blue-400/30"
                  : "bg-white text-gray-600 border-gray-200 hover:border-[#008fe5] hover:text-[#008fe5]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Region + Style filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setActiveRegion(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                activeRegion === r
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              {r}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            {STYLES.map((s) => (
              <button
                key={s}
                onClick={() => setActiveStyle(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 hidden sm:block ${
                  activeStyle === s
                    ? "bg-[#008fe5] text-white border-[#008fe5]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#008fe5]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-8 max-w-sm ml-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search destinations..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#008fe5]/40 focus:border-[#008fe5] transition"
          />
        </div>

        {/* ── Destination Grid ─────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-lg font-medium">
            No destinations match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[220px]">
            {filtered.map((d) => (
              <div
                key={d.id}
                className={`relative rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl transition-shadow duration-300 ${
                  d.size === "large" ? "row-span-2" : "row-span-1"
                }`}
              >
                <img
                  src={d.img}
                  alt={d.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Tag badge */}
                <span
                  className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white ${
                    tagColors[d.tag] || "bg-gray-600"
                  }`}
                >
                  {d.tag}
                </span>

                {/* Rating */}
                <span className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star size={10} className="fill-yellow-400 text-yellow-400" />
                  {d.rating}
                </span>

                {/* Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white/70 text-xs mb-0.5">{d.country}</p>
                  <h3 className="text-white font-bold text-lg leading-tight">{d.name}</h3>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-white/80 text-xs">{d.duration}</span>
                    <span className="text-white font-bold text-sm">
                      from ₱{d.price.toLocaleString()}
                    </span>
                  </div>
                  {/* Hover reveal */}
                  <button
                    onClick={() => openCheckoutModal(d)}
                    className="mt-3 w-full py-2 bg-gradient-to-r from-[#008fe5] to-blue-600 border border-white/30 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:from-blue-600 hover:to-blue-700 shadow-md"
                  >
                    Book Package Deal →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Curated Reads ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">20 Picks</p>
            <h2 className="text-2xl font-extrabold text-gray-900">Curated reads</h2>
          </div>
          <button className="text-sm font-semibold text-[#008fe5] hover:underline flex items-center gap-1">
            View all <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {ARTICLES.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 group">
              <div className="relative h-44 overflow-hidden">
                <img
                  src={a.img}
                  alt={a.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <span
                  className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white ${
                    tagColors[a.tag] || "bg-gray-600"
                  }`}
                >
                  {a.tag}
                </span>
              </div>
              <div className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                  {a.category}
                </p>
                <h3 className="text-gray-900 font-bold text-base leading-snug mb-2">{a.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed line-clamp-3">{a.desc}</p>
                <button className="mt-3 text-[#008fe5] text-xs font-semibold hover:underline flex items-center gap-1">
                  Read more <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-900 via-blue-800 to-blue-600 p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Background image */}
          <img
            src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80"
            alt="Plane window"
            className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay"
          />
          <div className="relative z-10">
            <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
              <TrendingUp size={12} /> START YOUR JOURNEY
            </p>
            <h2 className="text-white font-extrabold text-3xl leading-tight">
              Ready for something<br />
              <span className="text-blue-300">extraordinary?</span>
            </h2>
            <p className="text-blue-200 text-sm mt-2 max-w-xs">
              The very package we offer — filtered, sorted, and ready to book.
            </p>
          </div>
          <div className="relative z-10">
            <Link
              to="/deals"
              className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold px-7 py-3.5 rounded-full shadow-xl hover:bg-blue-50 hover:-translate-y-0.5 transition-all duration-300 text-sm"
            >
              Browse All Packages <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
