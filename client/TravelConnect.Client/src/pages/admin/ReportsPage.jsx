import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Download, TrendingUp, CalendarRange, Inbox } from "lucide-react";
import { bookingsApi } from "../../services/api";
import ReportChart from "../../components/admin/ReportChart";

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
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
}

const STATUS_COLORS = {
  Upcoming: "#00B4D8",
  Completed: "#06D6A0",
  Cancelled: "#EF476F",
  Pending: "#FFB703",
};
const METHOD_COLORS = ["#00B4D8", "#06D6A0", "#FFB703", "#A78BFA", "#EF476F", "#8D99AE"];

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

  const statusData = useMemo(() => {
    const labels = [...stats.statuses.keys()];
    return {
      labels,
      datasets: [{
        data: labels.map((k) => stats.statuses.get(k)),
        backgroundColor: labels.map((k) => STATUS_COLORS[k] || "#8D99AE"),
        borderWidth: 0,
      }],
    };
  }, [stats]);

  const methodData = useMemo(() => {
    const entries = [...stats.methods.entries()].sort((a, b) => b[1] - a[1]);
    return {
      labels: entries.map(([k]) => k),
      datasets: [{
        data: entries.map(([, v]) => v),
        backgroundColor: entries.map((_, i) => METHOD_COLORS[i % METHOD_COLORS.length]),
        borderWidth: 0,
      }],
    };
  }, [stats]);

  const trendData = useMemo(() => ({
    labels: trend.labels.map((d) => (d.includes("-") && d.length === 7 ? d : friendlyDate(d))),
    datasets: [
      {
        label: "Bookings",
        data: trend.counts,
        borderColor: "#00B4D8",
        backgroundColor: "rgba(0,180,216,0.15)",
        fill: true,
        tension: 0.3,
        yAxisID: "y",
      },
      {
        label: "Revenue (₱)",
        data: trend.revenues,
        borderColor: "#06D6A0",
        backgroundColor: "rgba(6,214,160,0.15)",
        fill: true,
        tension: 0.3,
        yAxisID: "y1",
      },
    ],
  }), [trend]);

  const packageData = useMemo(() => ({
    labels: topPkgs.map((p) => p.name),
    datasets: [{
      label: "Revenue (₱)",
      data: topPkgs.map((p) => p.revenue),
      backgroundColor: "rgba(0,180,216,0.75)",
      borderRadius: 6,
    }],
  }), [topPkgs]);

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
      ["Report range", `${friendlyDate(fromDate)} to ${friendlyDate(toDate)}`],
      ["Total bookings", String(stats.total)],
      ["Total revenue", String(stats.revenue)],
      ["Avg booking value", String(stats.avgValue)],
      ["Cancellation rate", pct(stats.cancellationRate)],
    ];
    const headers = Object.keys(rows[0] || {});
    const lines = [
      "TravelConnect Reports",
      ...summary.map((r) => r.join(",")),
      "",
      headers.join(","),
      ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports_${fromDate}_to_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpis = [
    ["Total Revenue", money(stats.revenue), `${stats.paidCount} paid bookings`, "text-badge-green"],
    ["Total Bookings", stats.total.toLocaleString(), "Within selected range", "text-cyan-accent"],
    ["Avg Booking Value", money(stats.avgValue), "Per booking", "text-violet-400"],
    ["Cancellation Rate", pct(stats.cancellationRate), `${stats.cancelled} cancelled`, "text-badge-orange"],
  ];

  return (
    <>
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; Reports</p>
          <h1 className="text-3xl font-black mt-1 font-serif">Reports & Analytics</h1>
          <p className="text-text-secondary mt-2">Business performance overview and insights.</p>
        </div>
        <button
          className="btn-secondary bg-badge-green/15 border-badge-green/60 text-badge-green hover:bg-badge-green/25"
          onClick={handleExport}
          disabled={loading || filtered.length === 0}
        >
          <Download size={16} /> Export to Excel
        </button>
      </section>

      <div className="card mb-5 grid md:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
        <label className="text-xs text-text-secondary">
          FROM DATE
          <input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-2 input-field"
          />
        </label>
        <label className="text-xs text-text-secondary">
          TO DATE
          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-2 input-field"
          />
        </label>
        <div className="flex items-end gap-2">
          <button className="btn-primary" onClick={load}>Apply Filter</button>
          <button
            className="btn-secondary"
            onClick={() => {
              setFromDate(localDateStr(new Date(Date.now() - 29 * 86400000)));
              setToDate(localDateStr(new Date()));
            }}
          >
            Reset
          </button>
        </div>
        <div className="md:col-span-4 flex items-center gap-2 mt-2 text-xs text-text-secondary">
          <CalendarRange size={14} />
          {loading ? "Loading data..." : `Showing ${filtered.length} bookings · ${friendlyDate(fromDate)} → ${friendlyDate(toDate)}`}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        {kpis.map(([label, value, note, color]) => (
          <article key={label} className="card">
            <p className="text-text-secondary text-sm">{label}</p>
            <p className={`text-2xl font-black mt-2 ${color}`}>{value}</p>
            <p className="text-xs text-text-secondary mt-2">{note}</p>
          </article>
        ))}
      </div>

      {loading ? (
        <div className="card text-center py-14 text-text-secondary">Loading data...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-14">
          <Inbox size={36} className="mx-auto text-text-secondary mb-3" />
          <p className="text-text-secondary font-semibold">No bookings in this range</p>
          <p className="text-xs text-text-secondary mt-1">Try a wider FROM / TO date range.</p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4 mb-5">
            <ReportChart
              type="line"
              title="Bookings & Revenue Over Time"
              subtitle="Daily volume and gross revenue across the selected range"
              data={trendData}
              height={300}
options={{
                  scales: {
                    y: { ...axisColor, ...gridColor, beginAtZero: true, ticks: { ...axisColor.ticks, precision: 0 } },
                    y1: { position: "right", ...axisColor, ...gridColor, beginAtZero: true, grid: { drawOnChartArea: false } },
                    x: axisColor,
                  },
                }}
            />
            <ReportChart
              type="doughnut"
              title="Booking Status Breakdown"
              subtitle="Distribution by current booking status"
              data={statusData}
              height={300}
              options={{ cutout: "62%" }}
            />
            <ReportChart
              type="bar"
              title="Top Packages by Revenue"
              subtitle="Highest grossing packages in the selected range"
              data={packageData}
              height={300}
              options={{
                indexAxis: "y",
                scales: {
                  x: { ...axisColor, ...gridColor, beginAtZero: true },
                  y: axisColor,
                },
              }}
            />
            <ReportChart
              type="doughnut"
              title="Payment Methods"
              subtitle="How customers paid in the selected range"
              data={methodData}
              height={300}
              options={{ cutout: "62%" }}
            />
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold">Snapshot</h2>
                <p className="text-sm text-text-secondary mt-1">
                  Performance summary for the selected period.
                </p>
              </div>
              <TrendingUp size={18} className="text-cyan-accent" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                ["Total Revenue", money(stats.revenue)],
                ["Collected (paid)", money(filtered.filter((b) => b.paid).reduce((s, b) => s + (b.totalAmount ?? b.subtotal ?? 0), 0))],
                ["Total Bookings", stats.total.toLocaleString()],
                ["Avg Booking Value", money(stats.avgValue)],
                ["Cancellations", String(stats.cancelled)],
                ["Top Package", topPkgs[0]?.name || "—"],
              ].map(([label, value]) => (
                <article key={label} className="rounded-xl bg-navy-900/70 border border-navy-700 p-4">
                  <p className="text-xs text-text-secondary">{label}</p>
                  <p className="text-lg font-black mt-1">{value}</p>
                </article>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}