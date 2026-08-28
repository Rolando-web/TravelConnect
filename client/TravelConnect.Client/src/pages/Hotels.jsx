import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Hotel, Star, MapPin, CheckCircle2, Filter, Eye
} from "lucide-react";
import { useBooking } from "../context/BookingContext";
import PageHeroCarousel from "../components/shared/PageHeroCarousel";
import { HOTELS, toHotelBooking } from "../data/hotelsData";

const HOTEL_HERO_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1920&q=80",
    alt: "Luxury beachfront resort pool",
  },
  {
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=80",
    alt: "Tropical resort infinity pool",
  },
  {
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1920&q=80",
    alt: "Luxury hotel suite",
  },
  {
    image: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1920&q=80",
    alt: "Cliffside ocean resort",
  },
];

export default function Hotels() {
  const navigate = useNavigate();
  const { openCheckoutModal } = useBooking();
  const [searchCity, setSearchCity] = useState("All");

  const filteredHotels = HOTELS.filter((h) => {
    return searchCity === "All" || h.city.toLowerCase() === searchCity.toLowerCase();
  });

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-16">
      <PageHeroCarousel slides={HOTEL_HERO_SLIDES} className="py-16 px-4 pb-20">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
            <Hotel size={14} className="text-amber-400" /> LUXURY HOTELS &amp; BEACH RESORTS
          </span>
          <h1 className="text-4xl sm:text-5xl font-black drop-shadow-md">Book Premium Accommodations</h1>
          <p className="text-slate-200 text-sm max-w-xl mx-auto drop-shadow">
            Discover top-rated luxury beach resorts, cliffside pool villas, and city center stays across the Philippines with instant confirmation.
          </p>

          <div className="max-w-3xl mx-auto bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 flex flex-wrap items-center justify-center gap-3 text-xs text-white">
            <span className="font-bold flex items-center gap-1"><Filter size={14} /> Filter City:</span>
            {["All", "Boracay", "El Nido", "Cebu", "Manila", "Bohol"].map((city) => (
              <button
                key={city}
                onClick={() => setSearchCity(city)}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  searchCity === city
                    ? "bg-[#008fe5] text-white shadow-md"
                    : "bg-white/10 hover:bg-white/20 text-slate-200"
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </PageHeroCarousel>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Featured Resorts &amp; Hotels</h2>
            <p className="text-xs text-slate-500 mt-0.5">Showing {filteredHotels.length} accommodations in PHP (₱)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHotels.map((hotel) => (
            <div
              key={hotel.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/hotels/${hotel.id}`)}
              onKeyDown={(e) => e.key === "Enter" && navigate(`/hotels/${hotel.id}`)}
              className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={hotel.img}
                    alt={hotel.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    {hotel.badge}
                  </span>
                  <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-black text-slate-900 flex items-center gap-1 shadow-md">
                    <Star size={13} className="text-amber-500 fill-amber-500" /> {hotel.rating}
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="font-extrabold text-slate-900 text-lg leading-tight group-hover:text-[#008fe5] transition-colors">
                    {hotel.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <MapPin size={14} className="text-[#008fe5] shrink-0" /> {hotel.location}
                  </p>

                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Room Included</p>
                    <p className="text-xs font-extrabold text-slate-800">{hotel.roomType}</p>
                  </div>

                  <div className="space-y-1 pt-1">
                    {hotel.amenities.slice(0, 3).map((am) => (
                      <div key={am} className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" /> {am}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0 border-t border-slate-100 flex items-end justify-between mt-4 gap-2">
                <div>
                  <span className="text-[11px] text-slate-400 line-through">₱{hotel.originalPrice.toLocaleString()}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">₱{hotel.pricePerNight.toLocaleString()}</span>
                    <span className="text-[11px] text-slate-500 font-semibold">/ night</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/hotels/${hotel.id}`); }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-3 py-2.5 rounded-xl text-xs transition flex items-center gap-1"
                  >
                    <Eye size={14} /> Details
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openCheckoutModal(toHotelBooking(hotel)); }}
                    className="bg-[#008fe5] hover:bg-blue-600 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-md text-xs hover:-translate-y-0.5 transition"
                  >
                    Book
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
