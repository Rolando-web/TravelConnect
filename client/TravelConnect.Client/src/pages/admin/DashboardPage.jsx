import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  CalendarDays,
  CircleDollarSign,
  UsersRound,
  TicketPercent,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { getDashboardSummary, paymentsApi, bookingsApi, packagesApi, destinationsApi, assetUrl } from "../../services/api";

function money(v) {
  return `₱${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "—";
}

function dateStr(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toISOString().slice(0, 10);
}

const STATUS_META = {
  completed: { label: "Completed", badge: "badge-green", dot: "bg-badge-green", tint: "bg-badge-green/15", text: "text-badge-green" },
  upcoming: { label: "Upcoming", badge: "badge-cyan", dot: "bg-badge-cyan", tint: "bg-badge-cyan/15", text: "text-badge-cyan" },
  pending: { label: "Pending", badge: "badge-orange", dot: "bg-badge-orange", tint: "bg-badge-orange/15", text: "text-badge-orange" },
  cancelled: { label: "Cancelled", badge: "badge-red", dot: "bg-badge-red", tint: "bg-badge-red/15", text: "text-badge-red" },
};

export default function DashboardPage() {
  const { role } = useOutletContext();
  const [dateFilter, setDateFilter] = useState("Last 14 days");
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [packages, setPackages] = useState([]);
  const [destinations, setDestinations] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getDashboardSummary()
      .then((d) => !cancelled && setSummary(d))
      .catch(() => !cancelled && setSummary(null));

    paymentsApi
      .list()
      .then((d) => !cancelled && setPayments(Array.isArray(d) ? d : []))
      .catch(() => !cancelled && setPayments([]));

    bookingsApi
      .list()
      .then((d) => !cancelled && setBookings(Array.isArray(d) ? d : []))
      .catch(() => !cancelled && setBookings([]));

    packagesApi
      .list()
      .then((d) => !cancelled && setPackages(Array.isArray(d) ? d : []))
      .catch(() => !cancelled && setPackages([]));

    destinationsApi
      .list()
      .then((d) => !cancelled && setDestinations(Array.isArray(d) ? d : []))
      .catch(() => !cancelled && setDestinations([]));

    return () => {
      cancelled = true;
    };
  }, []);

  const b = summary?.bookings || {};
  const totalBookings = b.total ?? bookings.length;
  const totalRevenue = b.revenue ?? payments.reduce((s, p) => s + (p.amount || 0), 0);

  const kpis = [
    { label: "Total Bookings", value: totalBookings.toLocaleString(), subtitle: "All bookings", trend: b.upcoming ? `${b.upcoming} upcoming` : "0 upcoming", up: true, icon: CalendarDays },
    { label: "Total Revenue", value: money(totalRevenue), subtitle: "Collected payments", trend: summary?.payments?.collected ? `₱${Number(summary.payments.collected).toLocaleString()} collected` : "0 collected", up: true, icon: CircleDollarSign },
    { label: "Customers", value: (summary?.customers ?? 0).toLocaleString(), subtitle: "Registered customers", trend: "Active accounts", up: true, icon: UsersRound },
    { label: "Active Promos", value: (summary?.activePromotions ?? 0).toLocaleString(), subtitle: "Live promotions", trend: `${summary?.leads ?? 0} leads`, up: true, icon: TicketPercent },
  ];

  const statusKeys = Object.keys(STATUS_META);
  const statusSegments = statusKeys
    .map((k) => [STATUS_META[k].label, b[k] ?? 0, STATUS_META[k].dot, STATUS_META[k].badge, k])
    .filter(([, n]) => n > 0);
  const totalSeg = statusSegments.reduce((s, [, n]) => s + n, 0);
  const donutSegments = statusSegments;

  const recentOrders = payments.slice(0, 5).map((p) => ({
    order: p.referenceId || `#PAY-${p.id}`,
    customer: p.customerName || "—",
    initials: initials(p.customerName),
    date: dateStr(p.createdAt || p.paymentDate),
    amount: money(p.amount),
    status: (p.status || "paid").toLowerCase(),
  }));

  const pkgRevenues = {};
  bookings.forEach((bk) => {
    const key = bk.packageName || bk.location || "Unknown";
    pkgRevenues[key] = pkgRevenues[key] || { sales: 0, revenue: 0 };
    pkgRevenues[key].sales += 1;
    pkgRevenues[key].revenue += bk.totalAmount || 0;
  });
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&q=60",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=60",
  "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=400&q=60",
  "https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=400&q=60",
];

const pkgImageFor = (name = "", idx = 0) => {
  const n = (name || "").toLowerCase();
  const foundPkg = packages.find(
    (p) =>
      p.imageUrl &&
      ((p.name && n.includes(p.name.toLowerCase())) ||
        (p.name && n.length > 2 && p.name.toLowerCase().includes(n)) ||
        (p.location && n.includes(p.location.toLowerCase())) ||
        (p.location && n.length > 2 && p.location.toLowerCase().includes(n)))
  );
  if (foundPkg?.imageUrl) return foundPkg.imageUrl;

  const foundDest = destinations.find(
    (d) =>
      d.imageUrl &&
      ((d.name && n.includes(d.name.toLowerCase())) ||
        (d.name && n.length > 2 && d.name.toLowerCase().includes(n)) ||
        (d.region && n.includes(d.region.toLowerCase())))
  );
  if (foundDest?.imageUrl) return foundDest.imageUrl;

  return FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];
};

const topPackages = Object.entries(pkgRevenues)
  .sort((a, b) => b[1].revenue - a[1].revenue)
  .slice(0, 3)
  .map(([name, v], idx) => ({ name, imageUrl: pkgImageFor(name, idx), sales: v.sales, revenue: money(v.revenue) }));

  const donutPct = (n) => (totalSeg ? Math.round((n / totalSeg) * 100) : 0);

  return (
    <>
      {/* Header */}
      <section className="flex flex-wrap items-start justify-between mb-8">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; Dashboard</p>
          <h1 className="text-3xl font-black mt-1 font-serif">Overview</h1>
          <p className="text-text-secondary mt-2">
            {totalBookings.toLocaleString()} bookings · {payments.length.toLocaleString()} payments recorded
          </p>
        </div>
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="input-field w-auto">
          <option>This month</option>
          <option>Last 30 days</option>
        </select>
      </section>

      {/* Booking Status Strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statusKeys.map((k) => (
          <article key={k} className="card flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{STATUS_META[k].label}</p>
              <p className={`text-3xl font-black mt-1 ${STATUS_META[k].text}`}>{b[k] ?? 0}</p>
            </div>
            <span className={`w-11 h-11 rounded-2xl ${STATUS_META[k].tint} grid place-items-center`}>
              <span className={`w-3.5 h-3.5 rounded-full ${STATUS_META[k].dot}`} />
            </span>
          </article>
        ))}
      </section>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        {kpis.map(({ label, value, subtitle, trend, up, icon: Icon }) => (
          <article key={label} className="card">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 grid place-items-center rounded-xl bg-cyan-accent/15 text-cyan-accent">
                <Icon size={21} />
              </div>
              <span
                className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                  up ? "bg-badge-green/15 text-badge-green" : "bg-badge-red/15 text-badge-red"
                }`}
              >
                {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {trend}
              </span>
            </div>
            <p className="text-2xl font-black mt-4">{value}</p>
            <p className="text-sm mt-1 text-text-secondary">{label}</p>
            <p className="text-xs text-text-secondary mt-1">{subtitle}</p>
          </article>
        ))}
      </div>

      {/* Bookings by Status Donut */}
      <section className="card mb-8">
        <h2 className="font-bold text-lg mb-6">Bookings by Status</h2>
        <div className="flex flex-wrap gap-8 items-center">
          <div className="relative w-44 h-44">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#111D37" strokeWidth="12" />
              {donutSegments.length > 0 && buildDonut(donutSegments)}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black">{totalBookings}</span>
              <span className="text-[10px] text-text-secondary">Total</span>
            </div>
          </div>
          <div className="flex-1 min-w-56 space-y-2 text-xs">
            {donutSegments.length === 0 ? (
              <p className="text-text-secondary">No bookings recorded yet.</p>
            ) : (
              donutSegments.map(([status, count, color]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <span className="text-text-secondary">{status}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{count}</span>
                    <span className="text-text-secondary w-8 text-right">{donutPct(count)}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Tables Row */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent Payments */}
        <section className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-lg">Recent Payments</h2>
            <Link to="/admin/payments" className="flex items-center gap-1 text-xs text-cyan-accent hover:underline">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-header">
                <tr>
                  <th className="px-4 py-3 font-semibold">ORDER</th>
                  <th className="px-4 py-3 font-semibold">CUSTOMER</th>
                  <th className="px-4 py-3 font-semibold">DATE</th>
                  <th className="px-4 py-3 font-semibold">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-text-secondary">
                      <Inbox size={28} className="mx-auto mb-2" /> No payments yet
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((o) => (
                    <tr key={o.order + o.customer} className="table-row">
                      <td className="px-4 py-3 font-mono text-xs text-cyan-accent">{o.order}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-cyan-accent/15 flex items-center justify-center text-cyan-accent text-xs font-bold">
                            {o.initials}
                          </div>
                          <span>{o.customer}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{o.date}</td>
                      <td className="px-4 py-3 font-semibold text-badge-green">{o.amount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top Packages */}
        <section className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-lg">Top Packages</h2>
            <Link to="/admin/packages" className="flex items-center gap-1 text-xs text-cyan-accent hover:underline">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-header">
                <tr>
                  <th className="px-4 py-3 font-semibold">PACKAGE</th>
                  <th className="px-4 py-3 font-semibold">SALES</th>
                  <th className="px-4 py-3 font-semibold">REVENUE</th>
                </tr>
              </thead>
              <tbody>
                {topPackages.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-text-secondary">
                      <Inbox size={28} className="mx-auto mb-2" /> No packages sold yet
                    </td>
                  </tr>
                ) : (
                  topPackages.map((p) => (
                    <tr key={p.name} className="table-row">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img
                              src={assetUrl(p.imageUrl)}
                              alt={p.name}
                              className="w-10 h-10 rounded-lg object-cover border border-navy-700 bg-navy-900"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-navy-700 flex items-center justify-center text-lg">🌏</div>
                          )}
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-cyan-accent font-semibold">{p.sales}</td>
                      <td className="px-4 py-3 font-semibold text-badge-green">{p.revenue}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function buildDonut(segments) {
  const total = segments.reduce((s, [, n]) => s + n, 0) || 1;
  const circ = 2 * Math.PI * 40;
  let offset = 0;
  const colors = ["#06D6A0", "#00B4D8", "#FFB703", "#EF476F"];
  return segments.map(([label, n], i) => {
    const frac = n / total;
    const dash = frac * circ;
    const el = (
      <circle
        key={label}
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke={colors[i % colors.length]}
        strokeWidth="12"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={-offset}
      />
    );
    offset += dash;
    return el;
  });
}