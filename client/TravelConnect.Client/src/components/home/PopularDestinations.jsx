import { ArrowRight } from "lucide-react";

export default function PopularDestinations() {
  const destinations = [
    {
      name: "Rome",
      country: "Italy",
      packages: "15 Packages",
      image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Paris",
      country: "France",
      packages: "24 Packages",
      image: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Tokyo",
      country: "Japan",
      packages: "18 Packages",
      image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Bali",
      country: "Indonesia",
      packages: "20 Packages",
      image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Sydney",
      country: "Australia",
      packages: "12 Packages",
      image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Barcelona",
      country: "Spain",
      packages: "14 Packages",
      image: "https://images.unsplash.com/photo-1583422409516-2895a77efedd?auto=format&fit=crop&w=400&q=80",
    },
  ];

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
          {destinations.map((dest, idx) => (
            <a 
              key={idx}
              href="#packages"
              className="group relative h-72 rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 block"
            >
              {/* Image */}
              <img 
                src={dest.image} 
                alt={`${dest.name}, ${dest.country}`} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>
              
              {/* Text Info */}
              <div className="absolute bottom-5 left-5 right-5 text-white flex flex-col justify-end">
                <span className="text-xs font-bold text-blue-300 tracking-wide uppercase">{dest.country}</span>
                <span className="text-lg font-black leading-tight mb-1 group-hover:text-blue-200 transition-colors">{dest.name}</span>
                <div className="flex items-center gap-1 text-[10px] text-slate-300 font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>{dest.packages}</span>
                  <ArrowRight size={10} />
                </div>
              </div>
            </a>
          ))}
        </div>

      </div>
    </section>
  );
}
