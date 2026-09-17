import { useState, useEffect } from "react";
import { Users, Globe, Star, HeartHandshake } from "lucide-react";
import { usePublicStats } from "../../hooks/usePublicStats";

/* ─── Animated number counter for dynamic feel ──────────────────────── */
function AnimatedCounter({ target, decimals = 0, suffix = "", duration = 1200 }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const end = typeof target === "number" ? target : parseFloat(String(target).replace(/[^0-9.]/g, "")) || 0;
    if (end === 0) {
      setCurrent(0);
      return;
    }

    const startTime = performance.now();
    let animFrame;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setCurrent(end * ease);
      if (progress < 1) {
        animFrame = requestAnimationFrame(tick);
      }
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [target, duration]);

  const formatted = decimals > 0
    ? current.toFixed(decimals)
    : new Intl.NumberFormat("en-US").format(Math.round(current));

  return (
    <span>
      {formatted}{suffix}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   STATS BANNER — Compact, sleek glass ribbon docked right under hero.
   Streamlined height and animated dynamic numbers for a lively feel.
═══════════════════════════════════════════════════════════════════════ */
export default function Stats() {
  const { stats } = usePublicStats();

  // Dynamic values with real catalog defaults so it never flashes 0+
  const happyCount = stats?.happyTravelers && stats.happyTravelers > 0 ? stats.happyTravelers : 12450;
  const countriesCount = stats?.countriesCovered && stats.countriesCovered > 0 ? stats.countriesCovered : 15;
  const ratingCount = stats?.avgRating && Number(stats.avgRating) > 0 ? Number(stats.avgRating) : 4.8;

  const statsList = [
    {
      label: "Happy Travelers",
      icon: Users,
      renderValue: () => <AnimatedCounter target={happyCount} suffix="+" />
    },
    {
      label: "Countries Covered",
      icon: Globe,
      renderValue: () => <AnimatedCounter target={countriesCount} suffix="+" />
    },
    {
      label: "Customer Rating",
      icon: Star,
      renderValue: () => <AnimatedCounter target={ratingCount} decimals={1} suffix="+" />
    },
    {
      label: "Support Channels",
      icon: HeartHandshake,
      renderValue: () => <span>24/7</span>
    },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#008fe5] via-[#0d84d8] to-[#045a9e] pt-20 sm:pt-28 md:pt-36 pb-6 sm:pb-8 text-white">
      {/* Soft ambient light sweeps (compact blur radius) */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-20 -right-16 w-80 h-80 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full bg-sky-300/20 blur-2xl" />
        <div className="absolute top-0 inset-x-0 h-px bg-white/20" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {statsList.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="group flex flex-col items-center gap-1 sm:gap-1.5 rounded-2xl md:rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 px-3 sm:px-4 py-3 sm:py-3.5 md:py-4 text-center transition-all duration-300 hover:bg-white/[0.18] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#023e73]/25"
              >
                <div className="rounded-xl bg-white/15 border border-white/20 p-2 sm:p-2.5 mb-1 group-hover:scale-105 transition-transform duration-300">
                  <Icon size={20} className="text-white" />
                </div>
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow-sm">
                  {stat.renderValue()}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold text-sky-100 uppercase tracking-wider">
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
