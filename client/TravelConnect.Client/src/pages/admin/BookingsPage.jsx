import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Download, Plus, Search, SlidersHorizontal, Inbox } from "lucide-react";
import { bookingsApi } from "../../services/api";
import CrudModal from "../../components/admin/CrudModal";

const statusBadge = {
  Upcoming: "badge-cyan",
  Completed: "badge-green",
  Cancelled: "badge-red",
  Pending: "badge-orange",
};

const paymentBadge = {
  Paid: "badge-green",
  Pending: "badge-orange",
};

const statusFilters = ["All", "Upcoming", "Completed", "Cancelled", "Pending"];
const paymentFilters = ["All", "Paid", "Pending"];

function money(v) {
  return `₱${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "—";
}

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
}

function mapBooking(b) {
  return {
    ...b,
    ref: b.referenceNumber || `#BK-${b.id}`,
    customer: b.customerName || "—",
    destination: b.location || "—",
    depart: b.startDate || "—",
    guests: `${b.travellers ?? 0} pax`,
    total: money(b.totalAmount ?? b.subtotal),
    status: cap(b.status),
    payment: b.paid ? "Paid" : "Pending",
    initials: initials(b.customerName),
  };
}

export default function BookingsPage() {
  const { role } = useOutletContext();
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [activePayment, setActivePayment] = useState("All");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: "add", data: null });
  const [saving, setSaving] = useState(false);

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

  const openModal = (mode, data = null) => setModal({ open: true, mode, data });

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal.mode === "add") await bookingsApi.create({ booking: form, flightSegments: [] });
      else await bookingsApi.update(modal.data.id, { ...form, id: modal.data.id });
      setModal({ open: false, mode: "add", data: null });
      setLoading(true);
      load();
    } catch (err) {
      alert(err.message || "Failed to save booking");
    } finally {
      setSaving(false);
    }
  };

  const modalFields = [
    { key: "customerName", label: "Customer", required: true },
    { key: "customerEmail", label: "Customer Email", type: "text" },
    { key: "customerPhone", label: "Customer Phone" },
    { key: "packageName", label: "Package", required: true },
    { key: "location", label: "Destination" },
    { key: "startDate", label: "Start Date", type: "date" },
    { key: "endDate", label: "End Date", type: "date" },
    { key: "travellers", label: "Travellers", type: "number" },
    { key: "totalAmount", label: "Total Amount (₱)", type: "number" },
    { key: "status", label: "Status", type: "select", options: ["upcoming", "pending", "completed", "cancelled"] },
    { key: "paymentMethod", label: "Payment Method", type: "select", options: ["GCash", "PayMaya", "Card", "PayPal", "Bank"] },
    { key: "paid", label: "Payment Status", type: "checkbox" },
  ];

  const mapped = useMemo(() => bookings.map(mapBooking), [bookings]);

  const filtered = useMemo(() => {
    return mapped.filter((b) => {
      const matchQuery =
        !query ||
        b.ref.toLowerCase().includes(query.toLowerCase()) ||
        b.customer.toLowerCase().includes(query.toLowerCase()) ||
        b.destination.toLowerCase().includes(query.toLowerCase());
      const matchStatus = activeStatus === "All" || b.status === activeStatus;
      const matchPayment = activePayment === "All" || b.payment === activePayment;
      return matchQuery && matchStatus && matchPayment;
    });
  }, [mapped, query, activeStatus, activePayment]);

  const total = bookings.reduce((s, b) => s + (b.totalAmount ?? b.subtotal ?? 0), 0);
  const stats = [
    ["Total Bookings", bookings.length.toLocaleString(), "All time"],
    ["Upcoming", bookings.filter((b) => (b.status || "").toLowerCase() === "upcoming").length.toLocaleString(), "Active bookings"],
    ["Completed", bookings.filter((b) => (b.status || "").toLowerCase() === "completed").length.toLocaleString(), "Successfully done"],
    ["Total Revenue", money(total), "From all bookings"],
  ];

  return (
    <>
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; Bookings</p>
          <h1 className="text-3xl font-black mt-1 font-serif">Booking Management</h1>
          <p className="text-text-secondary mt-2">Track and manage all customer travel bookings.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary"><Download size={16} /> Export</button>
          <button onClick={() => openModal("add")} className="btn-primary"><Plus size={17} /> New Booking</button>
        </div>
      </section>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        {stats.map(([label, value, note]) => (
          <article key={label} className="card">
            <p className="text-text-secondary text-sm">{label}</p>
            <p className="text-2xl font-black mt-2">{value}</p>
            <p className="text-xs text-text-secondary mt-2">{note}</p>
          </article>
        ))}
      </div>

      <div className="card mb-5">
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-1 min-w-60 gap-2 items-center rounded-xl border border-navy-700 bg-navy-900 px-3 py-2">
            <Search size={17} className="text-text-secondary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bookings..."
              className="w-full bg-transparent outline-none text-sm text-text-primary placeholder:text-text-secondary"
            />
          </label>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-text-secondary" />
            <span className="text-xs text-text-secondary font-medium">STATUS</span>
            {statusFilters.map((s) => (
              <button key={s} onClick={() => setActiveStatus(s)} className={activeStatus === s ? "filter-pill-active" : "filter-pill"}>{s}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary font-medium">PAYMENT</span>
            {paymentFilters.map((p) => (
              <button key={p} onClick={() => setActivePayment(p)} className={activePayment === p ? "filter-pill-active" : "filter-pill"}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      <section className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-cyan-accent text-navy-900 text-left text-xs uppercase tracking-wider">
              <tr>
                {["REF", "Customer", "Destination", "Depart", "Guests", "Total", "Status", "Payment", "Actions"].map((c) => (
                  <th key={c} className="px-5 py-3 font-semibold">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-text-secondary">Loading data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-14 text-center">
                    <Inbox size={36} className="mx-auto text-text-secondary mb-3" />
                    <p className="text-text-secondary font-semibold">No bookings found</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {query ? "Try a different search." : "No bookings have been recorded yet."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id ?? b.ref} className="table-row">
                    <td className="px-5 py-4 font-mono text-xs text-cyan-accent font-semibold">{b.ref}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cyan-accent/15 flex items-center justify-center text-cyan-accent text-xs font-bold">{b.initials}</div>
                        <span>{b.customer}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-text-secondary">{b.destination}</td>
                    <td className="px-5 py-4">{b.depart}</td>
                    <td className="px-5 py-4 text-text-secondary">{b.guests}</td>
                    <td className="px-5 py-4 font-semibold text-badge-green">{b.total}</td>
                    <td className="px-5 py-4"><span className={statusBadge[b.status] || "badge-cyan"}>{b.status}</span></td>
                    <td className="px-5 py-4"><span className={paymentBadge[b.payment] || "badge-orange"}>{b.payment}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openModal("view", bookings.find((x) => x.id === b.id) || b)} className="text-xs text-cyan-accent hover:underline">View</button>
                        <button onClick={() => openModal("edit", bookings.find((x) => x.id === b.id) || b)} className="text-xs text-text-secondary hover:text-badge-orange transition">Edit</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CrudModal
        open={modal.open}
        onClose={() => setModal({ open: false, mode: "add", data: null })}
        title={modal.mode === "add" ? "New Booking" : modal.mode === "edit" ? "Edit Booking" : "Booking Details"}
        mode={modal.mode}
        fields={modalFields}
        data={modal.data || {}}
        onSave={handleSave}
        saving={saving}
      />
    </>
  );
}
