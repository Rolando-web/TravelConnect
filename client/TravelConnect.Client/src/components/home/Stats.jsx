import { Users, Globe, Star, HeartHandshake } from "lucide-react";

export default function Stats() {
  const statsList = [
    { label: "Happy Travelers", value: "45,000+", icon: Users },
    { label: "Countries Covered", value: "120+", icon: Globe },
    { label: "Customer Rating", value: "4.9+", icon: Star },
    { label: "Support Channels", value: "24/7", icon: HeartHandshake },
  ];

  return (
    <section className="bg-[#008fe5] text-white p-6 relative overflow-hidden">
      {/* Decorative background shape */}
      <div className="absolute inset-0 z-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0,0 C30,40 70,60 100,100 L100,0 Z" fill="white" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 text-center">
          {statsList.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="flex flex-col items-center justify-center space-y-2 group p-4 rounded-2xl hover:bg-white/5 transition-all duration-300"
              >
                <div className="bg-white/10 rounded-2xl p-3.5 mb-2 group-hover:scale-110 transition-transform duration-300">
                  <Icon size={24} className="text-blue-100" />
                </div>
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">{stat.value}</span>
                <span className="text-xs sm:text-sm font-semibold text-blue-100 uppercase tracking-wider">{stat.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
