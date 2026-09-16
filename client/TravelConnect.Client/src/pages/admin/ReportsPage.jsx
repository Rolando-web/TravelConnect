import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Download,
  CalendarRange,
  Inbox,
  BarChart3,
  Calendar,
  TrendingUp,
  CircleDollarSign,
  CreditCard,
  Award,
  CalendarDays,
  AlertTriangle,
  RotateCcw,
  PieChart,
} from "lucide-react";
import { bookingsApi } from "../../services/api";
import ReportChart from "../../components/admin/ReportChart";
import StatCard from "../../components/admin/StatCard";

function money(v) {
  return `₱${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function pct(n) {
  return `${Math.round((n || 0) * 100) / 100}%`;
}

function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function friendlyDate(ymd) {
  const d = new Date(`${ymd}T00:00:00`);
  if (isNaN(d)) return ymd;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function shortDate(ymd) {
  const d = new Date(`${ymd}T00:00:00`);
  if (isNaN(d)) return ymd;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dayOf(b) {
  const d = new Date(b.createdAt);
  return isNaN(d) ? null : localDateStr(d);
}

function bucket(filtered) {
  const by = (keyFn) => {
    const map = new Map();
    for (const b of filtered) {
      const k = keyFn(b) || "Other";
      map.set(k, (map.get(k) || 0) + 1);
    }
    return map;
  };
  const totalAmount = filtered.reduce((s, b) => s + (b.totalAmount ?? b.subtotal ?? 0), 0);
  const cancelled = filtered.filter((b) => (b.status || "").toLowerCase() === "cancelled").length;
  return {
    total: filtered.length,
    revenue: totalAmount,
    avgValue: filtered.length ? totalAmount / filtered.length : 0,
    cancelled,
    cancellationRate: filtered.length ? (cancelled / filtered.length) * 100 : 0,
    paidCount: filtered.filter((b) => b.paid).length,
    statuses: by((b) => String(b.status || "upcoming").replace(/^\w/, (c) => c.toUpperCase())),
    methods: by((b) => b.paymentMethod || "Other"),
  };
}

function series(filtered, fromDate, toDate) {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  const days = [];
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) days.push(localDateStr(d));

  if (days.length > 60) {
    const map = new Map();
    for (const b of filtered) {
      const d = dayOf(b);
      if (!d) continue;
      const key = d.slice(0, 7);
      const rec = map.get(key) || { count: 0, revenue: 0 };
      rec.count += 1;
      rec.revenue += b.totalAmount ?? b.subtotal ?? 0;
      map.set(key, rec);
    }
    const labels = [...map.keys()].sort();
    return {
      labels,
      counts: labels.map((k) => map.get(k).count),
      revenues: labels.map((k) => map.get(k).revenue),
    };
  }
  return {
    labels: days,
    counts: days.map((day) => filtered.filter((b) => dayOf(b) === day).length),
    revenues: days.map((day) =>
      filtered.filter((b) => dayOf(b) === day).reduce((s, b) => s + (b.totalAmount ?? b.subtotal ?? 0), 0)
    ),
  };
}

function topPackages(filtered) {
  const map = new Map();
  for (const b of filtered) {
    const name = b.packageName || b.location || "Untitled";
    const rec = map.get(name) || { name, count: 0, revenue: 0 };
    rec.count += 1;
    rec.revenue += b.totalAmount ?? b.subtotal ?? 0;
    map.set(name, rec);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6);
}

const STATUS_COLORS = {
  Upcoming: "#06D6A0",
  Completed: "#2EE6B4",
  Cancelled: "#EF476F",
  Pending: "#00B4D8",
};
const METHOD_COLORS = ["#06D6A0", "#2EE6B4", "#00B4D8", "#8D99AE", "#EF476F", "#253453"];

export default function ReportsPage() {
  const { role } = useOutletContext();
  const [fromDate, setFromDate] = useState(() => localDateStr(new Date(Date.now() - 29 * 86400000)));
  const [toDate, setToDate] = useState(() => localDateStr(new Date()));
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    bookingsApi
      .list()
      .then((d) => setBookings(Array.isArray(d) ? d : []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const applyPreset = (days) => {
    const now = new Date();
    const past = new Date(Date.now() - (days - 1) * 86400000);
    setFromDate(localDateStr(past));
    setToDate(localDateStr(now));
  };

  const applyThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    setFromDate(localDateStr(firstDay));
    setToDate(localDateStr(now));
  };

  const filtered = useMemo(
    () =>
      bookings.filter((b) => {
        const d = dayOf(b);
        if (!d) return true;
        return d >= fromDate && d <= toDate;
      }),
    [bookings, fromDate, toDate]
  );

  const stats = useMemo(() => bucket(filtered), [filtered]);
  const trend = useMemo(() => series(filtered, fromDate, toDate), [filtered, fromDate, toDate]);
  const topPkgs = useMemo(() => topPackages(filtered), [filtered]);

  const busiestDay = trend.counts.length ? trend.labels[trend.counts.indexOf(Math.max(...trend.counts))] : null;
  const peakRevenueDay = trend.revenues.length ? trend.labels[trend.revenues.indexOf(Math.max(...trend.revenues))] : null;
  const topMethod = [...stats.methods.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const bestPkg = topPkgs[0]?.name || null;

  const insights = [
    {
      label: "Busiest Booking Day",
      value: busiestDay ? friendlyDate(busiestDay) : "—",
      icon: Calendar,
      tint: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
    {
      label: "Peak Revenue Day",
      value: peakRevenueDay ? friendlyDate(peakRevenueDay) : "—",
      icon: TrendingUp,
      tint: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    },
    {
      label: "Top Payment Method",
      value: topMethod || "—",
      icon: CreditCard,
      tint: "bg-cyan-accent/15 text-cyan-accent border-cyan-accent/20",
    },
    {
      label: "Top Performing Package",
      value: bestPkg || "—",
      icon: Award,
      tint: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    },
  ];

  const statusData = useMemo(() => {
    const labels = [...stats.statuses.keys()];
    return {
      labels,
      datasets: [
        {
          data: labels.map((k) => stats.statuses.get(k)),
          backgroundColor: labels.map((k) => STATUS_COLORS[k] || "#8D99AE"),
          borderWidth: 0,
        },
      ],
    };
  }, [stats]);

  const methodData = useMemo(() => {
    const labels = [...stats.methods.keys()];
    return {
      labels,
      datasets: [
        {
          data: labels.map((k) => stats.methods.get(k)),
          backgroundColor: labels.map((_, i) => METHOD_COLORS[i % METHOD_COLORS.length]),
          borderWidth: 0,
        },
      ],
    };
  }, [stats]);

  const trendData = useMemo(
    () => ({
      labels: trend.labels.map(shortDate),
      datasets: [
        {
          label: "Bookings",
          data: trend.counts,
          borderColor: "#06D6A0",
          backgroundColor: "rgba(6,214,160,0.15)",
          fill: true,
          tension: 0.3,
          yAxisID: "y",
        },
        {
          label: "Revenue (₱)",
          data: trend.revenues,
          borderColor: "#2EE6B4",
          backgroundColor: "rgba(46,230,180,0.15)",
          fill: true,
          tension: 0.3,
          yAxisID: "y1",
        },
      ],
    }),
    [trend]
  );

  const packageData = useMemo(
    () => ({
      labels: topPkgs.map((p) => p.name),
      datasets: [
        {
          label: "Revenue (₱)",
          data: topPkgs.map((p) => p.revenue),
          backgroundColor: "rgba(6,214,160,0.85)",
          borderRadius: 6,
        },
      ],
    }),
    [topPkgs]
  );

  const axisColor = { ticks: { color: "#8D99AE" } };
  const gridColor = { grid: { color: "rgba(141,153,174,0.15)" } };

  const handleExport = () => {
    const rows = filtered.map((b) => ({
      id: b.id,
      reference: b.referenceNumber || "",
      customer: b.customerName || "",
      email: b.customerEmail || "",
      phone: b.customerPhone || "",
      packageName: b.packageName || "",
      location: b.location || "",
      travellers: b.travellers ?? 0,
      startDate: b.startDate || "",
      endDate: b.endDate || "",
      subtotal: b.subtotal ?? 0,
      discount: b.discountAmount ?? 0,
      totalAmount: b.totalAmount ?? 0,
      status: b.status || "",
      paid: b.paid ? "Yes" : "No",
      paymentMethod: b.paymentMethod || "",
      createdAt: b.createdAt ? new Date(b.createdAt).toISOString().slice(0, 16).replace("T", " ") : "",
    }));
    const summary = [
      ["Report Generated", new Date().toISOString()],
      ["Date Range", `${fromDate} to ${toDate}`],
      ["Total Bookings", String(filtered.length)],
      ["Total Revenue", String(stats.revenue)],
      ["Paid Bookings", String(stats.paidCount)],
      ["Cancelled", String(stats.cancelled)],
      [],
      Object.keys(rows[0] || {}),
      ...rows.map((r) => Object.values(r)),
    ];
    const csv = summary.map((line) => line.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports_${fromDate}_to_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpis = [
    {
      label: "Total Revenue",
      value: money(stats.revenue),
      note: `${stats.paidCount} paid bookings`,
      icon: CircleDollarSign,
      color: "text-badge-green",
    },
    {
      label: "Total Bookings",
      value: stats.total.toLocaleString(),
      note: "Within selected range",
      icon: CalendarDays,
      color: "text-white",
    },
    {
      label: "Avg Booking Value",
      value: money(stats.avgValue),
      note: "Per confirmed booking",
      icon: TrendingUp,
      color: "text-cyan-accent",
    },
    {
      label: "Cancellation Rate",
      value: pct(stats.cancellationRate),
      note: `${stats.cancelled} cancelled trips`,
      icon: AlertTriangle,
      color: stats.cancellationRate > 20 ? "text-badge-red" : "text-badge-orange",
    },
  ];

  return (
    <>
      {/* Header */}
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; Reports</p>
          <h1 className="text-3xl font-black mt-1 font-serif">Reports & Analytics</h1>
          <p className="text-text-secondary mt-2">
            Business performance metrics, revenue trajectories, and volume trends.
          </p>
        </div>
        <button
          className="btn-secondary bg-badge-green/15 border-badge-green/60 text-badge-green hover:bg-badge-green/25 cursor-pointer"
          onClick={handleExport}
          disabled={loading || filtered.length === 0}
        >
          <Download size={16} /> Export to Excel (.csv)
        </button>
      </section>

      {/* Date Filter & Preset Controls */}
      <div className="card mb-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary mr-1">
              Presets:
            </span>
            <button
              type="button"
              onClick={() => applyPreset(7)}
              className="filter-pill"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset(30)}
              className="filter-pill"
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={applyThisMonth}
              className="filter-pill"
            >
              This Month
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <CalendarRange size={15} className="text-cyan-accent shrink-0" />
              <span className="text-xs font-semibold text-text-secondary">FROM</span>
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-lg border border-navy-700 bg-navy-900 px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-cyan-accent transition"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-secondary">TO</span>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-lg border border-navy-700 bg-navy-900 px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-cyan-accent transition"
              />
            </div>
            <button
              type="button"
              className="btn-primary !px-3 !py-1.5 !text-xs cursor-pointer"
              onClick={load}
            >
              Apply
            </button>
            <button
              type="button"
              className="btn-secondary !px-3 !py-1.5 !text-xs cursor-pointer"
              onClick={() => {
                setFromDate(localDateStr(new Date(Date.now() - 29 * 86400000)));
                setToDate(localDateStr(new Date()));
              }}
              title="Reset to default 30 days"
            >
              <RotateCcw size={13} /> Reset
            </button>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-navy-700/60 flex items-center justify-between text-xs text-text-secondary">
          <span>
            {loading
              ? "Loading data..."
              : `Analyzing ${filtered.length} total bookings from ${friendlyDate(fromDate)} to ${friendlyDate(toDate)}`}
          </span>
          <span className="text-cyan-accent font-medium">
            Live calculations active
          </span>
        </div>
      </div>

      {/* KPI Stat Cards Row (Right-Aligned Numbers) */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <StatCard
            key={k.label}
            label={k.label}
            value={k.value}
            note={k.note}
            icon={k.icon}
            color={k.color}
          />
        ))}
      </div>

      {loading ? (
        <div className="card text-center py-16 text-text-secondary">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-accent border-t-transparent rounded-full mx-auto mb-3" />
          <p>Compiling analytics records...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Inbox size={40} className="mx-auto text-text-secondary mb-3" />
          <p className="text-text-secondary font-bold text-base">No bookings found in this period</p>
          <p className="text-xs text-text-secondary mt-1">
            Try choosing a broader date range or select "Last 30 Days" above.
          </p>
        </div>
      ) : (
        <>
          {/* Key Insights Row */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {insights.map((ins) => {
              const Icon = ins.icon;
              return (
                <div
                  key={ins.label}
                  className="card !p-4 flex items-center gap-3.5 border border-navy-700 bg-navy-800/90 hover:border-navy-600 transition"
                >
                  <div
                    className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 border ${ins.tint}`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-text-secondary font-medium truncate">
                      {ins.label}
                    </p>
                    <p className="text-sm font-black text-white mt-0.5 truncate">
                      {ins.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trend Chart (Line) */}
          <section className="card mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-navy-700">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp size={18} className="text-cyan-accent" />
                  Bookings & Revenue Over Time
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Volume progression and gross revenue timeline across the selected date range
                </p>
              </div>
            </div>
            <ReportChart
              type="line"
              data={trendData}
              height={320}
              options={{
                scales: {
                  y: { ...axisColor, ...gridColor, beginAtZero: true, ticks: { ...axisColor.ticks, precision: 0 } },
                  y1: { position: "right", ...axisColor, ...gridColor, beginAtZero: true, grid: { drawOnChartArea: false } },
                  x: axisColor,
                },
              }}
            />
          </section>

          {/* Breakdown Row (Doughnut Charts) */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <section className="card">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-navy-700">
                <PieChart size={18} className="text-cyan-accent" />
                <div>
                  <h3 className="font-bold text-white text-base">Booking Status Distribution</h3>
                  <p className="text-xs text-text-secondary mt-0.5">Ratio of completed, upcoming, pending and cancelled trips</p>
                </div>
              </div>
              <ReportChart
                type="doughnut"
                data={statusData}
                height={260}
                options={{ cutout: "65%" }}
              />
            </section>

            <section className="card">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-navy-700">
                <CreditCard size={18} className="text-cyan-accent" />
                <div>
                  <h3 className="font-bold text-white text-base">Payment Methods Breakdown</h3>
                  <p className="text-xs text-text-secondary mt-0.5">Share of checkout transactions by payment provider</p>
                </div>
              </div>
              <ReportChart
                type="doughnut"
                data={methodData}
                height={260}
                options={{ cutout: "65%" }}
              />
            </section>
          </div>

          {/* Package Performance & Performance Snapshot */}
          <div className="grid lg:grid-cols-12 gap-6 mb-8">
            {/* Top Packages Bar Chart (7 cols) */}
            <section className="card lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-navy-700">
                  <Award size={18} className="text-cyan-accent" />
                  <div>
                    <h3 className="font-bold text-white text-base">Top Packages by Revenue</h3>
                    <p className="text-xs text-text-secondary mt-0.5">Highest grossing travel destinations and package deals</p>
                  </div>
                </div>
                <ReportChart
                  type="bar"
                  data={packageData}
                  height={Math.max(260, topPkgs.length * 44 + 60)}
                  options={{
                    indexAxis: "y",
                    scales: {
                      x: { ...axisColor, ...gridColor, beginAtZero: true },
                      y: axisColor,
                    },
                  }}
                />
              </div>
            </section>

            {/* Performance Snapshot Card (5 cols) */}
            <section className="card lg:col-span-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-navy-700">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={18} className="text-cyan-accent" />
                    <div>
                      <h3 className="font-bold text-white text-base">Performance Snapshot</h3>
                      <p className="text-xs text-text-secondary mt-0.5">Key aggregate statistics</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "Gross Total Revenue", val: money(stats.revenue), desc: "All recorded bookings in period" },
                    {
                      label: "Captured Payments",
                      val: money(filtered.filter((b) => b.paid).reduce((s, b) => s + (b.totalAmount ?? b.subtotal ?? 0), 0)),
                      desc: "Fully paid and confirmed orders",
                    },
                    { label: "Confirmed Bookings", val: stats.total.toLocaleString(), desc: "Total transactions created" },
                    { label: "Average Booking Value", val: money(stats.avgValue), desc: "Average ticket yield" },
                    { label: "Cancellations Recorded", val: String(stats.cancelled), desc: "Cancelled or refunded reservations" },
                    { label: "Top Destination Deal", val: topPkgs[0]?.name || "—", desc: "Top grossing package title" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between p-3 rounded-xl bg-navy-900/60 border border-navy-700/70"
                    >
                      <div className="min-w-0 pr-3">
                        <p className="text-xs font-semibold text-text-primary truncate">{item.label}</p>
                        <p className="text-[11px] text-text-secondary truncate">{item.desc}</p>
                      </div>
                      <p className="text-sm font-black text-cyan-accent tabular-nums text-right shrink-0">
                        {item.val}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}