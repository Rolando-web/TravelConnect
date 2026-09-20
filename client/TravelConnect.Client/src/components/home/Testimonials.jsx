import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { usePublicStats } from "../../hooks/usePublicStats";

const TESTIMONIALS = [
  {
    rating: 5,
    quote: "Our trip to Japan was spectacular! Every single detail, from hotel bookings, private bullet train transfers, and custom guided itineraries was handled seamlessly. It was the most relaxing and organized vacation we have ever taken.",
    author: "Panyangismo",
    role: "Honeymoon Travelers",
    location: "Tokyo & Kyoto Package",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
  },
  {
    rating: 5,
    quote: "The Rome package was worth every cent. Best Price Guarantee holds true, and skipping the lines at the Colosseum saved us hours! Highly recommend Travel Connect.",
    author: "Jason Surds",
    role: "Family Vacationer",
    location: "Rome Explorer Package",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
  },
  {
    rating: 5,
    quote: "Excellent customer service. We had to reschedule our Paris tour last minute due to flight cancellations, and their 24/7 global support desk sorted it in minutes.",
    author: "Jaybe Sukal",
    role: "Solo Backpacker",
    location: "Romantic Paris Package",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
  },
  {
    rating: 5,
    quote: "Seamless booking from start to finish. The Sea & Sand Phuket package was flawless — transfers, villa, and island tours all perfectly coordinated.",
    author: "Kristel Anne",
    role: "Couple Trip",
    location: "Sea & Sand Phuket Package",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80",
  },
  {
    rating: 5,
    quote: "We booked a whole team retreat through them. Pricing was transparent, flights aligned perfectly, and their dashboard kept everyone updated. Superb!",
    author: "Mark Villanueva",
    role: "Team Lead",
    location: "Bali Team Retreat Package",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
  },
];

export default function Testimonials() {
  const { stats } = usePublicStats();
  const fmt = (n) => new Intl.NumberFormat("en-US").format(n && !isNaN(n) ? n : 0);

  const trackRef = useRef(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    let x = 0;
    let raf = 0;
    let last = performance.now();
    const SPEED = 45; // px per second

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!paused) {
        const half = el.scrollWidth / 2;
        x += SPEED * dt;
        if (half > 0 && x >= half) x -= half;
        el.style.transform = `translate3d(${-x}px, 0, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  const track = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <section
      className="tc-testimonials py-14 bg-slate-50 dark:bg-[#070b13] transition-colors duration-300"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Compact header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#008fe5] dark:text-cyan-300">
            Client Stories
          </span>
          <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-gray-900 dark:text-white mt-2 mb-2">
            What Our Clients Say
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Over {fmt(stats?.happyTravelers && stats.happyTravelers > 0 ? stats.happyTravelers : 12450)}+ happy
            travelers have explored the world with us.
          </p>
        </div>

        {/* Infinite X-axis card marquee — pauses on hover */}
        <div className="relative overflow-hidden">
          {/* Fade edges */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-24 z-10 bg-gradient-to-r from-slate-50 to-transparent dark:from-[#070b13]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-24 z-10 bg-gradient-to-l from-slate-50 to-transparent dark:from-[#070b13]" />

          <div ref={trackRef} className="flex gap-5 w-max py-2 will-change-transform">
            {track.map((item, idx) => (
              <article
                key={idx}
                className="w-[320px] sm:w-[360px] shrink-0 bg-white dark:bg-[#0f172a] rounded-3xl p-6 border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">"{item.quote}"</p>
                </div>

                <div className="flex items-center gap-3 pt-5 mt-5 border-t border-gray-50 dark:border-white/10">
                  <img
                    src={item.avatar}
                    alt={item.author}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <h4 className="text-sm font-heading font-bold text-gray-900 dark:text-white truncate">{item.author}</h4>
                    <p className="text-[11px] text-gray-400 dark:text-slate-400 font-semibold truncate">
                      {item.role} — <span className="text-[#008fe5] dark:text-cyan-300">{item.location}</span>
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}