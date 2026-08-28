import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  CalendarDays,
  CircleDollarSign,
  UsersRound,
  TicketPercent,
  TrendingUp,
  Inbox,
} from "lucide-react";
import { getDashboardSummary, paymentsApi, bookingsApi } from "../../services/api";

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

export default function DashboardPage() {
  const { role } = useOutletContext();
  const [dateFilter, setDateFilter] = useState("Last 14 days");
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);

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

    return () => {
      cancelled = true;
    };
  }, []);

  const b = summary?.bookings || {};
  const totalBookings = b.total ?? bookings.length;
  const totalRevenue = b.revenue ?? payments.reduce((s, p) => s + (p.amount || 0), 0);

  const kpis = [
    { label: "Total Bookings", value: totalBookings.toLocaleString(), subtitle: "All bookings", trend: b.upcoming ? `${b.upcoming} upcoming` : "0 upcoming", up: true, icon: CalendarDays, iconBg: "bg-cyan-accent/15 text-cyan-accent" },
    { label: "Total Revenue", value: money(totalRevenue), subtitle: "Collected payments", trend: summary?.payments?.collected ? `₱${Number(summary.payments.collected).toLocaleString()} collected` : "0 collected", up: true, icon: CircleDollarSign, iconBg: "bg-badge-green/15 text-badge-green" },
    { label: "Customers", value: (summary?.customers ?? 0).toLocaleString(), subtitle: "Registered customers", trend: "Active accounts", up: true, icon: UsersRound, iconBg: "bg-violet-500/15 text-violet-400" },
    { label: "Active Promos", value: (summary?.activePromotions ?? 0).toLocaleString(), subtitle: "Live promotions", trend: `${summary?.leads ?? 0} leads`, up: true, icon: TicketPercent, iconBg: "bg-badge-orange/15 text-badge-orange" },
  ];

  const statusColors = {
    completed: "bg-badge-green",
    upcoming: "bg-cyan-accent",
    pending: "bg-badge-orange",
    cancelled: "bg-badge-red",
  };
  const statusSegments = [
    ["Completed", b.completed ?? 0, "bg-badge-green"],
    ["Upcoming", b.upcoming ?? 0, "bg-cyan-accent"],
    ["Pending", b.pending ?? 0, "bg-badge-orange"],
    ["Cancelled", b.cancelled ?? 0, "bg-badge-red"],
  ].filter(([, n]) => n > 0);
  const totalSeg = statusSegments.reduce((s, [, n]) => s + n, 0);
  const donutSegments = statusSegments;

  const recentOrders = payments.slice(0, 5).map((p) => ({
    order: p.referenceId || `#PAY-${p.id}`,
    customer: p.customerName || "—",
    initials: initials(p.customerName),
    date: dateStr(p.createdAt || p.paymentDate),
    amount: money(p.amount),
  }));

  const pkgRevenues = {};
  bookings.forEach((bk) => {
    const key = bk.packageName || bk.location || "Unknown";
    pkgRevenues[key] = pkgRevenues[key] || { sales: 0, revenue: 0 };
    pkgRevenues[key].sales += 1;
    pkgRevenues[key].revenue += bk.totalAmount || 0;
  });
  const topPackages = Object.entries(pkgRevenues)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 3)
    .map(([name, v]) => ({ name, image: "🌏", sales: v.sales, revenue: money(v.revenue) }));

  const donutPct = (n) => (totalSeg ? Math.round((n / totalSeg) * 100) : 0);

  return (
    <>
      {/* Header */}
      <section className="flex flex-wrap items-start justify-between mb-8">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; Dashboard</p>
          <h1 className="text-3xl font-black mt-1 font-serif">Overview</h1>
          <p className="text-text-secondary mt-2">Real-time business overview</p>
        </div>
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="input-field w-auto">
          <option>This month</option>
          <option>Last 30 days</option>
        </select>
      </section>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        {kpis.map(({ label, value, subtitle, trend, icon: Icon, iconBg }) => (
          <article key={label} className="card">
            <div className="flex items-center justify-between">
              <div className={`w-11 h-11 grid place-items-center rounded-xl ${iconBg}`}>
                <Icon size={21} />
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-badge-green/15 text-badge-green">
                <TrendingUp size={12} /> {trend}
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
                    <span>{count}</span>
                    <span className="text-text-secondary w-8 text-right">{donutPct(count)}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {donutSegments.length === 0 && statusColors && (
          <div className="mt-4 pt-4 border-t border-navy-700 text-xs text-text-secondary text-center">
            Total bookings: 0
          </div>
        )}
      </section>

      {/* Tables Row */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent Payments */}
        <section className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-lg">Recent Payments</h2>
            <Link to="/admin/payments" className="text-xs text-cyan-accent hover:underline">
              View all →
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
            <Link to="/admin/packages" className="text-xs text-cyan-accent hover:underline">
              View all →
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
                          <div className="w-10 h-10 rounded-lg bg-navy-700 flex items-center justify-center text-lg">
                            {p.image}
                          </div>
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
  const colors = ["#00C853", "#00A8FF", "#FF9F00", "#FF3B30"];
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
