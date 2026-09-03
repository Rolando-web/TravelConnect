import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Car, MapPin, ArrowLeft, CheckCircle2, ShieldCheck, Sparkles, Users, Gauge, Fuel
} from "lucide-react";
import { carsApi } from "../services/api";
import { useBooking } from "../context/BookingContext";
import FavoriteButton from "../components/shared/FavoriteButton";

const DAYS = 3;

const toBooking = (car) => ({
  id: `CAR-${car.id}`,
  name: `${car.name} Rental (${car.type})`,
  location: car.location,
  price: Number(car.pricePerDay || 0) * DAYS,
  duration: `${DAYS} Days Rental`,
  img: car.imageUrl,
  category: "car",
});

export default function CarDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openCheckoutModal } = useBooking();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    carsApi
      .get(id)
      .then((data) => { if (active) setCar(data); })
      .catch(() => { if (active) setCar(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-slate-600 font-semibold">Loading vehicle...</p>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-slate-600 font-semibold">Vehicle not found.</p>
        <Link to="/cars" className="text-[#008fe5] font-bold hover:underline">Back to Cars</Link>
      </div>
    );
  }

  const gallery = [car.imageUrl || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1600&q=80"];
  const daily = Number(car.pricePerDay || 0);
  const total = daily * DAYS;

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-16">
      {/* Breadcrumb */}
      <div className="relative z-20 bg-slate-900/90 backdrop-blur text-white py-4 px-4 sm:px-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/cars")}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <ArrowLeft size={16} /> Back to Cars
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link to="/" className="hover:underline">Home</Link> /
            <Link to="/cars" className="hover:underline">Cars</Link> /
            <span className="text-slate-200 font-bold truncate max-w-[150px] sm:max-w-none">{car.name}</span>
          </div>
        </div>
      </div>

      {/* Hero with car background */}
      <div className="relative text-white overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={gallery[0]}
            alt={car.name}
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/75 via-slate-900/55 to-slate-900/85" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-extrabold text-white px-3 py-1 rounded-full uppercase tracking-wider bg-[#008fe5]">
                  {car.status || "Active"}
                </span>
                <span className="bg-white/10 border border-white/20 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Car size={14} className="text-amber-400" /> {car.type || "Rental"}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight drop-shadow-md">
                {car.name}
              </h1>

              <div className="flex items-center gap-3">
                <FavoriteButton type="car" item={car} className="w-11 h-11" />
                <span className="text-xs text-slate-300 font-medium">
                  Save this vehicle to your favorites for easy booking
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-200 font-medium">
                <span className="flex items-center gap-1">
                  <Users size={15} className="text-[#008fe5]" /> {car.seats} Seats
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Gauge size={15} className="text-emerald-400" /> {car.transmission}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Fuel size={15} className="text-amber-400" /> {car.fuelType}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin size={15} className="text-[#008fe5]" /> {car.location}
                </span>
              </div>
            </div>

            {/* Pricing card */}
            <div className="bg-white text-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Rental Rate</span>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  {DAYS} Days Default
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">₱{daily.toLocaleString()}</span>
                  <span className="text-xs text-slate-500 font-semibold">/ day</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Estimated total · ₱{total.toLocaleString()} for {DAYS} days
                </p>
              </div>

              <button
                onClick={() => openCheckoutModal(toBooking(car))}
                className="w-full bg-gradient-to-r from-[#008fe5] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-extrabold py-4 rounded-2xl shadow-xl shadow-blue-500/25 hover:-translate-y-0.5 transition text-sm flex items-center justify-center gap-2"
              >
                <span>Rent This Vehicle</span>
                <Sparkles size={16} />
              </button>

              <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1"><ShieldCheck size={13} className="text-emerald-500" /> Full Insurance</span>
                <span>•</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={13} className="text-blue-500" /> Airport Pickup</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="relative rounded-3xl overflow-hidden shadow-lg h-72 sm:h-96 bg-slate-100">
              <img src={gallery[0]} alt={car.name} className="w-full h-full object-cover" />
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-5">
              <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={24} className="text-[#008fe5]" /> Vehicle Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-700 font-medium p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Users size={16} className="text-[#008fe5] shrink-0" /> {car.seats} Seats
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700 font-medium p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Gauge size={16} className="text-[#008fe5] shrink-0" /> {car.transmission}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700 font-medium p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Fuel size={16} className="text-[#008fe5] shrink-0" /> {car.fuelType}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700 font-medium p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Car size={16} className="text-[#008fe5] shrink-0" /> {car.type}
                </div>
              </div>
            </div>

            {/* What's included */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-5">
              <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck size={24} className="text-[#008fe5]" /> What's Included in Your Rental
              </h2>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> {car.name} for <strong className="text-slate-800">{DAYS} days</strong> — {car.transmission}, {car.fuelType}, {car.seats} seats</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Comprehensive insurance coverage included (no excess for basic damage)</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Free airport or hotel pick-up &amp; drop-off at {car.location}</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> 24/7 roadside assistance and emergency support</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Unlimited kilometers within {car.location} metro area</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Free cancellation with full refund up to 24 hours before pickup</li>
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200/80 sticky top-24 space-y-5">
              <h3 className="text-lg font-extrabold text-slate-900 pb-3 border-b border-slate-100">
                Book Rental
              </h3>
              <div className="space-y-3 text-xs">
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-black text-slate-900 text-sm">Total</span>
                  <span className="font-black text-[#008fe5] text-2xl">₱{total.toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={() => openCheckoutModal(toBooking(car))}
                className="w-full bg-[#008fe5] hover:bg-blue-600 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 transition text-sm"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
