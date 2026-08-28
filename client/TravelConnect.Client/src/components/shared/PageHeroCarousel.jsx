import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Full-bleed image carousel background for page heroes.
 * Pass themed Unsplash slides + overlay content as children.
 */
export default function PageHeroCarousel({
  slides = [],
  interval = 7000,
  className = "",
  overlayClassName = "bg-gradient-to-b from-slate-900/70 via-slate-900/55 to-slate-900/80",
  children,
  showControls = true,
}) {
  const [current, setCurrent] = useState(0);
  const count = slides.length;

  useEffect(() => {
    if (count < 2) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % count);
    }, interval);
    return () => clearInterval(timer);
  }, [count, interval]);

  const next = () => setCurrent((prev) => (prev + 1) % count);
  const prev = () => setCurrent((prev) => (prev - 1 + count) % count);

  return (
    <section className={`relative overflow-hidden bg-slate-900 text-white ${className}`}>
      {/* Background slides */}
      <div className="absolute inset-0 z-0">
        {slides.map((slide, index) => (
          <div
            key={slide.image + index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              current === index ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            <img
              src={slide.image}
              alt={slide.alt || ""}
              className={`w-full h-full object-cover object-center transition-transform duration-[7000ms] ease-out ${
                current === index ? "scale-105" : "scale-100"
              }`}
            />
          </div>
        ))}
        <div className={`absolute inset-0 z-20 ${overlayClassName}`} />
      </div>

      {/* Arrows */}
      {showControls && count > 1 && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-30 flex justify-between px-3 sm:px-6 pointer-events-none">
          <button
            type="button"
            onClick={prev}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white flex items-center justify-center pointer-events-auto transition-all hover:scale-105 active:scale-95"
            aria-label="Previous slide"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={next}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white flex items-center justify-center pointer-events-auto transition-all hover:scale-105 active:scale-95"
            aria-label="Next slide"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="relative z-30">{children}</div>

      {/* Dots */}
      {showControls && count > 1 && (
        <div className="absolute bottom-4 left-0 right-0 z-30 flex justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrent(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                current === index ? "w-7 bg-[#008fe5]" : "w-1.5 bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
