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
  Plane,
} from "lucide-react";
import {
  getDashboardSummary,
  paymentsApi,
  bookingsApi,
  packagesApi,
  destinationsApi,
  assetUrl,
} from "../../services/api";
import ReportChart from "../../components/admin/ReportChart";

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

function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayKey(v) {
  const d = new Date(v);
  return isNaN(d) ? null : localDateStr(d);
}

function shortDate(ymd) {
  const d = new Date(`${ymd}T00:00:00`);
  return isNaN(d) ? ymd : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const STATUS_META = {
  completed: { label: "Completed", dot: "bg-badge-green", tint: "bg-badge-green/15", text: "text-badge-green" },
  upcoming: { label: "Upcoming", dot: "bg-badge-cyan", tint: "bg-badge-cyan/15", text: "text-badge-cyan" },
  pending: { label: "Pending", dot: "bg-badge-orange", tint: "bg-badge-orange/15", text: "text-badge-orange" },
  cancelled: { label: "Cancelled", dot: "bg-badge-red", tint: "bg-badge-red/15", text: "text-badge-red" },
};

const RANGE_DAYS = { "Last 14 days": 13, "Last 30 days": 29 };

function rangeFor(filter) {
  const now = new Date();
  if (filter === "This month") {
    return {
      from: localDateStr(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: localDateStr(now),
      label: `1-${now.getDate()} ${now.toLocaleDateString(undefined, { month: "short" })}`,
    };
  }
  const days = RANGE_DAYS[filter] ?? 13;
  return {
    from: localDateStr(new Date(Date.now() - days * 86400000)),
    to: localDateStr(now),
    label: filter.toLowerCase(),
  };
}

function inRange(v, from, to) {
  const k = dayKey(v);
  if (!k) return true;
  return k >= from && k <= to;
}

export default function DashboardPage() {
  const { role } = useOutletContext();
  const [range, setRange] = useState("Last 14 days");
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

  const { from, to, label } = rangeFor(range);
  const rangeBookings = bookings.filter((b) => inRange(b.createdAt, from, to));
  const rangePayments = payments.filter((p) => inRange(p.createdAt || p.paymentDate, from, to));

  const totalRevenue = rangePayments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalBookings = rangeBookings.length;

  const kpis = [
    { label: "Total Bookings", value: totalBookings.toLocaleString(), subtitle: `In the selected range`, trend: label, up: true, icon: CalendarDays },
    { label: "Total Revenue", value: money(totalRevenue), subtitle: "Collected payments", trend: `${rangePayments.length} payments`, up: true, icon: CircleDollarSign },
    { label: "Customers", value: (summary?.customers ?? 0).toLocaleString(), subtitle: "Registered customers", trend: "All-time", up: true, icon: UsersRound },
    { label: "Active Promos", value: (summary?.activePromotions ?? 0).toLocaleString(), subtitle: "Live promotions", trend: `${summary?.leads ?? 0} leads`, up: true, icon: TicketPercent },
  ];

  const statusKeys = Object.keys(STATUS_META);
  const rangeStatus = {};
  rangeBookings.forEach((bk) => {
    const k = (bk.status || "upcoming").toLowerCase();
    rangeStatus[k] = (rangeStatus[k] || 0) + 1;
  });
  const statusSegments = statusKeys
    .map((k) => [STATUS_META[k].label, rangeStatus[k] ?? 0, STATUS_META[k].dot, STATUS_META[k].text, k])
    .filter(([, n]) => n > 0);
  const totalSeg = statusSegments.reduce((s, [, n]) => s + n, 0);
  const donutSegments = statusSegments;

  const labels = [];
  for (let d = new Date(`${from}T00:00:00`); d <= new Date(`${to}T00:00:00`); d.setDate(d.getDate() + 1)) {
    labels.push(localDateStr(d));
  }
  const trendData = {
    labels: labels.map(shortDate),
    datasets: [
      {
        label: "Bookings",
        data: labels.map((day) => rangeBookings.filter((b) => dayKey(b.createdAt) === day).length),
        borderColor: "#06D6A0",
        backgroundColor: "rgba(6,214,160,0.15)",
        fill: true,
        tension: 0.3,
        yAxisID: "y",
      },
      {
        label: "Revenue (₱)",
        data: labels.map((day) =>
          rangePayments.filter((p) => dayKey(p.createdAt || p.paymentDate) === day).reduce((s, p) => s + (p.amount || 0), 0)
        ),
        borderColor: "#00B4D8",
        backgroundColor: "rgba(0,180,216,0.12)",
        fill: true,
        tension: 0.3,
        yAxisID: "y1",
      },
    ],
  };

  const axisColor = { ticks: { color: "#8D99AE" } };
  const gridColor = { grid: { color: "rgba(141,153,174,0.15)" } };

  const recentOrders = [...rangePayments]
    .sort((a, b) => new Date(b.createdAt || b.paymentDate) - new Date(a.createdAt || a.paymentDate))
    .slice(0, 5)
    .map((p) => ({
      order: p.referenceId || `#PAY-${p.id}`,
      customer: p.customerName || "—",
      initials: initials(p.customerName),
      date: dateStr(p.createdAt || p.paymentDate),
      amount: money(p.amount),
    }));

  const pkgRevenues = {};
  rangeBookings.forEach((bk) => {
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
            {totalBookings.toLocaleString()} bookings · {rangePayments.length.toLocaleString()} payments in this range
          </p>
        </div>
        <select value={range} onChange={(e) => setRange(e.target.value)} className="input-field w-auto">
          <option>Last 14 days</option>
          <option>Last 30 days</option>
          <option>This month</option>
        </select>
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

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-5 mb-8">
        {/* Trend */}
        {totalBookings === 0 ? (
          <section className="lg:col-span-2 card text-center">
            <Inbox size={32} className="mx-auto text-text-secondary mb-3" />
            <p className="text-text-secondary font-semibold">No activity in this range</p>
            <p className="text-xs text-text-secondary mt-1">Try a wider date period.</p>
          </section>
        ) : (
          <ReportChart
            type="line"
            title="Bookings & Revenue Trend"
            subtitle={`Daily volume and collected payments · ${label}`}
            data={trendData}
            height={280}
            options={{
              scales: {
                y: { ...axisColor, ...gridColor, beginAtZero: true, ticks: { ...axisColor.ticks, precision: 0 } },
                y1: { position: "right", ...axisColor, ...gridColor, beginAtZero: true, grid: { drawOnChartArea: false } },
                x: axisColor,
              },
            }}
            className="lg:col-span-2"
          />
        )}

        {/* Bookings by Status Donut */}
        <section className="card">
          <h2 className="font-bold text-lg mb-4">Bookings by Status</h2>
          <div className="flex flex-col items-center gap-5 h-[280px] justify-center">
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
            <div className="w-full space-y-2 text-xs">
              {donutSegments.length === 0 ? (
                <p className="text-center text-text-secondary">No bookings in range.</p>
              ) : (
                donutSegments.map(([status, count, color, , k]) => (
                  <div key={k} className="flex items-center justify-between">
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
      </div>

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
                      <Inbox size={28} className="mx-auto mb-2" /> No payments in range
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
                      <Inbox size={28} className="mx-auto mb-2" /> No packages sold in range
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
                            <div className="w-10 h-10 rounded-lg bg-navy-700 flex items-center justify-center text-text-secondary">
                              <Plane size={18} />
                            </div>
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