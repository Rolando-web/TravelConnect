import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { destinationsApi } from "../../services/api";

function parseName(name) {
  const parts = (name || "").split(",").map((s) => s.trim());
  return parts.length > 1 ? { city: parts[0], country: parts.slice(1).join(", ") } : { city: name || "—", country: "" };
}

export default function PopularDestinations() {
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
    <section id="destinations" className="py-20 bg-slate-50 scroll-mt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#008fe5]">Wanderlust</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-2 mb-4">
            Popular Destinations
          </h2>
          <p className="text-sm sm:text-base text-gray-500">
            Discover the world's most sought-after cities, beaches, and historic landmarks.
          </p>
        </div>

        {/* Destinations Slider/Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {destinations.map((dest, idx) => {
            const { city, country } = parseName(dest.name);
            return (
              <a 
                key={dest.id ?? idx}
                href="#packages"
                className="group relative h-72 rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 block"
              >
                {/* Image */}
                <img 
                  src={dest.imageUrl || "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80"} 
                  alt={`${city}, ${country}`} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>
                
                {/* Text Info */}
                <div className="absolute bottom-5 left-5 right-5 text-white flex flex-col justify-end">
                  <span className="text-xs font-bold text-blue-300 tracking-wide uppercase">{dest.region || country}</span>
                  <span className="text-lg font-black leading-tight mb-1 group-hover:text-blue-200 transition-colors">{city}</span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-300 font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span>{dest.category || "Explore"}</span>
                    <ArrowRight size={10} />
                  </div>
                </div>
              </a>
            );
          })}
        </div>

      </div>
    </section>
  );
}
