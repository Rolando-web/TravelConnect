import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Car, Fuel, Users, Gauge, Filter, Eye
} from "lucide-react";
import { useBooking } from "../context/BookingContext";
import { useCurrency } from "../context/CurrencyContext";
import PageHeroCarousel from "../components/shared/PageHeroCarousel";
import FavoriteButton from "../components/shared/FavoriteButton";
import { carsApi } from "../services/api";

const CAR_HERO_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=80",
    alt: "Luxury sports car on the road",
  },
  {
    image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1920&q=80",
    alt: "SUV for travel adventures",
  },
  {
    image: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1920&q=80",
    alt: "Executive sedan",
  },
  {
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1920&q=80",
    alt: "Premium car rental",
  },
];

const toCarBooking = (car, days = 3) => ({
  id: `CAR-${car.id}`,
  name: `${car.name} Rental (${car.type})`,
  location: car.location,
  price: Number(car.pricePerDay || 0) * days,
  duration: `${days} Days Rental`,
  img: car.imageUrl,
  category: "car",
});

const TYPE_FILTERS = ["All", "SUV", "Sedan", "Van", "Convertible", "MPV"];

export default function Cars() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { openCheckoutModal } = useBooking();
  const { displayPrice, selectedCurrency, currentCurrency } = useCurrency();
  const [selectedType, setSelectedType] = useState("All");
  const [cars, setCars] = useState([]);

  const queryFrom = (searchParams.get("from") || "").toLowerCase().trim();
  const appliedFrom = queryFrom || "";

  useEffect(() => {
    let active = true;
    carsApi
      .list()
      .then((data) => { if (active) setCars(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setCars([]); });
    return () => { active = false; };
  }, []);

  const filteredCars = cars.filter(
    (car) =>
      (selectedType === "All" || (car.type || "").toLowerCase().includes(selectedType.toLowerCase())) &&
      (!appliedFrom || (car.location || "").toLowerCase().includes(appliedFrom))
  );

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-16">
      <PageHeroCarousel slides={CAR_HERO_SLIDES} className="py-16 px-4 pb-20">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
            <Car size={14} className="text-amber-400" /> SELF-DRIVE &amp; CHAUFFEUR CAR RENTALS
          </span>
          <h1 className="text-4xl sm:text-5xl font-black drop-shadow-md">Explore with Total Freedom</h1>
          <p className="text-slate-200 text-sm max-w-xl mx-auto drop-shadow">
            Rent premium SUVs, family vans, compact sedans, and luxury convertibles across major airports and tourist spots.
          </p>

          <div className="max-w-2xl mx-auto bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 flex flex-wrap items-center justify-center gap-2 text-xs text-white">
            <span className="font-bold flex items-center gap-1"><Filter size={14} /> Car Class:</span>
            {TYPE_FILTERS.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${selectedType === t
                  ? "bg-[#008fe5] text-white shadow-md"
                  : "bg-white/10 hover:bg-white/20 text-slate-200"
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </PageHeroCarousel>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Available Rental Vehicles</h2>
            <p className="text-xs text-slate-500 mt-0.5">Showing {filteredCars.length} models in {selectedCurrency} ({currentCurrency.symbol})</p>
          </div>
        </div>

        {filteredCars.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-lg font-medium">
            No vehicles available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCars.map((car) => (
              <div
                key={car.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/cars/${car.id}`)}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/cars/${car.id}`)}
                className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="relative h-48 overflow-hidden bg-slate-100">
                    <img
                      src={car.imageUrl || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80"}
                      alt={car.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                      {car.type || "Rental"}
                    </span>
                    <FavoriteButton
                      type="car"
                      item={car}
                      className="absolute top-3 right-3"
                    />
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="font-extrabold text-slate-900 text-lg leading-tight group-hover:text-[#008fe5] transition-colors">
                      {car.name}
                    </h3>

                    <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold border-b border-slate-100 pb-3">
                      <span className="flex items-center gap-1"><Users size={14} className="text-[#008fe5]" /> {car.seats} Seats</span>
                      <span className="flex items-center gap-1"><Gauge size={14} className="text-[#008fe5]" /> {car.transmission}</span>
                      <span className="flex items-center gap-1"><Fuel size={14} className="text-[#008fe5]" /> {car.fuelType}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium">{car.location}</p>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-slate-100 flex items-end justify-between mt-4 gap-2">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">{displayPrice(Number(car.pricePerDay || 0))}</span>
                      <span className="text-[11px] text-slate-500 font-semibold">/ day</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/cars/${car.id}`); }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-3 py-2.5 rounded-xl text-xs transition flex items-center gap-1"
                    >
                      <Eye size={14} /> Details
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openCheckoutModal(toCarBooking(car)); }}
                      className="bg-[#008fe5] hover:bg-blue-600 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-md text-xs hover:-translate-y-0.5 transition"
                    >
                      Rent
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
