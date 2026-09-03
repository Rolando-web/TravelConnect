import { Camera, MapPin, Sparkles, Heart } from "lucide-react";
import { Link } from "react-router-dom";

const GALLERY_PHOTOS = [
  {
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80",
    caption: "Santorini Caldera",
    country: "Greece",
    rotation: "-rotate-3 hover:rotate-0",
    size: "w-44 h-44 sm:w-56 sm:h-56",
  },
  {
    image: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=600&q=80",
    caption: "El Nido Bay",
    country: "Philippines",
    rotation: "rotate-2 hover:rotate-0",
    size: "w-40 h-40 sm:w-52 sm:h-52",
  },
  {
    image: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=600&q=80",
    caption: "Patagonia Glaciers",
    country: "Argentina",
    rotation: "rotate-6 hover:rotate-0",
    size: "w-48 h-48 sm:w-60 sm:h-60",
  },
  {
    image: "https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&w=600&q=80",
    caption: "Machu Picchu Peaks",
    country: "Peru",
    rotation: "-rotate-6 hover:rotate-0",
    size: "w-36 h-36 sm:w-48 sm:h-48",
  },
  {
    image: "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?auto=format&fit=crop&w=600&q=80",
    caption: "Cappadocia Sunrise",
    country: "Turkey",
    rotation: "rotate-3 hover:rotate-0",
    size: "w-48 h-48 sm:w-64 sm:h-64",
  },
  {
    image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=600&q=80",
    caption: "Phuket Emerald Waters",
    country: "Thailand",
    rotation: "-rotate-2 hover:rotate-0",
    size: "w-40 h-40 sm:w-52 sm:h-52",
  },
  {
    image: "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=600&q=80",
    caption: "Dubai Mirage",
    country: "UAE",
    rotation: "rotate-4 hover:rotate-0",
    size: "w-36 h-36 sm:w-48 sm:h-48",
  },
];

export default function TravelGallery() {
  return (
    <section className="py-24 bg-gradient-to-b from-white via-slate-50 to-white relative overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[38rem] h-[38rem] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Center Title Section (Matching screenshot style) */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] text-[#008fe5] bg-blue-50 px-3.5 py-1 rounded-full border border-blue-100">
            <Camera size={13} /> Visual Chronicle
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Moments from Around the World.
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Real snaps from our adventurous travelers exploring pristine coastlines, ancient marvels, and breathtaking altitudes.
          </p>
        </div>

        {/* Scattered Floating Photo Mosaic */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-7 p-4">
          {GALLERY_PHOTOS.map((photo, i) => (
            <div
              key={i}
              className={`relative bg-white p-2.5 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-110 hover:z-20 cursor-pointer group border border-slate-100 ${photo.rotation}`}
            >
              <div className={`overflow-hidden rounded-2xl relative ${photo.size}`}>
                <img
                  src={photo.image}
                  alt={photo.caption}
                  className="w-full h-full object-cover group-hover:scale-115 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 text-white">
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                    <MapPin size={10} /> {photo.country}
                  </span>
                  <span className="text-xs font-black leading-tight">{photo.caption}</span>
                </div>
              </div>

              {/* Polaroids corner stamp */}
              <div className="absolute -top-2 -right-2 w-7 h-7 bg-white/95 rounded-full shadow-md flex items-center justify-center text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Heart size={14} className="fill-rose-500" />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Explorer Action */}
        <div className="text-center pt-14">
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-[#008fe5] text-white font-extrabold px-8 py-4 rounded-2xl text-xs sm:text-sm shadow-xl hover:shadow-blue-500/25 transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles size={16} className="text-amber-400" />
            <span>Discover All 50+ Destinations</span>
          </Link>
        </div>

      </div>
    </section>
  );
}
