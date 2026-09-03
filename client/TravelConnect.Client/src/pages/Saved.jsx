import { useNavigate, Link } from "react-router-dom";
import { Heart, MapPin, Plane, Hotel, Car, Trash2, ArrowRight, LogIn } from "lucide-react";
import { useFavorites } from "../context/FavoritesContext";
import { useAuth } from "../context/AuthContext";
import { useBooking } from "../context/BookingContext";

const typeMeta = {
  flight: { label: "Flights", icon: Plane, path: "/flights", color: "text-[#008fe5]" },
  hotel: { label: "Hotels", icon: Hotel, path: "/hotels", color: "text-[#008fe5]" },
  car: { label: "Cars", icon: Car, path: "/cars", color: "text-[#008fe5]" },
};

const toBooking = (fav) => ({
  img: fav.imageUrl,
  location: fav.location,
  price: Number(fav.price || 0),
  category: fav.type === "car" ? "car" : fav.type === "hotel" ? "hotel" : "package",
});

export default function Saved() {
  const { favorites, removeFavorite, favoriteCount } = useFavorites();
  const { isLoggedIn, openLoginModal } = useAuth();
  const { openCheckoutModal } = useBooking();
  const navigate = useNavigate();

  if (!isLoggedIn) {
    return (
      <div className="w-full bg-slate-50 min-h-screen pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <Heart size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Sign in to view your saved items</h1>
          <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
            Sign in to keep track of the flights, hotels, and cars you've saved. Your favorites are stored to your account.
          </p>
          <button
            onClick={openLoginModal}
            className="mt-6 inline-flex items-center gap-2 bg-[#008fe5] hover:bg-blue-600 text-white font-bold px-6 py-3 rounded-full shadow-lg shadow-blue-500/20 transition"
          >
            <LogIn size={16} /> Sign In
          </button>
        </div>
      </div>
    );
  }

  // Group favorites by type
  const grouped = ["flight", "hotel", "car"].map((type) => ({
    ...typeMeta[type],
    items: favorites.filter((f) => f.type === type),
  }));

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-16">
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white py-10 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
            <Heart size={24} className="fill-current" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">My Saved Items</h1>
            <p className="text-xs text-slate-300 mt-0.5">{favoriteCount} saved item{favoriteCount !== 1 ? "s" : ""} — flights, hotels &amp; cars you love</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {favoriteCount === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-lg font-semibold">You haven't saved anything yet.</p>
            <p className="text-xs text-slate-400 mt-1">Tap the ♥ button on any flight, hotel, or car to add it here.</p>
          </div>
        ) : (
          grouped.map((group) => {
            if (group.items.length === 0) return null;
            return (
              <section key={group.label}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <group.icon size={20} className={group.color} /> {group.label}
                    <span className="text-xs font-bold text-slate-400">({group.items.length})</span>
                  </h2>
                  <Link to={group.path} className="text-xs font-bold text-[#008fe5] hover:underline flex items-center gap-1">
                    Browse all <ArrowRight size={13} />
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {group.items.map((fav) => (
                    <div key={`${fav.type}-${fav.id}`} className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300">
                      <div className="relative h-40 overflow-hidden bg-slate-100">
                        <img
                          src={fav.imageUrl || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80"}
                          alt={fav.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md text-[10px] font-black text-slate-900 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <group.icon size={11} className={group.color} /> {group.label}
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2">{fav.name}</h3>
                        {fav.location && (
                          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-1">
                            <MapPin size={11} className="text-[#008fe5]" /> {fav.location}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                          <div className="text-base font-black text-slate-900">
                            ₱{Number(fav.price || 0).toLocaleString()}
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {fav.type === "hotel" ? "/ night" : fav.type === "car" ? "/ day" : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => navigate(`/${fav.type === "flight" ? "flights" : fav.type}s/${fav.id}`)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-[11px] transition"
                            >
                              View
                            </button>
                            <button
                              onClick={() => openCheckoutModal({ ...toBooking(fav), name: fav.name, id: `${fav.type.toUpperCase()}-${fav.id}` })}
                              className="bg-[#008fe5] hover:bg-blue-600 text-white font-bold px-3 py-2 rounded-xl text-[11px] transition"
                            >
                              Book
                            </button>
                            <button
                              onClick={() => removeFavorite(fav.type, fav.id)}
                              aria-label="Remove from favorites"
                              className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
