import { useState } from "react";
import {
  Car, ShieldCheck, CheckCircle2, MapPin, Calendar, Fuel, Users, Gauge, Sparkles, Filter
} from "lucide-react";
import { useBooking } from "../context/BookingContext";

const CARS_DATA = [
  {
    id: 201,
    name: "Toyota RAV4 Hybrid SUV (2025)",
    type: "SUV / Crossover",
    seats: 5,
    transmission: "Automatic",
    fuel: "Hybrid / Petrol",
    dailyRate: 3500,
    originalRate: 4800,
    img: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80",
    badge: "MOST POPULAR",
    inclusions: ["Unlimited Mileage", "Collision Damage Waiver (CDW)", "GPS Navigation", "Free Airport Pick-up & Drop-off"]
  },
  {
    id: 202,
    name: "Mitsubishi Xpander Cross 7-Seater",
    type: "MPV / Family Van",
    seats: 7,
    transmission: "Automatic",
    fuel: "Petrol",
    dailyRate: 3200,
    originalRate: 4200,
    img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80",
    badge: "FAMILY FAVORITE",
    inclusions: ["Unlimited Mileage", "Comprehensive Insurance", "Child Seat Available", "24/7 Roadside Assistance"]
  },
  {
    id: 203,
    name: "Mini Cooper Convertible S",
    type: "Convertible / Sport",
    seats: 4,
    transmission: "Automatic",
    fuel: "Petrol",
    dailyRate: 6500,
    originalRate: 8500,
    img: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80",
    badge: "LUXURY CONVERTIBLE",
    inclusions: ["Retractable Roof", "Harman Kardon Sound", "Full Risk Coverage", "Island Delivery"]
  },
  {
    id: 204,
    name: "Toyota HiAce Commuter Van",
    type: "Passenger Van",
    seats: 12,
    transmission: "Manual",
    fuel: "Diesel",
    dailyRate: 4500,
    originalRate: 5800,
    img: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&q=80",
    badge: "GROUP TOURS",
    inclusions: ["Dedicated Driver Available", "Unlimited Luggage Space", "Full Air-Conditioning", "Inter-island Ferry Permitted"]
  },
  {
    id: 205,
    name: "Honda Civic RS Turbo",
    type: "Sedan",
    seats: 5,
    transmission: "Automatic",
    fuel: "Petrol",
    dailyRate: 2800,
    originalRate: 3600,
    img: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80",
    badge: "EXECUTIVE SEDAN",
    inclusions: ["Unlimited Mileage", "Leather Interior", "Apple CarPlay / Android Auto", "Full Insurance"]
  }
];

export default function Cars() {
  const { openCheckoutModal } = useBooking();
  const [selectedType, setSelectedType] = useState("All");

  const filteredCars = CARS_DATA.filter(
    (car) => selectedType === "All" || car.type.includes(selectedType)
  );

  const handleRentCar = (car) => {
    openCheckoutModal({
      id: `CAR-${car.id}`,
      name: `${car.name} Rental (${car.type})`,
      location: "Manila / Airport Pick-Up",
      price: car.dailyRate * 3, // Default 3 days rental
      original: car.originalRate * 3,
      duration: "3 Days Rental",
      img: car.img,
      category: "car"
    });
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-16">
      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
            <Car size={14} className="text-amber-400" /> SELF-DRIVE &amp; CHAUFFEUR CAR RENTALS
          </span>
          <h1 className="text-4xl sm:text-5xl font-black">Explore with Total Freedom</h1>
          <p className="text-slate-300 text-sm max-w-xl mx-auto">
            Rent premium SUVs, family vans, compact sedans, and luxury convertibles across major airports and tourist spots in the Philippines.
          </p>

          {/* Type Filter */}
          <div className="max-w-2xl mx-auto bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 flex flex-wrap items-center justify-center gap-2 text-xs text-white">
            <span className="font-bold flex items-center gap-1"><Filter size={14} /> Car Class:</span>
            {["All", "SUV", "Van", "Convertible", "Sedan"].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  selectedType === t
                    ? "bg-[#008fe5] text-white shadow-md"
                    : "bg-white/10 hover:bg-white/20 text-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Car Cards Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Available Rental Vehicles</h2>
            <p className="text-xs text-slate-500 mt-0.5">Showing {filteredCars.length} models in PHP (₱)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCars.map((car) => (
            <div
              key={car.id}
              className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Image */}
                <div className="relative h-48 overflow-hidden bg-slate-100">
                  <img
                    src={car.img}
                    alt={car.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    {car.badge}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  <h3 className="font-extrabold text-slate-900 text-lg leading-tight">{car.name}</h3>

                  <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold border-b border-slate-100 pb-3">
                    <span className="flex items-center gap-1"><Users size={14} className="text-[#008fe5]" /> {car.seats} Seats</span>
                    <span className="flex items-center gap-1"><Gauge size={14} className="text-[#008fe5]" /> {car.transmission}</span>
                    <span className="flex items-center gap-1"><Fuel size={14} className="text-[#008fe5]" /> {car.fuel}</span>
                  </div>

                  <div className="space-y-1 pt-1">
                    {car.inclusions.map((inc, i) => (
                      <div key={i} className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" /> {inc}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price & Rent Button */}
              <div className="p-5 pt-0 border-t border-slate-100 flex items-end justify-between mt-4">
                <div>
                  <span className="text-[11px] text-slate-400 line-through">₱{car.originalRate.toLocaleString()}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">₱{car.dailyRate.toLocaleString()}</span>
                    <span className="text-[11px] text-slate-500 font-semibold">/ day</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRentCar(car)}
                  className="bg-[#008fe5] hover:bg-blue-600 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-md text-xs hover:-translate-y-0.5 transition"
                >
                  Rent Vehicle
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
