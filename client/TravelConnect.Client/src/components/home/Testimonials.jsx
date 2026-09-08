import { Star, Quote } from "lucide-react";
import { usePublicStats } from "../../hooks/usePublicStats";

export default function Testimonials() {
  const { stats } = usePublicStats();
  const fmt = (n) => new Intl.NumberFormat("en-US").format(n && !isNaN(n) ? n : 0);

  const featuredTestimonial = {
    rating: 5,
    quote: "Our trip to Japan was spectacular! Every single detail, from hotel bookings, private bullet train transfers, and custom guided itineraries was handled seamlessly. It was the most relaxing and organized vacation we have ever taken.",
    author: "Panyangismo",
    role: "Honeymoon Travelers",
    location: "Tokyo & Kyoto Package",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
  };

  const secondaryTestimonials = [
    {
      rating: 5,
      quote: "The Rome package was worth every cent. Best Price Guarantee holds true, and skipping the lines at the Colosseum saved us hours! Highly recommend Travel Connect.",
      author: "Jason Surds",
      role: "Family Vacationer",
      location: "Rome Explorer Package",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    },
    {
      quote: "Excellent customer service. We had to reschedule our Paris tour last minute due to flight cancellations, and their 24/7 global support desk sorted it in minutes.",
      author: "Jaybe Sukal",
      role: "Solo Backpacker",
      location: "Romantic Paris Package",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    },
  ];

  return (
    <section className="py-24 bg-slate-50 dark:bg-[#070b13] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#008fe5] dark:text-cyan-300">Client Stories</span>
          <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-gray-900 dark:text-white mt-2 mb-4">
            What Our Clients Say
          </h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-slate-400">
            Over {fmt(stats?.happyTravelers)}+ happy travelers have explored the world using our curated stays and routes.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

          {/* Left Column: Large Highlight Card */}
          <div className="lg:col-span-7 flex">
            <div className="bg-slate-900 dark:bg-[#0c1322] border border-transparent dark:border-white/10 text-white rounded-3xl p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden w-full shadow-xl">
              {/* Quote Mark background decoration */}
              <Quote className="absolute right-8 top-8 w-36 h-36 text-slate-800/40 dark:text-slate-700/20 pointer-events-none -z-0" />

              <div className="space-y-6 relative z-10">
                {/* Stars */}
                <div className="flex items-center gap-1">
                  {[...Array(featuredTestimonial.rating)].map((_, i) => (
                    <Star key={i} size={18} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <blockquote className="text-lg sm:text-2xl font-medium leading-relaxed text-slate-100">
                  "{featuredTestimonial.quote}"
                </blockquote>
              </div>

              {/* Author info */}
              <div className="flex items-center gap-4 pt-10 border-t border-slate-800 dark:border-white/10 mt-8 relative z-10">
                <img
                  src={featuredTestimonial.avatar}
                  alt={featuredTestimonial.author}
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#008fe5]"
                />
                <div>
                  <h4 className="text-base font-heading font-bold text-white">{featuredTestimonial.author}</h4>
                  <p className="text-xs text-slate-400 font-semibold">{featuredTestimonial.role} — <span className="text-[#008fe5] dark:text-cyan-300">{featuredTestimonial.location}</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Secondary Review Stack */}
          <div className="lg:col-span-5 flex flex-col gap-6 justify-between">
            {secondaryTestimonials.map((item, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-[#0f172a] rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-white/10 shadow-sm flex flex-col justify-between flex-grow hover:shadow-md transition-all duration-300"
              >
                <div className="space-y-4">
                  {/* Stars */}
                  <div className="flex items-center gap-1">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <p className="text-sm sm:text-base text-gray-700 dark:text-slate-300 font-normal leading-relaxed">
                    "{item.quote}"
                  </p>
                </div>

                {/* Author info */}
                <div className="flex items-center gap-3 pt-6 border-t border-gray-50 dark:border-white/10 mt-6">
                  <img
                    src={item.avatar}
                    alt={item.author}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="text-sm font-heading font-bold text-gray-900 dark:text-white">{item.author}</h4>
                    <p className="text-[11px] text-gray-400 dark:text-slate-400 font-semibold">{item.role} — <span className="text-[#008fe5] dark:text-cyan-300">{item.location}</span></p>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}
