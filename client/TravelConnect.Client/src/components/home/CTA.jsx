import { ArrowRight, Sparkles } from "lucide-react";
import { usePublicStats } from "../../hooks/usePublicStats";

export default function CTA() {
  const { stats } = usePublicStats();
  const fmt = (n) => new Intl.NumberFormat("en-US").format(n && !isNaN(n) ? n : 0);

  const handleScrollToPackages = (e) => {
    e.preventDefault();
    const element = document.getElementById("packages");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="bg-[#008fe5] text-white py-20 relative overflow-hidden">
      {/* Background Shapes */}
      <div className="absolute inset-0 z-0 opacity-15">
        <div className="absolute -left-12 -bottom-12 w-64 h-64 border-[16px] border-white rounded-full"></div>
        <div className="absolute right-12 top-4 w-96 h-96 border-[4px] border-white rounded-full"></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-8">
        
        {/* Sparkle Badge */}
        <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
          <Sparkles size={14} className="text-yellow-300" />
          <span>Your Dream Vacation Awaits</span>
        </div>
        
        {/* Main Header */}
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
          Ready to Start your <span className="underline decoration-yellow-300 underline-offset-4">Journey?</span>
        </h2>
        
        {/* Subtext */}
        <p className="text-sm sm:text-base text-blue-50 max-w-xl mx-auto leading-relaxed">
          Join over {fmt(stats?.happyTravelers)}+ happy travelers and book your curated tropical package today. Safe routes, secure bookings, and lifetime memories guaranteed.
        </p>

        {/* Buttons Grid */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="#packages"
            onClick={handleScrollToPackages}
            className="w-full sm:w-auto bg-amber-400 hover:bg-amber-500 active:scale-[0.98] text-slate-950 font-extrabold px-8 py-4 rounded-2xl shadow-xl shadow-amber-500/20 hover:shadow-amber-500/35 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Explore Packages</span>
            <ArrowRight size={16} />
          </a>
          
          <a
            href="#contact"
            className="w-full sm:w-auto border-2 border-white/80 hover:border-white hover:bg-white/10 active:scale-[0.98] text-white font-bold px-8 py-3.5 rounded-2xl transition-all text-sm text-center"
          >
            Get in Touch
          </a>
        </div>

      </div>
    </section>
  );
}
