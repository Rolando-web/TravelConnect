import { useState, useEffect } from "react";
import {
  Sparkles, Crown, Gem, Check, ArrowRight,
  Plane, Hotel, CarFront, Package, CreditCard, BarChart3, Users, Lock,
  ClipboardList, Loader2, X, Send,
} from "lucide-react";
import { sendCustomerInquiry, sendInquiryNotification } from "../../services/api";

const PLAN_ICONS = { 1: Sparkles, 2: Crown, 3: Gem };

const PLANS = [
  {
    tier: 1,
    name: "Starter",
    price: "₱2,999",
    per: "/month",
    tagline: "For solo travel consultants & small agencies",
    features: [
      "Dashboard overview",
      "Manage travel packages",
      "Bookings management",
      "Customer list",
      "Full ERP & CRM modules included",
      "Profile & support access",
      "Up to 2 users",
    ],
    cta: "Start with Tier 1",
  },
  {
    tier: 2,
    name: "Professional",
    price: "₱7,999",
    per: "/month",
    tagline: "For growing agencies with full catalogs",
    features: [
      "Everything in Starter",
      "Flights, hotels, cars & activities",
      "Promotions & campaigns",
      "Inquiry management",
      "Payment visibility",
      "Full ERP & CRM modules included",
      "Reports & analytics",
      "Up to 10 users",
    ],
    highlight: true,
    cta: "Most Popular — Go Pro",
  },
  {
    tier: 3,
    name: "Enterprise",
    price: "₱14,999",
    per: "/month",
    tagline: "For large agencies & multi-branch teams",
    features: [
      "Everything in Professional",
      "Team management (users)",
      "Supplier partnerships",
      "Full ERP & CRM modules included",
      "Payment reconciliation",
      "Advanced reports + export",
      "Up to 25 users",
    ],
    cta: "Go Enterprise",
  },
];

const MODULES = [
  { icon: Plane, label: "Flights" },
  { icon: Hotel, label: "Hotels" },
  { icon: CarFront, label: "Car Rentals" },
  { icon: Package, label: "Packages" },
  { icon: CreditCard, label: "GCash · Maya · Cards" },
  { icon: BarChart3, label: "Reports" },
  { icon: ClipboardList, label: "Full ERP & Accounting" },
  { icon: Users, label: "Full CRM & Leads" },
  { icon: Lock, label: "Tier-controlled access" },
];

export default function AgencySubscription() {
  const [selectedPlan, setSelectedPlan] = useState(null);

  return (
    <section id="for-agencies" className="relative overflow-hidden py-20 bg-slate-900 text-white">
      <div className="absolute inset-0 opacity-40">
        <img
          src="https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1920&q=70"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900/85 to-slate-900" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#7dd3fc] bg-[#008fe5]/15 border border-[#008fe5]/30 rounded-full px-4 py-1.5">
            <LinkIcon /> For Travel Agencies
          </span>
          <h2 className="font-heading text-3xl sm:text-5xl font-black mt-4 leading-tight">
            Turn Your Agency Into a{" "}
            <span className="text-[#38bdf8]">Complete Travel Platform</span>
          </h2>
          <p className="text-slate-300 mt-4 text-sm sm:text-base max-w-2xl mx-auto">
            If you manage bookings for clients, TravelConnect gives your agency its
            own booking engine — flights, hotels, cars, packages and PayMongo payments —
            controlled by simple monthly tiers. Tier 1 for essentials, Tier 3 for the
            full-blown system.
          </p>
        </div>

        {/* Module strip */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-14">
          {MODULES.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-200 bg-white/[0.06] border border-white/10 rounded-full px-3.5 py-1.5"
            >
              <Icon size={14} className="text-[#38bdf8]" /> {label}
            </span>
          ))}
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((plan) => {
            const Icon = PLAN_ICONS[plan.tier];
            return (
              <div
                key={plan.tier}
                className={`relative flex flex-col rounded-3xl p-7 ${
                  plan.highlight
                    ? "bg-gradient-to-b from-[#008fe5] to-blue-700 shadow-2xl shadow-blue-600/30 ring-2 ring-[#38bdf8]/60"
                    : "bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] transition"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest bg-white text-[#008fe5] rounded-full px-4 py-1 shadow">
                    Most Popular
                  </span>
                )}
                <div className={`flex items-center gap-2 ${plan.highlight ? "text-white" : "text-[#7dd3fc]"}`}>
                  <Icon size={22} />
                  <span className="text-xs font-black uppercase tracking-widest">Tier {plan.tier}</span>
                </div>
                <h3 className="font-heading text-2xl font-black mt-3">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="font-heading text-4xl font-black">{plan.price}</span>
                  <span className={`text-xs font-semibold ${plan.highlight ? "text-blue-100" : "text-slate-400"}`}>
                    {plan.per}
                  </span>
                </div>
                <p className={`text-xs mt-1.5 ${plan.highlight ? "text-blue-100" : "text-slate-400"}`}>
                  {plan.tagline}
                </p>

                <ul className="mt-6 space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-sm font-medium ${plan.highlight ? "text-white" : "text-slate-200"}`}>
                      <Check size={15} className={plan.highlight ? "text-white shrink-0 mt-0.5" : "text-[#4ade80] shrink-0 mt-0.5"} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`mt-7 w-full rounded-2xl py-3.5 text-sm font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
                    plan.highlight
                      ? "bg-white text-[#008fe5] hover:bg-blue-50"
                      : "bg-white/[0.08] border border-white/15 text-white hover:bg-white/[0.15]"
                  }`}
                >
                  {plan.cta} <ArrowRight size={15} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom trust bar */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-12 text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5"><Check size={14} className="text-[#4ade80]" /> Admin subscription manager included</span>
          <span className="flex items-center gap-1.5"><Check size={14} className="text-[#4ade80]" /> Full ERP &amp; CRM in every tier</span>
          <span className="flex items-center gap-1.5"><Check size={14} className="text-[#4ade80]" /> PayMongo-powered payments</span>
          <span className="flex items-center gap-1.5"><Check size={14} className="text-[#4ade80]" /> White-label customer bookings</span>
        </div>
      </div>

      {/* Tier inquiry modal */}
      <TierModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />
    </section>
  );
}

function TierModal({ plan, onClose }) {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");

  /* Close on Escape key */
  useEffect(() => {
    if (!plan) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [plan, onClose]);

  /* Prevent body scroll while open */
  useEffect(() => {
    document.body.style.overflow = plan ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [plan]);

  if (!plan) return null;

  const Icon = PLAN_ICONS[plan.tier];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setStatusMessage("");

    try {
      const emailBody = formData.message.trim() || `I want to avail the ${plan.name} (Tier ${plan.tier}) plan.`;
      const submittedAt = new Date().toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      });
      let emailOk = false;
      try {
        const result = await sendInquiryNotification({
          name: formData.name,
          email: formData.email,
          time: submittedAt,
          message: emailBody,
          tier: `Tier ${plan.tier}`,
          planName: plan.name,
        });
        emailOk = result?.sent === true;
      } catch (error) {
        console.error("Inquiry notification error:", error);
      }

      // Mirrors into the admin Subscription inbox (category "Subscription")
      // and the client's support chat, so the Super Admin can reply.
      let backendOk = false;
      try {
        await sendCustomerInquiry({
          customerName: formData.name,
          customerEmail: formData.email,
          subject: `${plan.name} (Tier ${plan.tier}) subscription inquiry`,
          category: "Subscription",
          message: emailBody,
          status: "Pending",
        });
        backendOk = true;
      } catch (error) {
        console.error("Backend inquiry error:", error);
      }

      if (emailOk || backendOk) {
        setStatus("success");
        setStatusMessage("Inquiry sent! It's now in the admin's Subscription inbox — our team will reply to you soon.");
        setFormData({ name: "", email: "", message: "" });
      } else {
        throw new Error("Failed to send");
      }
    } catch (error) {
      console.error("Inquiry error:", error?.status, error?.text || error?.message || error);
      setStatus("error");
      setStatusMessage(`Something went wrong: ${error?.text || error?.message || "Unknown error"}. Please email us at support@travelconnect.ph`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto"
      style={{ background: "rgba(2,6,23,0.75)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
      <div
        className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl shadow-blue-900/40 grid md:grid-cols-2 min-h-[480px] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition z-10"
          aria-label="Close"
        >
          <X size={17} />
        </button>

        {/* ── Left: Accessibility ─────────────────────────── */}
        <div className="p-7 sm:p-9 md:border-r border-white/10">
          <div className={`inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest rounded-full px-3.5 py-1.5 ${plan.highlight ? "bg-white text-[#008fe5]" : "bg-[#008fe5]/15 text-[#7dd3fc] border border-[#008fe5]/30"}`}>
            <Icon size={13} /> Tier {plan.tier}
          </div>
          <h3 className="font-heading text-2xl font-black mt-4 text-white">{plan.name}</h3>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-heading text-3xl font-black text-white">{plan.price}</span>
            <span className="text-xs font-semibold text-slate-400">{plan.per}</span>
          </div>

          <p className="text-[11px] font-black uppercase tracking-widest text-[#38bdf8] mt-6 mb-3">
            What You Can Access
          </p>
          <ul className="space-y-2.5">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm font-medium text-slate-200">
                <Check size={15} className="text-[#4ade80] shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Right: Contact form ─────────────────────────── */}
        <div className="p-7 sm:p-9 bg-slate-950/40 md:rounded-r-3xl">
          <p className="text-[11px] font-black uppercase tracking-widest text-[#38bdf8]">
            Contact the System Owner
          </p>
          <h4 className="font-heading text-xl font-black text-white mt-1 mb-1">
            Avail {plan.name}
          </h4>
          <p className="text-xs text-slate-400 mb-5">
            Send an inquiry and our team will email you back through the admin panel.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="tier-name" className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text"
                id="tier-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/50 focus:border-transparent transition"
                placeholder="Juan Dela Cruz"
              />
            </div>
            <div>
              <label htmlFor="tier-email" className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                id="tier-email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/50 focus:border-transparent transition"
                placeholder="juan@agency.ph"
              />
            </div>
            <div>
              <label htmlFor="tier-message" className="block text-xs font-semibold text-slate-300 mb-1.5">Message</label>
              <textarea
                id="tier-message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/50 focus:border-transparent transition resize-none"
                placeholder={`I want to avail the ${plan.name} (Tier ${plan.tier}) plan...`}
              />
            </div>

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-2xl py-3.5 text-sm font-extrabold flex items-center justify-center gap-2 transition bg-[#008fe5] text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "sending" && <Loader2 size={17} className="animate-spin" />}
              {status === "sending" ? "Sending..." : <>Send Inquiry <Send size={15} /></>}
            </button>

            {statusMessage && (
              <p className={`text-sm text-center ${status === "success" ? "text-[#4ade80]" : "text-[#f87171]"}`}>
                {statusMessage}
              </p>
            )}

            <p className="text-[11px] text-center text-slate-500 leading-relaxed">
              The system owner will get this inquiry by email and reply to you through the admin messaging panel.
            </p>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}

function LinkIcon() {
  return <Sparkles size={13} />;
}