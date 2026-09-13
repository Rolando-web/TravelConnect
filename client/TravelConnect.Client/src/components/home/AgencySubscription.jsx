import { Link } from "react-router-dom";
import {
  Sparkles, Crown, Gem, Check, ArrowRight,
  Plane, Hotel, CarFront, Package, CreditCard, BarChart3, Users, Lock,
  ClipboardList,
} from "lucide-react";

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

                <Link
                  to="/agencies"
                  className={`mt-7 w-full rounded-2xl py-3.5 text-sm font-extrabold flex items-center justify-center gap-2 transition ${
                    plan.highlight
                      ? "bg-white text-[#008fe5] hover:bg-blue-50"
                      : "bg-white/[0.08] border border-white/15 text-white hover:bg-white/[0.15]"
                  }`}
                >
                  {plan.cta} <ArrowRight size={15} />
                </Link>
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
    </section>
  );
}

function LinkIcon() {
  return <Sparkles size={13} />;
}