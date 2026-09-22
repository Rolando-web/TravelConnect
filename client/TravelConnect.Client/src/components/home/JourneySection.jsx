import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { usePublicStats } from "../../hooks/usePublicStats";

export default function JourneySection() {
  const { stats } = usePublicStats();
  const fmt = (n) => new Intl.NumberFormat("en-US").format(n && !isNaN(n) ? n : 0);

  const points = [
    "Handcrafted itineraries customized for your preferences",
    "Luxury accommodations vetted by our travel consultants",
    "Skip-the-line VIP entry to top landmarks and historical sites",
    "Comprehensive travel insurance and safety coverage included",
  ];

  const statItems = [
    { label: "Years Experience", value: "15+" },
    { label: "Destinations", value: `${fmt(stats?.destinations && stats.destinations > 0 ? stats.destinations : 15)}+` },
    { label: "Happy Travelers", value: `${fmt(stats?.happyTravelers && stats.happyTravelers > 0 ? stats.happyTravelers : 12450)}+` },
    { label: "Star Rating", value: `${Number(stats?.avgRating && Number(stats.avgRating) > 0 ? stats.avgRating : 4.8).toFixed(1)}+` },
  ];

  return (
    <section className="py-24 bg-white dark:bg-[#0a0f1d] overflow-hidden transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          {/* Left Column: Text & Features */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#008fe5] dark:text-cyan-300 block">Crafting Memories</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-extrabold text-gray-950 dark:text-white tracking-tight leading-tight">
                Curating <br />
                <span className="text-[#008fe5] dark:text-cyan-300">Extraordinary</span> <br />
                Journeys
              </h2>
              <p className="text-sm sm:text-base text-gray-500 dark:text-slate-400 leading-relaxed pt-2">
                We believe that travel is not just about visiting new places, but about collecting experiences that enrich your life. Our premium packages are fully loaded with luxury stays, guides, and secure transits.
              </p>
            </div>

            {/* Bullet Benefits */}
            <ul className="space-y-3">
              {points.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="text-[#008fe5] dark:text-cyan-400 shrink-0 mt-0.5" size={18} />
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{point}</span>
                </li>
              ))}
            </ul>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-4 gap-4 py-4 border-y border-gray-100 dark:border-white/10">
              {statItems.map((stat, idx) => (
                <div key={idx} className="text-center md:text-left">
                  <span className="block text-xl sm:text-2xl font-heading font-black text-gray-950 dark:text-white">{stat.value}</span>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider block mt-0.5">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Call to Action button */}
            <div className="pt-2">
              <a
                href="#packages"
                className="inline-flex items-center gap-2 bg-gray-950 dark:bg-white/10 hover:bg-[#008fe5] dark:hover:bg-[#008fe5] text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all duration-300 text-sm cursor-pointer"
              >
                <span>Explore Packages</span>
                <ArrowUpRight size={16} />
              </a>
            </div>
          </div>

          {/* Right Column: Creative Image Collage */}
          <div className="lg:col-span-7 relative">
            <div className="grid grid-cols-2 gap-4 sm:gap-6 relative z-10">
              {/* Image 1 - Bali Gate */}
              <div className="h-64 sm:h-80 rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <img
                  src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80"
                  alt="Bali Gate of Heaven"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Image 2 - Greece Town */}
              <div className="h-56 sm:h-72 mt-8 rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <img
                  src="https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80"
                  alt="Santorini Greece"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Image 3 - Neon Tokyo */}
              <div className="h-56 sm:h-72 -mt-8 rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <img
                  src="https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=600&q=80"
                  alt="Tokyo Neon"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Image 4 - Eiffel Tower */}
              <div className="h-64 sm:h-80 rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <img
                  src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80"
                  alt="Paris Eiffel Tower"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>

            {/* Glowing decorative background orb */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-72 h-72 bg-blue-400/20 rounded-full blur-[80px] -z-0"></div>
          </div>

        </div>
      </div>
    </section>
  );
}
