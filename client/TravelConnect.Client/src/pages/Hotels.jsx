import { useState } from "react";
import {
  Hotel, Search, Star, MapPin, CheckCircle2, ShieldCheck, Wifi, Coffee, Waves, Car, Sparkles, Filter, ChevronDown
} from "lucide-react";
import { useBooking } from "../context/BookingContext";

const HOTELS_DATA = [
  {
    id: 101,
    name: "Shangri-La Boracay Resort & Spa",
    location: "Boracay Island, Aklan, Philippines",
    city: "Boracay",
    stars: 5.0,
    rating: 4.9,
    reviews: 840,
    pricePerNight: 18500,
    originalPrice: 24000,
    badge: "LUXURY BEACHFRONT",
    img: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80",
    amenities: ["Free High-Speed Wi-Fi", "Daily Buffet Breakfast", "Private Speedboat Transfer", "Infinity Ocean Pool", "Chi Spa"],
    roomType: "Deluxe Ocean View Room",
  },
  {
    id: 102,
    name: "El Nido Resorts Pangulasian Island",
    location: "El Nido, Palawan, Philippines",
    city: "El Nido",
    stars: 5.0,
    rating: 4.95,
    reviews: 620,
    pricePerNight: 32000,
    originalPrice: 38000,
    badge: "ECO-LUXURY VILLA",
    img: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80",
    amenities: ["Private Canopy Villa", "Island Hopping Boat Included", "Free Breakfast & Lunch", "Full Marine Reserve Access"],
    roomType: "Beach Villa with Private Deck",
  },
  {
    id: 103,
    name: "Crimson Resort & Spa Mactan",
    location: "Lapu-Lapu City, Cebu, Philippines",
    city: "Cebu",
    stars: 4.8,
    rating: 4.8,
    reviews: 1120,
    pricePerNight: 9800,
    originalPrice: 13500,
    badge: "TOP FAMILY RESORT",
    img: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
    amenities: ["Infinity Pool", "Crimson Spa", "Beachfront Cabanas", "Free Airport Shuttle", "Kid's Activity Center"],
    roomType: "Deluxe Garden View Room",
  },
  {
    id: 104,
    name: "Okura Manila Resort Hotel",
    location: "Pasay City, Metro Manila, Philippines",
    city: "Manila",
    stars: 5.0,
    rating: 4.85,
    reviews: 490,
    pricePerNight: 12500,
    originalPrice: 16000,
    badge: "CITY CENTER CLASS",
    img: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80",
    amenities: ["Japanese Hinoki Tub Suite", "Rooftop Heated Pool", "Fine Dining Yamazato", "Free Casino Shuttle"],
    roomType: "Hinoki Executive Suite",
  },
  {
    id: 105,
    name: "Henann Crystal Sands Resort",
    location: "Station 1, Boracay Island, Philippines",
    city: "Boracay",
    stars: 4.7,
    rating: 4.75,
    reviews: 1430,
    pricePerNight: 8200,
    originalPrice: 11000,
    badge: "STATION 1 BEACHFRONT",
    img: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
    amenities: ["Sky Pool Bar", "Direct White Beach Access", "Free Breakfast", "Fitness Center"],
    roomType: "Premier Room with Pool Access",
  },
  {
    id: 106,
    name: "Amorita Resort Bohol",
    location: "Panglao Island, Bohol, Philippines",
    city: "Bohol",
    stars: 4.9,
    rating: 4.9,
    reviews: 780,
    pricePerNight: 14200,
    originalPrice: 18000,
    badge: "CLIFFSIDE SUITE",
    img: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80",
    amenities: ["Cliffside Ocean Pool", "Free Kayak & Paddleboard", "Organic Breakfast", "Sunset Cocktail Hour"],
    roomType: "Junior Ocean Suite",
  }
];

export default function Hotels() {
  const { openCheckoutModal } = useBooking();
  const [searchCity, setSearchCity] = useState("All");
  const [minRating, setMinRating] = useState(0);

  const filteredHotels = HOTELS_DATA.filter((h) => {
    const matchesCity = searchCity === "All" || h.city.toLowerCase() === searchCity.toLowerCase();
    const matchesRating = h.rating >= minRating;
    return matchesCity && matchesRating;
  });

  const handleBookHotel = (hotel) => {
    openCheckoutModal({
      id: `HOTEL-${hotel.id}`,
      name: `${hotel.name} (${hotel.roomType})`,
      location: hotel.location,
      price: hotel.pricePerNight * 3, // Default 3 nights booking
      original: hotel.originalPrice * 3,
      duration: "3 Nights",
      img: hotel.img,
      category: "hotel"
    });
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-16">
      {/* Hero Header */}
      <section className="bg-gradient-to-r from-blue-900 via-sky-800 to-indigo-900 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
            <Hotel size={14} className="text-amber-400" /> LUXURY HOTELS &amp; BEACH RESORTS
          </span>
          <h1 className="text-4xl sm:text-5xl font-black">Book Premium Accommodations</h1>
          <p className="text-blue-100 text-sm max-w-xl mx-auto">
            Discover top-rated luxury beach resorts, cliffside pool villas, and city center stays across the Philippines with instant confirmation.
          </p>

          {/* Quick Filter Bar */}
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
      </section>

      {/* Hotels Listing */}
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
              className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Hotel Image */}
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

                {/* Info Content */}
                <div className="p-5 space-y-3">
                  <h3 className="font-extrabold text-slate-900 text-lg leading-tight">{hotel.name}</h3>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <MapPin size={14} className="text-[#008fe5] shrink-0" /> {hotel.location}
                  </p>

                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Room Included</p>
                    <p className="text-xs font-extrabold text-slate-800">{hotel.roomType}</p>
                  </div>

                  {/* Amenities */}
                  <div className="space-y-1 pt-1">
                    {hotel.amenities.slice(0, 3).map((am, i) => (
                      <div key={i} className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" /> {am}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pricing & CTA */}
              <div className="p-5 pt-0 border-t border-slate-100 flex items-end justify-between mt-4">
                <div>
                  <span className="text-[11px] text-slate-400 line-through">₱{hotel.originalPrice.toLocaleString()}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">₱{hotel.pricePerNight.toLocaleString()}</span>
                    <span className="text-[11px] text-slate-500 font-semibold">/ night</span>
                  </div>
                </div>

                <button
                  onClick={() => handleBookHotel(hotel)}
                  className="bg-[#008fe5] hover:bg-blue-600 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-md text-xs hover:-translate-y-0.5 transition"
                >
                  Book Hotel
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
