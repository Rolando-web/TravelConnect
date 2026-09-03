import { Heart } from "lucide-react";
import { useFavorites } from "../../context/FavoritesContext";

export default function FavoriteButton({ type, item, className = "" }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(type, item?.id);

  return (
    <button
      type="button"
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      title={active ? "Remove from Favorites" : "Add to Favorites"}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!item) return;
        toggleFavorite(type, item);
      }}
      className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md backdrop-blur-md transition-all border ${
        active
          ? "bg-rose-500 text-white border-rose-400 hover:bg-rose-600"
          : "bg-white/90 text-slate-500 border-slate-200 hover:text-rose-500 hover:border-rose-300"
      } ${className}`}
    >
      <Heart size={17} className={active ? "fill-current" : ""} />
    </button>
  );
}
