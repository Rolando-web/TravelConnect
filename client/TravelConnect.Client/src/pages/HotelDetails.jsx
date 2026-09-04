import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Hotel, Star, MapPin, ArrowLeft, CheckCircle2, ShieldCheck, Sparkles
} from "lucide-react";
import { hotelsApi } from "../services/api";
import { useBooking } from "../context/BookingContext";
import { useCurrency } from "../context/CurrencyContext";
import FavoriteButton from "../components/shared/FavoriteButton";

const NIGHTS = 3;

const toBooking = (hotel) => ({
  id: `HOTEL-${hotel.id}`,
  name: hotel.name,
  location: hotel.location,
  price: Number(hotel.pricePerNight || 0) * NIGHTS,
  duration: `${NIGHTS} Nights`,
  img: hotel.imageUrl,
  category: "hotel",
});

const toAmenities = (h) =>
  (h.amenities || "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

export default function HotelDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openCheckoutModal } = useBooking();
  const { displayPrice } = useCurrency();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    hotelsApi
      .get(id)
      .then((data) => { if (active) setHotel(data); })
      .catch(() => { if (active) setHotel(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-slate-600 font-semibold">Loading hotel...</p>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-slate-600 font-semibold">Hotel not found.</p>
        <Link to="/hotels" className="text-[#008fe5] font-bold hover:underline">Back to Hotels</Link>
      </div>
    );
  }

  const gallery = [hotel.imageUrl || "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1600&q=80"];
  const amenities = toAmenities(hotel);
  const nightly = Number(hotel.pricePerNight || 0);
  const total = nightly * NIGHTS;

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-16">
      {/* Breadcrumb */}
      <div className="relative z-20 bg-slate-900/90 backdrop-blur text-white py-4 px-4 sm:px-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/hotels")}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <ArrowLeft size={16} /> Back to Hotels
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link to="/" className="hover:underline">Home</Link> /
            <Link to="/hotels" className="hover:underline">Hotels</Link> /
            <span className="text-slate-200 font-bold truncate max-w-[150px] sm:max-w-none">{hotel.name}</span>
          </div>
        </div>
      </div>

      {/* Hero with hotel background */}
      <div className="relative text-white overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={gallery[0]}
            alt={hotel.name}
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/75 via-slate-900/55 to-slate-900/85" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-extrabold text-white px-3 py-1 rounded-full uppercase tracking-wider bg-[#008fe5]">
                  {hotel.status || "Active"}
                </span>
                <span className="bg-white/10 border border-white/20 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Hotel size={14} className="text-amber-400" /> Premium Stay
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight drop-shadow-md">
                {hotel.name}
              </h1>

              <div className="flex items-center gap-3">
                <FavoriteButton type="hotel" item={hotel} className="w-11 h-11" />
                <span className="text-xs text-slate-300 font-medium">
                  Save to your favorites to build your dream stay list
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-200 font-medium">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star size={16} className="fill-amber-400" /> {Number(hotel.rating || 0).toFixed(1)} ({hotel.reviews || 0} reviews)
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin size={15} className="text-[#008fe5]" /> {hotel.location}
                </span>
              </div>

              <p className="text-slate-200 text-sm leading-relaxed max-w-2xl drop-shadow">
                {hotel.description}
              </p>
            </div>

            {/* Pricing card */}
            <div className="bg-white text-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Stay Price</span>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  {NIGHTS} Nights Default
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">{displayPrice(nightly)}</span>
                  <span className="text-xs text-slate-500 font-semibold">/ night</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Estimated total · {displayPrice(total)} for {NIGHTS} nights
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Available Rooms</p>
                <p className="text-sm font-extrabold text-slate-900">{hotel.roomsAvailable ?? 0} rooms</p>
              </div>

              <button
                onClick={() => openCheckoutModal(toBooking(hotel))}
                className="w-full bg-gradient-to-r from-[#008fe5] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-extrabold py-4 rounded-2xl shadow-xl shadow-blue-500/25 hover:-translate-y-0.5 transition text-sm flex items-center justify-center gap-2"
              >
                <span>Book This Hotel</span>
                <Sparkles size={16} />
              </button>

              <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1"><ShieldCheck size={13} className="text-emerald-500" /> Instant Confirmation</span>
                <span>•</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={13} className="text-blue-500" /> Free Cancellation</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Gallery */}
            <div className="relative rounded-3xl overflow-hidden shadow-lg h-72 sm:h-96">
              <img src={gallery[0]} alt={hotel.name} className="w-full h-full object-cover" />
            </div>

            {/* Amenities */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-5">
              <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={24} className="text-[#008fe5]" /> Amenities &amp; Perks
              </h2>
              {amenities.length === 0 ? (
                <p className="text-sm text-slate-500">Amenity details coming soon.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {amenities.map((am, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-700 font-medium p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> {am}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* What's included in your stay */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-5">
              <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck size={24} className="text-[#008fe5]" /> What's Included in Your Stay
              </h2>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Room for <strong className="text-slate-800">{NIGHTS} nights</strong> at {hotel.name}</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Complimentary Wi-Fi and all amenities listed above</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Daily housekeeping and fresh towels</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Free cancellation up to 48 hours before check-in — full refund</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> Check-in from 2:00 PM · Check-out by 12:00 NN</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> {hotel.reviews || 0}+ verified guest reviews with a {Number(hotel.rating || 0).toFixed(1)}-star rating</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> <strong className="text-slate-800">{hotel.roomsAvailable ?? 0} rooms</strong> currently available for this property</li>
              </ul>
            </div>
          </div>

          {/* Sticky book sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200/80 sticky top-24 space-y-5">
              <h3 className="text-lg font-extrabold text-slate-900 pb-3 border-b border-slate-100">
                Reserve Your Stay
              </h3>
              <div className="space-y-3 text-xs">
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-black text-slate-900 text-sm">Total</span>
                  <span className="font-black text-[#008fe5] text-2xl">{displayPrice(total)}</span>
                </div>
              </div>
              <button
                onClick={() => openCheckoutModal(toBooking(hotel))}
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
