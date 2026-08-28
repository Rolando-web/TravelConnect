import { Link, useOutletContext } from "react-router-dom";
import {
  CircleDollarSign,
  UsersRound,
  CalendarDays,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const kpis = [
  {
    label: "Total Bookings",
    value: "1,248",
    trend: "+8.7%",
    up: true,
    icon: CalendarDays,
    color: "bg-cyan-accent/15 text-cyan-accent",
  },
  {
    label: "Total Revenue",
    value: "₱284.5k",
    trend: "+12.5%",
    up: true,
    icon: CircleDollarSign,
    color: "bg-badge-green/15 text-badge-green",
  },
  {
    label: "Active Customers",
    value: "4,832",
    trend: "+4.3%",
    up: true,
    icon: UsersRound,
    color: "bg-violet-500/15 text-violet-400",
  },
  {
    label: "New Customers",
    value: "1,257",
    trend: "-3.2%",
    up: false,
    icon: UsersRound,
    color: "bg-badge-orange/15 text-badge-orange",
  },
];

const recentOrders = [
  { id: "TC-BK-0047", customer: "Maria Santos", package: "Bali Serenity", amount: "₱2,598", status: "Confirmed" },
  { id: "TC-BK-0031", customer: "James Tan", package: "Paris Romance", amount: "₱3,700", status: "Upcoming" },
  { id: "TC-BK-0019", customer: "Priya Nair", package: "Tokyo Cultural", amount: "₱2,450", status: "Completed" },
  { id: "TC-BK-0055", customer: "Sarah Chen", package: "Maldives Villa", amount: "₱6,400", status: "Cancelled" },
];

const topPackages = [
  { name: "Bali Serenity Escape", bookings: 312, revenue: "₱405k", rating: "★ 4.8" },
  { name: "Paris Romance Package", bookings: 287, revenue: "₱531k", rating: "★ 4.9" },
  { name: "Tokyo Cultural Immersion", bookings: 256, revenue: "₱627k", rating: "★ 4.7" },
  { name: "Maldives Overwater Villa", bookings: 189, revenue: "₱605k", rating: "★ 5.0" },
];

const statusBadge = {
  Confirmed: "badge-green",
  Upcoming: "badge-cyan",
  Pending: "badge-orange",
  Completed: "badge-green",
  Cancelled: "badge-red",
};

export default function AdminDashboard() {
  const { role } = useOutletContext();

  return (
    <>
      {/* Header */}
      <section className="mb-8">
        <p className="text-cyan-accent font-medium text-sm">{role}</p>
        <h1 className="text-3xl font-black mt-1">Overview</h1>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <p className="text-text-secondary">
            Welcome back, Alex · Thursday, August 27
          </p>
          <select className="rounded-lg border border-navy-700 bg-navy-800 px-3 py-1.5 text-xs text-text-secondary outline-none">
            <option>Last 14 days</option>
            <option>Last 30 days</option>
            <option>This month</option>
            <option>This year</option>
          </select>
        </div>
      </section>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        {kpis.map(({ label, value, trend, up, icon: Icon, color }) => (
          <article key={label} className="card">
            <div className="flex items-center justify-between">
              <div className={`w-11 h-11 grid place-items-center rounded-xl ${color}`}>
                <Icon size={21} />
              </div>
              <span
                className={`flex items-center gap-1 text-xs font-semibold ${
                  up ? "text-badge-green" : "text-badge-red"
                }`}
              >
                {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {trend}
              </span>
            </div>
            <p className="text-2xl font-black mt-4">{value}</p>
            <p className="font-medium text-sm mt-1 text-text-secondary">{label}</p>
          </article>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-5 mb-8">
        {/* Revenue over time */}
        <section className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold">Revenue over time</h2>
            <span className="text-xs text-text-secondary">Mar 3 - Mar 24</span>
          </div>
          <div className="h-56 flex items-end gap-2 relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-accent/5 to-transparent rounded-xl" />
            {[38, 45, 40, 56, 62, 72, 68, 88, 75, 82, 90, 95].map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-gradient-to-t from-cyan-accent to-cyan-accent/60 relative"
                style={{ height: `${v}%` }}
              >
                <div className="absolute inset-0 bg-cyan-accent/20 blur-sm" />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-text-secondary mt-3">
            <span>Mar 3</span>
            <span>Mar 10</span>
            <span>Mar 17</span>
            <span>Mar 24</span>
          </div>
        </section>

        {/* Bookings by Status - Donut */}
        <section className="card flex flex-col items-center justify-center">
          <h2 className="font-bold mb-6 self-start">Bookings by Status</h2>
          <div className="relative w-40 h-40">
            {/* Donut chart placeholder */}
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1C2541" strokeWidth="12" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#06D6A0"
                strokeWidth="12"
                strokeDasharray="176 75"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#00B4D8"
                strokeWidth="12"
                strokeDasharray="42 209"
                strokeDashoffset="-176"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#FFB703"
                strokeWidth="12"
                strokeDasharray="20 231"
                strokeDashoffset="-218"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#EF476F"
                strokeWidth="12"
                strokeDasharray="8 243"
                strokeDashoffset="-238"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black">1,248</span>
              <span className="text-[10px] text-text-secondary">Total</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-badge-green" />
              <span className="text-text-secondary">Confirmed</span>
              <span className="font-semibold ml-auto">71%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-accent" />
              <span className="text-text-secondary">Upcoming</span>
              <span className="font-semibold ml-auto">17%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-badge-orange" />
              <span className="text-text-secondary">Pending</span>
              <span className="font-semibold ml-auto">8%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-badge-red" />
              <span className="text-text-secondary">Cancelled</span>
              <span className="font-semibold ml-auto">3%</span>
            </div>
          </div>
        </section>
      </div>

      {/* Tables Row */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent Orders */}
        <section className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold">Recent Orders</h2>
            <Link to="/admin/bookings" className="text-xs text-cyan-accent hover:underline">
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-header">
                <tr>
                  <th className="px-4 py-3 font-semibold">REF</th>
                  <th className="px-4 py-3 font-semibold">CUSTOMER</th>
                  <th className="px-4 py-3 font-semibold">PACKAGE</th>
                  <th className="px-4 py-3 font-semibold">AMOUNT</th>
                  <th className="px-4 py-3 font-semibold">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="table-row">
                    <td className="px-4 py-3 font-mono text-xs">{order.id}</td>
                    <td className="px-4 py-3">{order.customer}</td>
                    <td className="px-4 py-3 text-text-secondary">{order.package}</td>
                    <td className="px-4 py-3 font-semibold">{order.amount}</td>
                    <td className="px-4 py-3">
                      <span className={statusBadge[order.status]}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top Packages */}
        <section className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold">Top Packages</h2>
            <Link to="/admin/packages" className="text-xs text-cyan-accent hover:underline">
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-header">
                <tr>
                  <th className="px-4 py-3 font-semibold">PACKAGE</th>
                  <th className="px-4 py-3 font-semibold">BOOKINGS</th>
                  <th className="px-4 py-3 font-semibold">REVENUE</th>
                  <th className="px-4 py-3 font-semibold">RATING</th>
                </tr>
              </thead>
              <tbody>
                {topPackages.map((pkg) => (
                  <tr key={pkg.name} className="table-row">
                    <td className="px-4 py-3 font-medium">{pkg.name}</td>
                    <td className="px-4 py-3 text-text-secondary">{pkg.bookings}</td>
                    <td className="px-4 py-3 font-semibold text-badge-green">{pkg.revenue}</td>
                    <td className="px-4 py-3 text-badge-orange">{pkg.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
