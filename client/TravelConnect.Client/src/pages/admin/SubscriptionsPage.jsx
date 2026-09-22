import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  Check,
  Minus,
  Plus,
  Search,
  Sparkles,
  Crown,
  Gem,
  RefreshCw,
  Trash2,
  CreditCard,
  Users,
  CircleDollarSign,
  Clock,
  BadgeCheck,
  Inbox,
  Mail,
  MailCheck,
  MailX,
  ArrowUpRight,
} from "lucide-react";
import { subscriptionsApi, supportAdminApi } from "../../services/api";
import CrudModal from "../../components/admin/CrudModal";
import StatCard from "../../components/admin/StatCard";
import Pagination from "../../components/admin/Pagination";

const TIER_META = {
  1: { name: "Starter", price: 2999, icon: Sparkles, badge: "badge-cyan", ring: "text-cyan-accent" },
  2: { name: "Professional", price: 7999, icon: Crown, badge: "badge-purple", ring: "text-purple-400" },
  3: { name: "Enterprise", price: 14999, icon: Gem, badge: "badge-green", ring: "text-[#06D6A0]" },
};

const STATUS_BADGE = {
  Active: "badge-green",
  Trial: "badge-cyan",
  Expired: "badge-orange",
  Suspended: "badge-red",
  Cancelled: "badge-gray",
};

const STATUSES = ["Active", "Trial", "Expired", "Suspended", "Cancelled"];

// Grid of every module and which tiers unlock it.
const MODULES = [
  ["Dashboard", "dashboard", "View", "View", "View"],
  ["Travel Packages", "packages", "Manage", "Manage", "Manage"],
  ["Bookings", "bookings", "Manage", "Manage", "Manage"],
  ["Customers", "customers", "View", "Manage", "Manage"],
  ["Profile & Support", "profile", "Manage", "Manage", "Manage"],
  ["Flights", "flights", "—", "Manage", "Manage"],
  ["Hotels", "hotels", "—", "Manage", "Manage"],
  ["Car Rentals", "cars", "—", "Manage", "Manage"],
  ["Activities", "activities", "—", "Manage", "Manage"],
  ["Destinations", "destinations", "—", "Manage", "Manage"],
  ["Suppliers", "suppliers", "—", "View", "Manage"],
  ["Promotions", "promotions", "—", "Manage", "Manage"],
  ["Inquiries", "inquiries", "—", "Manage", "Manage"],
  ["Payments", "payments", "—", "View", "Manage"],
  ["Reports & Analytics", "reports", "View", "View", "Manage"],
  ["ERP & Accounting", "erp", "Manage", "Manage", "Manage"],
  ["CRM & Leads", "leads", "Manage", "Manage", "Manage"],
  ["System Users", "users", "—", "—", "Manage"],
  ["System Settings", "settings", "—", "—", "View"],
];

const planFeatureHighlights = [
  {
    tier: 1,
    title: "Starter",
    price: "₱2,999/mo",
    tagline: "For solo travel consultants & small agencies",
    features: ["Dashboard overview", "Manage travel packages", "Bookings management", "Customer list", "Full ERP & CRM modules", "Profile & support access", "Up to 2 users"],
  },
  {
    tier: 2,
    title: "Professional",
    price: "₱7,999/mo",
    tagline: "For growing agencies with full catalogs",
    features: ["Everything in Starter", "Flights, hotels, cars & activities", "Promotions & campaigns", "Inquiry management", "Payment visibility", "Full ERP & CRM modules", "Reports & analytics", "Up to 10 users"],
    highlight: true,
  },
  {
    tier: 3,
    title: "Enterprise",
    price: "₱14,999/mo",
    tagline: "For large agencies & multi-branch teams",
    features: ["Everything in Professional", "Team management (users)", "Supplier partnerships", "Full ERP & CRM modules", "Payment reconciliation", "Advanced reports + export", "Up to 25 users"],
  },
];

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "—";
}

export default function SubscriptionsPage() {
  const { role } = useOutletContext();
  const [subs, setSubs] = useState([]);
  const [, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: "add", data: null });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const showToast = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  };

  const [emailHistory, setEmailHistory] = useState([]);
  const [emailHistoryLoading, setEmailHistoryLoading] = useState(true);

  const loadEmailHistory = async (asLoading = true) => {
    if (asLoading) setEmailHistoryLoading(true);
    try {
      const data = await supportAdminApi.emails();
      setEmailHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Failed to load email history:", err.message);
      setEmailHistory([]);
    } finally {
      setEmailHistoryLoading(false);
    }
  };

  const load = () => {
    setLoading(true);
    Promise.all([
      subscriptionsApi.list().catch(() => []),
      subscriptionsApi.getPlans().catch(() => []),
      subscriptionsApi.getStats().catch(() => null),
    ])
      .then(([s, p, st]) => {
        setSubs(Array.isArray(s) ? s : []);
        setPlans(Array.isArray(p) ? p : []);
        setStats(st);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    loadEmailHistory();
  }, []);

  const openModal = (mode, data = null) => setModal({ open: true, mode, data });

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal.mode === "add") {
        await subscriptionsApi.create(form);
        showToast("Subscription created");
      } else {
        await subscriptionsApi.update(modal.data.id, { ...form, id: modal.data.id });
        showToast("Subscription updated");
      }
      setModal({ open: false, mode: "add", data: null });
      load();
    } catch (err) {
      showToast(err.message || "Failed to save subscription");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sub) => {
    if (!window.confirm(`Delete subscription for "${sub.agencyName}"?`)) return;
    try {
      await subscriptionsApi.remove(sub.id);
      showToast("Subscription deleted");
      load();
    } catch (err) {
      showToast(err.message || "Failed to delete subscription");
    }
  };

  const filtered = useMemo(() => {
    return subs.filter((s) => {
      const matchQuery =
        !query ||
        (s.agencyName || "").toLowerCase().includes(query.toLowerCase()) ||
        (s.contactEmail || "").toLowerCase().includes(query.toLowerCase());
      const matchTier = tierFilter === "all" || String(s.tierLevel) === tierFilter;
      const matchStatus = statusFilter === "all" || s.planStatus === statusFilter;
      return matchQuery && matchTier && matchStatus;
    });
  }, [subs, query, tierFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [query, tierFilter, statusFilter]);

  const daysLeft = (sub) => {
    const end = new Date(sub.endDate);
    const diff = end - new Date();
    return Math.ceil(diff / 86400000);
  };

  const statCards = [
    { label: "Total Subscriptions", value: stats?.total ?? subs.length, note: "All agencies", icon: CreditCard },
    { label: "Active", value: stats?.active ?? 0, note: "Paying accounts", icon: BadgeCheck },
    { label: "Monthly Revenue", value: `₱${(stats?.monthlyRevenue ?? 0).toLocaleString()}`, note: "Active + trial", icon: CircleDollarSign },
    { label: "Expiring in 30 days", value: stats?.expiringSoon ?? 0, note: "Needs renewal", icon: Clock },
  ];

  const modalFields = [
    { key: "agencyName", label: "Agency Name", required: true },
    { key: "contactEmail", label: "Contact Email", required: true },
    { key: "contactPhone", label: "Contact Phone" },
    { key: "tierLevel", label: "Tier Level", type: "select", required: true, options: [
      { value: 1, label: "Tier 1 — Starter (₱2,999/mo, 2 users)" },
      { value: 2, label: "Tier 2 — Professional (₱7,999/mo, 10 users)" },
      { value: 3, label: "Tier 3 — Enterprise (₱14,999/mo, 25 users)" },
    ] },
    { key: "planStatus", label: "Status", type: "select", options: STATUSES },
    { key: "startDate", label: "Start Date", type: "date" },
    { key: "endDate", label: "End Date", type: "date" },
    { key: "notes", label: "Notes", type: "textarea", rows: 2 },
  ];

  return (
    <>
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; Subscriptions</p>
          <h1 className="text-3xl font-black mt-1 font-serif">Subscription Management</h1>
          <p className="text-text-secondary mt-2">Manage agency subscriptions and control what each tier can access.</p>
        </div>
        <button onClick={() => openModal("add")} className="btn-primary"><Plus size={17} /> New Subscription</button>
      </section>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-[#06D6A0] text-navy-900 text-sm font-bold px-5 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <BadgeCheck size={16} /> {toast}
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, note, icon }) => (
          <StatCard
            key={label}
            label={label}
            value={value}
            note={note}
            icon={icon}
          />
        ))}
      </div>

      {/* Tier comparison */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-bold">Subscription Tiers</h2>
          <span className="text-xs text-text-secondary">What each subscription unlocks</span>
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          {planFeatureHighlights.map((p) => {
            const Meta = TIER_META[p.tier];
            const Icon = Meta.icon;
            return (
              <article key={p.tier} className={`card flex flex-col ${p.highlight ? "ring-2 ring-[#06D6A0]/60" : ""} ${p.highlight ? "border-[#06D6A0]/40" : ""}`}>
                <div className={`flex items-center gap-2 ${Meta.ring}`}>
                  <Icon size={22} />
                  <h3 className="text-lg font-black">Tier {p.tier} · {p.title}</h3>
                </div>
                <p className="text-2xl font-black mt-3">{p.price}</p>
                <p className="text-xs text-text-secondary mt-1">{p.tagline}</p>
                <ul className="mt-4 space-y-2 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-text-primary">
                      <Check size={15} className="text-[#06D6A0] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {p.highlight && (
                  <span className="mt-4 inline-flex self-start items-center gap-1.5 rounded-full bg-[#06D6A0] text-navy-900 text-[11px] font-black px-3 py-1 uppercase tracking-wide">
                    <Sparkles size={12} /> Most Popular
                  </span>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {/* Module access matrix */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-bold">Module Access Matrix</h2>
          <span className="text-xs text-text-secondary">Feature gating per tier</span>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-navy-700">
                <th className="text-left text-xs font-bold text-text-secondary px-4 py-3">Module</th>
                <th className="text-center text-xs font-bold text-cyan-accent px-4 py-3">Tier 1 Starter</th>
                <th className="text-center text-xs font-bold text-purple-400 px-4 py-3">Tier 2 Professional</th>
                <th className="text-center text-xs font-bold text-[#06D6A0] px-4 py-3">Tier 3 Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map(([label, key, t1, t2, t3]) => (
                <tr key={key} className="border-b border-navy-800/60 last:border-0">
                  <td className="px-4 py-2.5 text-sm font-medium">{label}</td>
                  {[t1, t2, t3].map((val, i) => (
                    <td key={i} className="px-4 py-2.5 text-center">
                      {val === "—" ? (
                        <span className="inline-flex items-center justify-center text-text-secondary/50"><Minus size={14} /></span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          val === "Manage" ? "bg-[#06D6A0]/15 text-[#06D6A0]" : "bg-cyan-accent/10 text-cyan-accent"
                        }`}>
                          {val === "Manage" ? <Check size={11} /> : <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />}
                          {val}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tier inquiry chat lives in the Support Hub now */}
      <div className="card mb-8 p-5 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-accent/15 text-cyan-accent flex items-center justify-center shrink-0">
            <ArrowUpRight size={18} />
          </div>
          <div>
            <h2 className="font-bold">Tier Inquiry Chat — moved to the Support Hub</h2>
            <p className="text-sm text-text-secondary">
              Reply to customers' tier questions there (Super Admin). Email history stays below.
            </p>
          </div>
        </div>
        <Link to="/admin/support-hub" className="btn-primary">
          Open Support Hub <ArrowUpRight size={15} />
        </Link>
      </div>

      {/* Email history */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Mail size={17} className="text-cyan-accent" /> Email History
            </h2>
            <span className="text-xs text-text-secondary bg-navy-800 rounded-full px-2.5 py-1">{emailHistory.length}</span>
          </div>
          <button
            onClick={() => loadEmailHistory()}
            className="text-xs text-text-secondary hover:text-cyan-accent flex items-center gap-1"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <div className="card overflow-x-auto">
          {emailHistoryLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-7 h-7 border-2 border-[#06D6A0] border-t-transparent rounded-full" />
            </div>
          ) : emailHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <Mail size={34} className="mb-3 opacity-50" />
              <p className="font-medium">No subscription inquiry emails yet</p>
              <p className="text-sm mt-1">Tier inquiries from the website and email replies will appear here.</p>
            </div>
          ) : (
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-navy-700 text-left">
                  <th className="px-4 py-3 text-xs font-bold text-text-secondary">Type</th>
                  <th className="px-4 py-3 text-xs font-bold text-text-secondary">Subject</th>
                  <th className="px-4 py-3 text-xs font-bold text-text-secondary">Recipient</th>
                  <th className="px-4 py-3 text-xs font-bold text-text-secondary">Status</th>
                  <th className="px-4 py-3 text-xs font-bold text-text-secondary">Sent At</th>
                </tr>
              </thead>
              <tbody>
                {emailHistory.map((e) => {
                  const isNotice = e.type === "subscription_inquiry_notice";
                  const isSent = e.status === "Sent" || e.status === "sent";
                  return (
                    <tr key={e.id} className="border-b border-navy-800/60 last:border-0 hover:bg-navy-900/40 transition">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${isNotice ? "badge-cyan" : "badge-green"}`}>
                          {isNotice ? <Inbox size={11} /> : <MailCheck size={11} />}
                          {isNotice ? "Inquiry Notice" : "Reply Email"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{e.subject || "—"}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{e.recipientEmail || "—"}</td>
                      <td className="px-4 py-3">
                        {isSent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#06D6A0]">
                            <MailCheck size={12} /> Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-badge-red">
                            <MailX size={12} /> Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {e.sentAt ? new Date(e.sentAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Subscriptions table */}
      <div>
        <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">Agency Subscriptions</h2>
            <span className="text-xs text-text-secondary bg-navy-800 rounded-full px-2.5 py-1">{filtered.length}</span>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search agency..."
                className="pl-9 pr-3 py-2 bg-navy-900 border border-navy-700 rounded-xl text-sm placeholder:text-text-secondary focus:outline-none focus:border-cyan-accent"
              />
            </div>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="bg-navy-900 border border-navy-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-accent"
            >
              <option value="all">All Tiers</option>
              <option value="1">Tier 1 — Starter</option>
              <option value="2">Tier 2 — Professional</option>
              <option value="3">Tier 3 — Enterprise</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-navy-900 border border-navy-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-accent"
            >
              <option value="all">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="card overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-8 h-8 border-2 border-[#06D6A0] border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
              <CreditCard size={40} className="mb-3 opacity-50" />
              <p className="font-medium">No subscriptions found</p>
              <p className="text-sm mt-1">Create your first agency subscription to get started.</p>
            </div>
          ) : (
            <>
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-navy-700 text-left">
                  <th className="px-4 py-3 text-xs font-bold text-text-secondary">Agency</th>
                  <th className="px-4 py-3 text-xs font-bold text-text-secondary">Tier</th>
                  <th className="px-4 py-3 text-xs font-bold text-text-secondary">Status</th>
                  <th className="px-4 py-3 text-xs font-bold text-text-secondary">Price</th>
                  <th className="px-4 py-3 text-xs font-bold text-text-secondary">Users</th>
                  <th className="px-4 py-3 text-xs font-bold text-text-secondary">Expiry</th>
                  <th className="px-4 py-3 text-xs font-bold text-text-secondary">License</th>
                  <th className="px-4 py-3 text-xs font-bold text-text-secondary text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((s) => {
                  const meta = TIER_META[s.tierLevel] || TIER_META[3];
                  const TierIcon = meta.icon;
                  const dl = daysLeft(s);
                  return (
                    <tr key={s.id} className="border-b border-navy-800/60 last:border-0 hover:bg-navy-900/40 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#06D6A0]/15 flex items-center justify-center text-[#06D6A0] text-xs font-black shrink-0">
                            {initials(s.agencyName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{s.agencyName}</p>
                            <p className="text-xs text-text-secondary truncate">{s.contactEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${meta.badge}`}>
                          <TierIcon size={12} /> Tier {s.tierLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-bold ${STATUS_BADGE[s.planStatus] || "badge-gray"}`}>
                          {s.planStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">₱{Number(s.monthlyPrice).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center gap-1 text-text-secondary">
                          <Users size={13} /> {s.maxUsers}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{new Date(s.endDate).toLocaleDateString()}</p>
                        <p className={`text-xs ${s.planStatus === "Active" && dl < 30 ? "text-badge-red" : "text-text-secondary"}`}>
                          {s.planStatus === "Active" ? (dl >= 0 ? `${dl} days left` : "Expired") : "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-[11px] bg-navy-900 rounded-lg px-2 py-1 text-cyan-accent">{s.licenseKey || "—"}</code>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openModal("edit", s)}
                            className="p-2 rounded-lg text-text-secondary hover:bg-navy-700 hover:text-white transition"
                            title="Edit subscription"
                          >
                            <RefreshCw size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            className="p-2 rounded-lg text-text-secondary hover:bg-badge-red/20 hover:text-badge-red transition"
                            title="Delete subscription"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPage={setPage}
            />
            </>
          )}
        </div>
      </div>

      <CrudModal
        open={modal.open}
        onClose={() => setModal({ open: false, mode: "add", data: null })}
        mode={modal.mode}
        title={modal.mode === "add" ? "New Agency Subscription" : `Edit — ${modal.data?.agencyName || "Subscription"}`}
        fields={modalFields}
        data={modal.data || {}}
        onSave={handleSave}
        saving={saving}
      />
    </>
  );
}