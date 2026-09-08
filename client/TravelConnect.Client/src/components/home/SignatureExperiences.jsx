import { ArrowRight, Compass } from "lucide-react";
import { Link } from "react-router-dom";

const EXPERIENCES = [
  {
    image: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=800&q=80",
    label: "Egyptian Pyramids",
    location: "Giza, Egypt",
    badge: "Historic Wonder",
    span: "col-span-1 md:col-span-2 lg:col-span-1 row-span-1",
    h: "h-64 sm:h-72",
  },
  {
    image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80",
    label: "Swiss Alpine Haven",
    location: "Interlaken, Switzerland",
    badge: "Eco Retreat",
    span: "col-span-1 md:col-span-1 lg:col-span-1 row-span-2",
    h: "h-full min-h-[18rem]",
  },
  {
    image: "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?auto=format&fit=crop&w=800&q=80",
    label: "Cappadocia Hot Air Balloon",
    location: "Göreme, Turkey",
    badge: "Sunrise Tour",
    span: "col-span-1 md:col-span-1 lg:col-span-1 row-span-1",
    h: "h-64 sm:h-72",
  },
  {
    image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=800&q=80",
    label: "Heritage Royal Palace",
    location: "Jaipur, India",
    badge: "Royal Living",
    span: "col-span-1 md:col-span-2 lg:col-span-1 row-span-1",
    h: "h-64 sm:h-72",
  },
  {
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80",
    label: "Santorini Cliffside Caldera",
    location: "Oia, Greece",
    badge: "Luxury Escape",
    span: "col-span-1 md:col-span-1 lg:col-span-1 row-span-1",
    h: "h-64 sm:h-72",
  },
];

export default function SignatureExperiences() {
  return (
    <section className="py-20 bg-slate-50/60 dark:bg-[#070b13] overflow-hidden transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Outer Card Container Matching Screenshot Aesthetic */}
        <div className="bg-white dark:bg-[#0d1424] rounded-[2.5rem] border border-slate-200/80 dark:border-white/10 shadow-xl shadow-slate-200/40 dark:shadow-none p-6 sm:p-10 lg:p-14 transition-colors duration-300">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] text-[#008fe5] dark:text-cyan-300 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full mb-3 border border-blue-100 dark:border-blue-500/20">
                <Compass size={13} /> Curated Journeys
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black text-slate-900 dark:text-white tracking-tight">
                Signature Experiences
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-md">
              Hand-selected luxury journeys crafted uniquely for discerning travelers seeking authenticity and comfort.
            </p>
          </div>

          {/* Asymmetric Bento Grid (Inspired by Reference) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            
            {/* Editorial Text Story Block */}
            <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-7 sm:p-9 flex flex-col justify-between shadow-lg relative overflow-hidden group">
              {/* Background ambient glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#008fe5]/20 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-4 relative z-10">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest block">
                  Tailor-Made Luxury
                </span>
                <h3 className="text-2xl sm:text-3xl font-heading font-black text-white leading-tight">
                  Luxury adventures, crafted uniquely for every traveler.
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-2">
                  Indulge in curated travel moments designed exclusively for you. Whether it's a private yacht escape in the Mediterranean, a starlit dinner in the Sahara, or historic landmark tours with concierge guides.
                </p>
              </div>

              <div className="pt-8 relative z-10">
                <Link
                  to="/deals"
                  className="inline-flex items-center gap-2 bg-[#008fe5] hover:bg-blue-600 text-white font-black px-6 py-3.5 rounded-2xl text-xs transition-all shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 group/btn cursor-pointer"
                >
                  <span>Explore Our Story</span>
                  <ArrowRight size={15} className="group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Image Tiles */}
            {EXPERIENCES.map((exp, i) => (
              <div
                key={i}
                className={`relative rounded-3xl overflow-hidden group cursor-pointer shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-1.5 ${exp.h}`}
              >
                <img
                  src={exp.image}
                  alt={exp.label}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                
                {/* Gradient Shadow Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                
                {/* Float Badge */}
                <div className="absolute top-4 left-4">
                  <span className="bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full border border-white/20 uppercase tracking-wider">
                    {exp.badge}
                  </span>
                </div>

                {/* Bottom Destination Info */}
                <div className="absolute bottom-5 left-5 right-5 space-y-1">
                  <span className="text-xs font-bold text-amber-300 block">{exp.location}</span>
                  <h4 className="text-base sm:text-lg font-black text-white leading-snug drop-shadow-md">
                    {exp.label}
                  </h4>
                </div>

                {/* Subtle White Border on hover */}
                <div className="absolute inset-0 rounded-3xl ring-2 ring-white/0 group-hover:ring-white/40 transition-all duration-300 pointer-events-none" />
              </div>
            ))}

          </div>

        </div>
      </div>
    </section>
  );
}
