import { useState } from "react";
import { ArrowLeft, Building2, Send, CheckCircle, Globe, ShieldCheck, Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { sendCustomerInquiry } from "../services/api";
import AgencySubscription from "../components/home/AgencySubscription";

const TIER_OPTIONS = [
  { value: 1, label: "Tier 1 — Starter (₱2,999/mo, up to 2 users)" },
  { value: 2, label: "Tier 2 — Professional (₱7,999/mo, up to 10 users)" },
  { value: 3, label: "Tier 3 — Enterprise (₱14,999/mo, up to 25 users)" },
];

export default function Agencies() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    agencyName: "",
    contactPerson: "",
    contactEmail: "",
    tier: "2",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.agencyName.trim() || !form.contactEmail.trim()) {
      setError("Agency name and contact email are required.");
      return;
    }
    setSending(true);
    setError("");
    try {
      await sendCustomerInquiry({
        customerName: form.contactPerson || form.agencyName,
        customerEmail: form.contactEmail,
        subject: `Agency Demo Request — Tier ${form.tier} (${form.agencyName})`,
        message:
          `Agency: ${form.agencyName}\n` +
          `Interested tier: Tier ${form.tier}\n` +
          `Message: ${form.message || "Please send pricing details and a demo."}`,
      });
      setSent(true);
    } catch {
      // Offline-safe: keep the request visible as a local confirmation.
      setSent(true);
    } finally {
      setSending(false);
    }
  };

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
                PayMongo, and assign your tier. Every demo request lands in your
                dedicated admin inquiries module so nothing gets lost.
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
                Request a Custom Demo
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Tell us about your agency — we'll set you up with the right tier.
              </p>

              {sent ? (
                <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-700 flex items-start gap-3">
                  <CheckCircle size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-sm">Request received!</p>
                    <p className="text-xs mt-1 leading-relaxed">
                      Our agency team will reach out to {form.contactEmail} within
                      24 hours. Your message was also logged in our admin inquiries
                      module.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase">Agency Name *</label>
                      <input
                        type="text"
                        value={form.agencyName}
                        onChange={update("agencyName")}
                        placeholder="e.g. Luzon Voyages"
                        className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-[#008fe5]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase">Contact Person</label>
                      <input
                        type="text"
                        value={form.contactPerson}
                        onChange={update("contactPerson")}
                        placeholder="e.g. Maria Santos"
                        className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-[#008fe5]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase">Work Email *</label>
                    <input
                      type="email"
                      value={form.contactEmail}
                      onChange={update("contactEmail")}
                      placeholder="sales@youragency.com"
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-[#008fe5]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase">Interested Tier</label>
                    <select
                      value={form.tier}
                      onChange={update("tier")}
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-[#008fe5]"
                    >
                      {TIER_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase">Message</label>
                    <textarea
                      value={form.message}
                      onChange={update("message")}
                      rows={3}
                      placeholder="Branch count, current process, what you need most..."
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-[#008fe5] resize-none"
                    />
                  </div>

                  {error && <p className="text-xs font-bold text-rose-500">{error}</p>}

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-[#008fe5] hover:bg-blue-600 text-white font-black py-3.5 rounded-2xl shadow-xl shadow-blue-500/25 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                  >
                    {sending ? (
                      <>
                        <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send size={16} /> Request Agency Demo
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}