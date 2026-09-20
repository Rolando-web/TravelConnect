import { ArrowLeft, Building2, Globe, ShieldCheck, Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AgencySubscription from "../components/home/AgencySubscription";

export default function Agencies() {
  const navigate = useNavigate();

  return (
    <div className="w-full bg-slate-50 min-h-screen">
      {/* Page hero */}
      <section className="relative bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <img
            src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1920&q=70"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900/80 to-slate-900" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <ArrowLeft size={16} /> Back to Home
          </button>

          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#7dd3fc] bg-[#008fe5]/15 border border-[#008fe5]/30 rounded-full px-4 py-1.5">
              <Building2 size={13} /> For Travel Agencies
            </span>
            <h1 className="font-heading text-4xl sm:text-6xl font-black mt-4 leading-tight">
              Your Agency's Own{" "}
              <span className="text-[#38bdf8]">White-Label Booking Engine</span>
            </h1>
            <p className="text-slate-300 mt-4 text-sm sm:text-base leading-relaxed max-w-2xl">
              Sell flights, hotels, cars and vacation packages directly under your
              brand. TravelConnect powers your catalogue, bookings, seat selection,
              PayMongo wallets &amp; cards, and reporting — gated by a simple monthly
              subscription from Tier 1 to the full-blown Tier 3 system.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-6 text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1.5 bg-white/[0.06] border border-white/10 rounded-full px-3.5 py-1.5">
                <Globe size={14} className="text-[#38bdf8]" /> Multi-currency fares
              </span>
              <span className="flex items-center gap-1.5 bg-white/[0.06] border border-white/10 rounded-full px-3.5 py-1.5">
                <ShieldCheck size={14} className="text-[#38bdf8]" /> GCash · Maya · Credit Cards
              </span>
              <span className="flex items-center gap-1.5 bg-white/[0.06] border border-white/10 rounded-full px-3.5 py-1.5">
                <Headphones size={14} className="text-[#38bdf8]" /> 24/7 airline-grade support
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Tier / subscription section (reused from the landing page) */}
      <AgencySubscription />
    </div>
  );
}