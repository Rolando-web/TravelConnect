import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Download } from "lucide-react";
import { getDashboardSummary, bookingsApi } from "../../services/api";

function money(v) {
  return `₱${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function pct(n) {
  return `${Math.round((n || 0) * 100) / 100}%`;
}

export default function ReportsPage() {
  const { role } = useOutletContext();
  const [fromDate, setFromDate] = useState("2026-03-01");
  const [toDate, setToDate] = useState("2026-08-31");
  const [summary, setSummary] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getDashboardSummary(), bookingsApi.list()])
      .then(([sRes, bRes]) => {
        if (cancelled) return;
        setSummary(sRes.status === "fulfilled" ? sRes.value : null);
        setBookings(bRes.status === "fulfilled" && Array.isArray(bRes.value) ? bRes.value : []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const b = summary?.bookings || {};
  const totalBookings = b.total ?? bookings.length;
  const totalRevenue = summary?.payments?.collected ?? b.revenue ?? bookings.reduce((s, v) => s + (v.totalAmount || 0), 0);
  const avgValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
  const cancellations = bookings.filter((x) => (x.status || "").toLowerCase() === "cancelled").length;
  const cancellationRate = bookings.length > 0 ? (cancellations / bookings.length) * 100 : 0;

  return (
    <>
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; Reports</p>
          <h1 className="text-3xl font-black mt-1 font-serif">Reports & Analytics</h1>
          <p className="text-text-secondary mt-2">Business performance overview and insights.</p>
        </div>
        <button className="btn-secondary bg-badge-green/15 border-badge-green/60 text-badge-green hover:bg-badge-green/25">
          <Download size={16} /> Export to Excel
        </button>
      </section>

      <div className="card mb-5 grid md:grid-cols-[1fr_1fr_auto] gap-3">
        <label className="text-xs text-text-secondary">
          FROM DATE
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-2 input-field"
          />
        </label>
        <label className="text-xs text-text-secondary">
          TO DATE
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-2 input-field"
          />
        </label>
        <div className="flex items-end gap-2">
          <button className="btn-primary"
            onClick={() => {
              const load = async () => {
                setLoading(true);
                const [sRes, bRes] = await Promise.allSettled([getDashboardSummary(), bookingsApi.list()]);
                setSummary(sRes.status === "fulfilled" ? sRes.value : null);
                setBookings(bRes.status === "fulfilled" && Array.isArray(bRes.value) ? bRes.value : []);
                setLoading(false);
              };
              load();
            }}
          >Apply Filter</button>
          <button
            onClick={() => { setFromDate("2026-03-01"); setToDate("2026-08-31"); }}
            className="btn-secondary"
          >
            Reset
          </button>
        </div>
        <div className="md:col-span-3 text-xs text-text-secondary">
          {loading ? "Loading data..." : `Showing ${bookings.length} bookings · All time`}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <article className="card">
          <p className="text-text-secondary text-sm">Total Revenue</p>
          <p className="text-2xl font-black mt-2 text-badge-green">{money(totalRevenue)}</p>
          <p className="text-xs text-text-secondary mt-2">All time collected</p>
        </article>
        <article className="card">
          <p className="text-text-secondary text-sm">Total Bookings</p>
          <p className="text-2xl font-black mt-2 text-cyan-accent">{totalBookings.toLocaleString()}</p>
          <p className="text-xs text-text-secondary mt-2">recorded bookings</p>
        </article>
        <article className="card">
          <p className="text-text-secondary text-sm">Avg Booking Value</p>
          <p className="text-2xl font-black mt-2">{money(avgValue)}</p>
          <p className="text-xs text-text-secondary mt-2">per booking</p>
        </article>
        <article className="card">
          <p className="text-text-secondary text-sm">Cancellation Rate</p>
          <p className="text-2xl font-black mt-2 text-badge-green">{pct(cancellationRate)}</p>
          <p className="text-xs text-text-secondary mt-2">{cancellations} cancelled</p>
        </article>
      </div>

      <div className="card mb-5">
        <h2 className="font-bold mb-1">Overview</h2>
        <p className="text-sm text-text-secondary mb-6">
          {loading ? "Loading data..." : `Currently showing ${bookings.length} bookings and ${money(totalRevenue)} in revenue.`}
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            ["Total Revenue", money(totalRevenue), "Collected & pending", "text-badge-green"],
            ["Total Bookings", totalBookings.toLocaleString(), "Upcoming, completed, cancelled", "text-cyan-accent"],
            ["Avg Booking Value", money(avgValue), "Per recorded booking", "text-violet-400"],
          ].map(([label, value, change, color]) => (
            <article key={label} className="card text-center">
              <p className="text-text-secondary text-sm">{label}</p>
              <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-text-secondary mt-2">{change}</p>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
