import { ShieldCheck, Tags, Headphones } from "lucide-react";

export default function WhyChooseUs() {
  const points = [
    {
      title: "Best Price Guarantee",
      description: "We promise to match any price you find for the identical staycation package or travel itinerary.",
      icon: Tags,
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Secure Payments",
      description: "All transactions are encrypted with bank-grade SSL security protocols for complete peace of mind.",
      icon: ShieldCheck,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "24/7 Global Support",
      description: "Our dedicated support desk is available around the clock to help you anytime, anywhere.",
      icon: Headphones,
      color: "bg-violet-50 text-violet-600",
    },
  ];

  return (
    <section className="py-20 bg-slate-50 dark:bg-[#070b13] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#008fe5] dark:text-amber-400">Our Core Values</span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mt-2 mb-4">
            Why Travelers Choose Us
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            We provide seamless booking experiences, secured gateways, and reliable trip execution so that you can focus on building lifelong memories.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {points.map((point, idx) => {
            const Icon = point.icon;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-[#0f1422] rounded-3xl p-8 border border-slate-200/80 dark:border-white/[0.08] hover:border-amber-400/40 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group"
              >
                {/* Icon Container */}
                <div className={`inline-flex p-4 rounded-2xl mb-6 ${point.color} dark:bg-white/[0.05] dark:text-amber-300 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={24} />
                </div>

                {/* Text Details */}
                <h3 className="font-heading text-lg font-bold text-slate-950 dark:text-white mb-3 group-hover:text-[#008fe5] dark:group-hover:text-amber-300 transition-colors">
                  {point.title}
                </h3>

                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {point.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
