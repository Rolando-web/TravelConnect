import { ArrowRight, Sparkles, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { usePublicStats } from "../../hooks/usePublicStats";

export default function CTA() {
  const { stats } = usePublicStats();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const fmt = (n) => new Intl.NumberFormat("en-US").format(n && !isNaN(n) ? n : 0);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <section className="relative py-28 overflow-hidden bg-slate-950 text-white">
      {/* Background Scenic Landscape (Mountain Valley matching screenshot) */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80"
          alt="Scenic Mountain Range"
          className="w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/90" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-8">
        
        {/* Sparkle Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] text-cyan-300 border border-white/20">
          <Sparkles size={14} className="text-amber-400" />
          <span>Stay Connected</span>
        </div>
        
        {/* Main Header Matching Screenshot: "Explore More to Get Your Comfort Zone" */}
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight max-w-3xl mx-auto">
          Explore More to Get Your <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-[#008fe5] bg-clip-text text-transparent">Comfort Zone</span>
        </h2>
        
        {/* Subtext */}
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
          Join over {fmt(stats?.happyTravelers)}+ travelers and get exclusive member rates, instant 100% refund protection, and insider secret deals sent directly to your inbox.
        </p>

        {/* Interactive Subscription Form */}
        <div className="max-w-md mx-auto pt-2">
          {subscribed ? (
            <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-5 py-3.5 rounded-2xl text-xs font-black animate-in fade-in">
              ✓ You're on the VIP list! Check your inbox for exclusive PHP promo codes.
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex items-center bg-white/10 backdrop-blur-md border border-white/25 rounded-2xl p-1.5 shadow-2xl focus-within:border-[#008fe5] transition">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email for ₱1,500 off voucher..."
                required
                className="bg-transparent px-4 py-2.5 text-xs text-white placeholder-slate-400 outline-none flex-1 font-medium"
              />
              <button
                type="submit"
                className="bg-[#008fe5] hover:bg-blue-600 active:scale-95 text-white font-black px-5 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/30 cursor-pointer"
              >
                <span>Subscribe</span>
                <Send size={12} />
              </button>
            </form>
          )}
        </div>

        {/* Buttons Grid */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            to="/explore"
            className="bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 font-black px-8 py-4 rounded-2xl shadow-xl shadow-amber-500/20 transition-all text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
          >
            <span>Plan Your Dream Trip</span>
            <ArrowRight size={15} />
          </Link>
          
          <Link
            to="/deals"
            className="bg-white/10 hover:bg-white/20 border border-white/30 active:scale-95 text-white font-extrabold px-8 py-4 rounded-2xl backdrop-blur-md transition-all text-xs sm:text-sm"
          >
            View 25% Off Deals
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-[11px] font-bold text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>100% Instant Refund to TravelConnect Money</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-400" />
            <span>No Hidden Surcharges</span>
          </div>
        </div>

      </div>
    </section>
  );
}

