import { Star, Clock, MapPin, ArrowRight } from "lucide-react";
import { useBooking } from "../../context/BookingContext";

export default function FeaturedPackages() {
  const { openCheckoutModal } = useBooking();

  const packages = [
    {
      id: 1,
      title: "Romantic Paris Getaway",
      name: "Romantic Paris Getaway",
      location: "Paris, France",
      duration: "5 Days, 4 Nights",
      price: "$1,299",
      rating: "4.9",
      reviews: "120",
      image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=85",
      img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=85",
      badge: "Hot Deal",
      badgeColor: "bg-red-500",
    },
    {
      id: 2,
      title: "Tokyo Lights & Tradition",
      name: "Tokyo Lights & Tradition",
      location: "Kyoto & Tokyo, Japan",
      duration: "7 Days, 6 Nights",
      price: "$1,850",
      rating: "4.8",
      reviews: "95",
      image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=85",
      img: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=85",
      badge: "Bestseller",
      badgeColor: "bg-[#008fe5]",
    },
    {
      id: 3,
      title: "Metropolitan New York Tour",
      name: "Metropolitan New York Tour",
      location: "New York, USA",
      duration: "4 Days, 3 Nights",
      price: "$1,450",
      rating: "4.7",
      reviews: "54",
      image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=85",
      img: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=85",
      badge: "New Tour",
      badgeColor: "bg-emerald-500",
    },
  ];

  return (
    <section id="packages" className="py-24 bg-white scroll-mt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#008fe5]">Curated Journeys</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-2">
              Featured Packages
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Explore handpicked vacation experiences designed for complete leisure.
            </p>
          </div>
          
          <a href="/explore" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#008fe5] hover:text-blue-600 transition-colors group">
            <span>View All Packages</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        {/* Package Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {packages.map((pkg) => (
            <div 
              key={pkg.id}
              className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col group"
            >
              {/* Image Section */}
              <div className="relative h-60 w-full overflow-hidden">
                <img 
                  src={pkg.image} 
                  alt={pkg.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                
                {/* Float Badge */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className={`text-[10px] font-extrabold text-white px-3.5 py-1 rounded-full uppercase tracking-wider ${pkg.badgeColor} shadow-md`}>
                    {pkg.badge}
                  </span>
                </div>

                {/* Rating Overlay */}
                <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 text-xs font-bold text-gray-900 shadow-md">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <span>{pkg.rating}</span>
                  <span className="text-gray-400 font-normal">({pkg.reviews})</span>
                </div>
              </div>

              {/* Card Details */}
              <div className="p-6 flex-grow flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock size={14} className="text-gray-400" />
                      <span>{pkg.duration}</span>
                    </div>
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center gap-1">
                      <MapPin size={14} className="text-gray-400" />
                      <span>{pkg.location}</span>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-950 group-hover:text-[#008fe5] transition-colors leading-snug">
                    {pkg.title}
                  </h3>
                </div>

                {/* Pricing and Action */}
                <div className="flex items-center justify-between border-t border-gray-50 pt-5 mt-6">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Price Starts At</span>
                    <span className="text-2xl font-black text-gray-950">{pkg.price} <span className="text-xs font-semibold text-gray-500">/ person</span></span>
                  </div>
                  
                  <button
                    onClick={() => openCheckoutModal(pkg)}
                    className="bg-[#008fe5] hover:bg-blue-600 active:scale-95 text-white font-bold px-5 py-2.5 rounded-full text-xs transition-all shadow-md cursor-pointer"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
