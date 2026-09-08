import { useState, useEffect } from "react";
import { ArrowRight, MapPin, Compass, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { destinationsApi } from "../../services/api";
import { useCurrency } from "../../context/CurrencyContext";

function parseName(name) {
  const parts = (name || "").split(",").map((s) => s.trim());
  return parts.length > 1 ? { city: parts[0], country: parts.slice(1).join(", ") } : { city: name || "—", country: "Philippines" };
}

export default function PopularDestinations() {
  const { displayPrice } = useCurrency();
  const [destinations, setDestinations] = useState([]);

  useEffect(() => {
    let active = true;
    destinationsApi
      .list()
      .then((data) => { if (active) setDestinations(Array.isArray(data) ? data.slice(0, 6) : []); })
      .catch(() => { if (active) setDestinations([]); });
    return () => { active = false; };
  }, []);

  if (destinations.length === 0) return null;

  return (
    <section id="destinations" className="py-24 bg-slate-50/80 dark:bg-[#070b13] scroll-mt-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] text-[#008fe5] dark:text-cyan-300 bg-blue-50 dark:bg-blue-500/10 px-3.5 py-1 rounded-full mb-3 border border-blue-100 dark:border-blue-500/20">
              <Compass size={13} /> Global Escapes
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black text-slate-900 dark:text-white tracking-tight">
              Trending Destinations
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-2 max-w-lg">
              Discover the most sought-after cities, tropical sanctuaries, and cultural centers booked this season.
            </p>
          </div>

          <Link
            to="/flights"
            className="inline-flex items-center gap-2 text-xs font-black text-[#008fe5] dark:text-cyan-300 hover:text-blue-600 group w-fit"
          >
            <span>Search flights to all destinations</span>
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Magazine-Style Asymmetric Destinations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((dest, idx) => {
            const { city, country } = parseName(dest.name);
            const isFeatured = idx === 0 || idx === 3;

            return (
              <Link 
                key={dest.id ?? idx}
                to={`/flights?to=${encodeURIComponent(city)}`}
                className={`group relative rounded-[2rem] overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 block ${
                  isFeatured ? "h-80 sm:h-96" : "h-72 sm:h-80"
                }`}
              >
                {/* Image */}
                <img 
                  src={dest.imageUrl || "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80"} 
                  alt={`${city}, ${country}`} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-90 group-hover:opacity-95 transition-opacity" />
                
                {/* Top Badge */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <span className="bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full border border-white/20 uppercase tracking-wider flex items-center gap-1">
                    <MapPin size={10} className="text-[#008fe5]" /> {dest.region || country}
                  </span>
                  {isFeatured && (
                    <span className="bg-amber-500/90 backdrop-blur-md text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                      <Flame size={11} className="fill-slate-950" /> Trending
                    </span>
                  )}
                </div>

                {/* Bottom Details */}
                <div className="absolute bottom-5 left-5 right-5 text-white flex flex-col justify-end space-y-2">
                  <div>
                    <span className="text-2xl sm:text-3xl font-black leading-tight group-hover:text-blue-200 transition-colors block">
                      {city}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold">{country}</span>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Fares From</span>
                      <span className="font-extrabold text-amber-300 text-sm">
                        {displayPrice(Math.round(2400 + (idx * 650)))}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 bg-white/20 hover:bg-[#008fe5] text-white text-[11px] font-black px-3.5 py-1.5 rounded-xl backdrop-blur-md transition-all group-hover:bg-[#008fe5]">
                      <span>Book Trip</span>
                      <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>

                {/* Subtle border highlight on hover */}
                <div className="absolute inset-0 rounded-[2rem] ring-2 ring-white/0 group-hover:ring-white/40 transition-all duration-300 pointer-events-none" />
              </Link>
            );
          })}
        </div>

      </div>
    </section>
  );
}

