import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Hotel, Star, MapPin, CheckCircle2, Eye
} from "lucide-react";
import { useBooking } from "../context/BookingContext";
import { useCurrency } from "../context/CurrencyContext";
import { useAvailable } from "../context/AvailableContext";
import PageHeroCarousel from "../components/shared/PageHeroCarousel";
import FavoriteButton from "../components/shared/FavoriteButton";
import { hotelsApi } from "../services/api";

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

const toHotelBooking = (hotel, nights = 3) => ({
  id: `HOTEL-${hotel.id}`,
  name: hotel.name,
  location: hotel.location,
  price: Number(hotel.pricePerNight || 0) * nights,
  duration: `${nights} Nights`,
  img: hotel.imageUrl,
  category: "hotel",
});

export default function Hotels() {
  const navigate = useNavigate();
  const { openCheckoutModal } = useBooking();
  const { displayPrice, selectedCurrency } = useCurrency();
  const { hotelCities } = useAvailable();
  const [hotels, setHotels] = useState([]);

  useEffect(() => {
    let active = true;
    hotelsApi
      .list()
      .then((data) => { if (active) setHotels(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setHotels([]); });
    return () => { active = false; };
  }, []);

  const filteredHotels = hotels;

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-16">
      <PageHeroCarousel slides={HOTEL_HERO_SLIDES} className="py-16 px-4 pb-20">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
            <Hotel size={14} className="text-amber-400" /> LUXURY HOTELS &amp; BEACH RESORTS
          </span>
          <h1 className="text-4xl sm:text-5xl font-black drop-shadow-md">Book Premium Accommodations</h1>
          <p className="text-slate-200 text-sm max-w-xl mx-auto drop-shadow">
            Discover top-rated luxury beach resorts, cliffside pool villas, and city center stays with instant confirmation.
          </p>
        </div>
      </PageHeroCarousel>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Featured Resorts &amp; Hotels</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredHotels.length} accommodations in {selectedCurrency}
            </p>
          </div>
        </div>

        {/* Available hotel cities */}
        {hotelCities.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs font-bold text-slate-500">Available in:</span>
            {hotelCities.map((c) => (
              <span key={c.code || c.city} className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-full">
                {c.city}
              </span>
            ))}
          </div>
        )}

        {filteredHotels.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-lg font-medium">
            No hotels available yet.
          </div>
        ) : (
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
                      src={hotel.imageUrl || "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80"}
                      alt={hotel.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-black text-slate-900 flex items-center gap-1 shadow-md">
                      <Star size={13} className="text-amber-500 fill-amber-500" /> {Number(hotel.rating || 0).toFixed(1)}
                    </div>
                    <FavoriteButton
                      type="hotel"
                      item={hotel}
                      className="absolute top-3 right-3"
                    />
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="font-extrabold text-slate-900 text-lg leading-tight group-hover:text-[#008fe5] transition-colors">
                      {hotel.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <MapPin size={14} className="text-[#008fe5] shrink-0" /> {hotel.location}
                    </p>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Available Rooms</p>
                      <p className="text-xs font-extrabold text-slate-800">{hotel.roomsAvailable ?? 0} rooms</p>
                    </div>

                    <div className="space-y-1 pt-1">
                      {(hotel.description ? [hotel.description] : []).map((am, i) => (
                        <div key={i} className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-emerald-500 shrink-0" /> {am}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-slate-100 flex items-end justify-between mt-4 gap-2">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">{displayPrice(Number(hotel.pricePerNight || 0))}</span>
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
        )}
      </section>
    </div>
  );
}
