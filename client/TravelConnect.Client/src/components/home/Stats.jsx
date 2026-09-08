import { Users, Globe, Star, HeartHandshake } from "lucide-react";
import { usePublicStats } from "../../hooks/usePublicStats";

const fmt = (n) => new Intl.NumberFormat("en-US").format(n && !isNaN(n) ? n : 0);

/* ═══════════════════════════════════════════════════════════════════════
   STATS BANNER — SkyBlue glass band that sits under the hero.
   Extra top padding clears the overlapping SearchCard from Hero.
═══════════════════════════════════════════════════════════════════════ */
export default function Stats() {
  const { stats } = usePublicStats();

  const statsList = [
    { label: "Happy Travelers", value: `${fmt(stats?.happyTravelers)}+`, icon: Users },
    { label: "Countries Covered", value: `${fmt(stats?.countriesCovered)}+`, icon: Globe },
    { label: "Customer Rating", value: `${Number(stats?.avgRating || 0).toFixed(1)}+`, icon: Star },
    { label: "Support Channels", value: "24/7", icon: HeartHandshake },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#008fe5] via-[#0d84d8] to-[#045a9e] pt-32 md:pt-40 pb-12 md:pb-14 text-white">
      {/* Soft ambient light sweeps */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-28 -right-20 w-[28rem] h-[28rem] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-36 -left-24 w-[28rem] h-[28rem] rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute top-0 inset-x-0 h-px bg-white/25" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {statsList.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="group flex flex-col items-center gap-3 rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-8 md:py-10 text-center transition-all duration-300 hover:bg-white/[0.16] hover:-translate-y-1 hover:shadow-xl hover:shadow-[#023e73]/30"
              >
                <div className="rounded-2xl bg-white/15 border border-white/20 p-3.5 group-hover:scale-110 transition-transform duration-300">
                  <Icon size={24} className="text-white" />
                </div>
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow-sm">
                  {stat.value}
                </span>
                <span className="text-[11px] sm:text-xs font-semibold text-sky-100 uppercase tracking-[0.18em]">
                  {stat.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
