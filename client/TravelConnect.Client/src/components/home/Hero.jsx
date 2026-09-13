import { useState, useEffect } from "react";
import { Compass, ChevronLeft, ChevronRight, Palmtree, Plane, ShieldCheck } from "lucide-react";
import SearchCard from "./SearchCard";

/* ─── Carousel slide data ───────────────────────────────────────────── */
const SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1920&q=80",
    tag: "Lose yourself in paradise",
    title: "Lose yourself in ",
    titleHighlight: "paradise",
    desc: "Book unique staycation packages curated by travel experts. Discover hidden gems, pristine beaches, and unforgettable adventures around the globe.",
  },
  {
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1920&q=80",
    tag: "Discover neon nights",
    title: "Experience Tokyo's ",
    titleHighlight: "neon lights",
    desc: "Discover the perfect fusion of ancient tradition and ultra-modern style. Walk the streets of Shibuya and taste world-class cuisine.",
  },
  {
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1920&q=80",
    tag: "Iconic scenic retreats",
    title: "Sunsets over ",
    titleHighlight: "Santorini cliffs",
    desc: "Relax by the infinity pools of Greece's white-washed caldera. Sail across the Aegean sea and witness world-famous golden hours.",
  },
  {
    image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1920&q=80",
    tag: "Ultimate winter getaways",
    title: "Adventure in the ",
    titleHighlight: "Swiss Alps",
    desc: "Breathtaking landscapes, snowy peaks, and cozy alpine chalets. Your dream winter getaway is just a booking away.",
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   HERO SECTION — carousel background + headline text + SearchCard
═══════════════════════════════════════════════════════════════════════ */
export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);

  return (
    <section className="relative z-20 min-h-[92vh] flex flex-col justify-between pt-16 pb-16 md:pb-24 bg-slate-900">
      {/* ─── Background Image Carousel ─────────────────────────────── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {SLIDES.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${currentSlide === index ? "opacity-70 z-10" : "opacity-0 z-0"
              }`}
          >
            <img
              src={slide.image}
              alt={slide.tag}
              className={`w-full h-full object-cover object-center transition-transform duration-[6000ms] ease-out ${currentSlide === index ? "scale-105" : "scale-100"
                }`}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/80 z-20" />
      </div>

      {/* ─── Slide Navigation Arrows ───────────────────────────────── */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-30 flex justify-between px-4 sm:px-6 lg:px-8 pointer-events-none">
        <button
          onClick={prevSlide}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white flex items-center justify-center pointer-events-auto transition-all hover:scale-105 active:scale-95"
          aria-label="Previous slide"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={nextSlide}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white flex items-center justify-center pointer-events-auto transition-all hover:scale-105 active:scale-95"
          aria-label="Next slide"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* ─── Hero Text Content ─────────────────────────────────────── */}
      <div className="relative z-30 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-12 md:mt-20">
        <div key={currentSlide} className="animate-fadeIn space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white border border-white/20 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-white/20 transition-all duration-300">
            <Compass size={14} className="text-[#38bdf8]" />
            <span>{SLIDES[currentSlide].tag}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-heading font-extrabold text-white tracking-tight leading-[1.1] drop-shadow-md">
            {SLIDES[currentSlide].title}
            <br />
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-[#008fe5] bg-clip-text text-transparent">
              {SLIDES[currentSlide].titleHighlight}
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-200 max-w-2xl mx-auto leading-relaxed drop-shadow">
            {SLIDES[currentSlide].desc}
          </p>
        </div>

        {/* Carousel indicators */}
        <div className="flex justify-center gap-2 mt-8">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${currentSlide === index ? "w-8 bg-[#008fe5]" : "w-2 bg-white/40 hover:bg-white/60"
                }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Quick Travel Highlights Badges */}
        <div className="hidden sm:flex items-center justify-center gap-3 pt-6 text-[11px] font-bold text-slate-200">
          <span className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 flex items-center gap-1.5">
            <Palmtree size={14} className="text-cyan-300" /> 500+ Curated Stays
          </span>
          <span className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 flex items-center gap-1.5">
            <Plane size={14} className="text-cyan-300" /> Verified Airline Routes
          </span>
          <span className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-cyan-300" /> 100% Instant Refund Guarantee
          </span>
        </div>
      </div>

      {/* ─── Overlapping Search Card (z-40 to sit above Stats) ─────── */}
      <div className="relative z-40 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 -mb-28 md:-mb-36">
        <SearchCard />
      </div>
    </section>
  );
}

