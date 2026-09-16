import { ArrowLeft, Building2, Mail, Phone, CheckCircle, Globe, ShieldCheck, Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AgencySubscription from "../components/home/AgencySubscription";

export default function Agencies() {
  const navigate = useNavigate();

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-16">
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

      {/* Partner demo request */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-6 space-y-6">
            <div>
              <span className="text-[11px] font-mono tracking-widest uppercase text-[#008fe5] block font-bold">
                Onboarding
              </span>
              <h2 className="font-heading text-3xl font-black text-slate-900 mt-2">
                Ready to bring your agency online?
              </h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                We'll walk you through setup, import your existing packages, connect
                PayMongo, and assign your tier. Reach out below and our team will
                take it from there.
              </p>
            </div>

            <ul className="space-y-3 text-sm text-slate-700 font-medium">
              {[
                "Tier 1 — essentials dashboard, packages & bookings",
                "Full ERP & CRM included in every tier",
                "Tier 2 — full catalogue: flights, hotels, cars & payments",
                "Tier 3 — suppliers, reconciliation & full reporting",
                "Free migration of your current package list",
                "PayMongo GCash, Maya & international credit cards",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle size={17} className="text-emerald-500 shrink-0 mt-0.5" /> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-7 lg:sticky lg:top-24">
              <h2 className="font-heading text-2xl font-black text-slate-900">
                Talk to the Agency Team
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Reach out directly and our onboarding specialists will help you
                pick the right tier and set up your agency.
              </p>

              <div className="mt-6 space-y-3">
                <a
                  href="mailto:partners@travelconnect.ph"
                  className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 hover:border-[#008fe5] hover:bg-blue-50/50 transition"
                >
                  <span className="w-10 h-10 shrink-0 grid place-items-center rounded-xl bg-[#008fe5]/10 text-[#008fe5]">
                    <Mail size={18} />
                  </span>
                  <span>
                    <span className="block text-[11px] font-extrabold text-slate-400 uppercase">Email us</span>
                    <span className="block text-sm font-bold text-slate-800">partners@travelconnect.ph</span>
                  </span>
                </a>
                <a
                  href="tel:+631234567890"
                  className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 hover:border-[#008fe5] hover:bg-blue-50/50 transition"
                >
                  <span className="w-10 h-10 shrink-0 grid place-items-center rounded-xl bg-[#008fe5]/10 text-[#008fe5]">
                    <Phone size={18} />
                  </span>
                  <span>
                    <span className="block text-[11px] font-extrabold text-slate-400 uppercase">Call us</span>
                    <span className="block text-sm font-bold text-slate-800">+63 123 456 7890</span>
                  </span>
                </a>
              </div>

              <p className="mt-5 flex items-start gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <CheckCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                Agency demos are handled by our team directly — no automated form
                submission, so every conversation gets a personal reply.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}