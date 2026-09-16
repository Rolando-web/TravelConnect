import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Download, Plus, Search, SlidersHorizontal, Inbox, RefreshCcw, Armchair, X } from "lucide-react";
import { bookingsApi, adminOverrideSeat } from "../../services/api";
import CrudModal from "../../components/admin/CrudModal";
import StatCard from "../../components/admin/StatCard";
import Pagination from "../../components/admin/Pagination";

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
  const [seatModal, setSeatModal] = useState({ open: false, booking: null, seats: {} });
  const [overrideBusy, setOverrideBusy] = useState(false);
  const [overrideMsg, setOverrideMsg] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

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

  const segmentsOf = (b) => {
    const segs = Array.isArray(b.bookingFlights) ? b.bookingFlights : Array.isArray(b.flights) ? b.flights : [];
    return segs
      .map((s, i) => ({
        segmentOrder: s.segmentOrder ?? i,
        label: s.seatNumber
          ? `F${i + 1}: ${s.airline || s.flight?.airline || ""} ${s.flightNumber || s.flight?.flightNumber || ""} · SEAT ${s.seatNumber}`
          : `F${i + 1}: ${s.airline || s.flight?.airline || ""} ${s.flightNumber || s.flight?.flightNumber || ""} · No seat`,
        currentSeat: s.seatNumber || "",
      }))
      .filter((s) => s.label.trim().length > 4);
  };

  const openSeatModal = (b) => {
    setOverrideMsg("");
    const segs = segmentsOf(b);
    setSeatModal({
      open: true,
      booking: b,
      seats: Object.fromEntries(segs.map((s) => [s.segmentOrder, s.currentSeat])),
    });
  };

  const handleOverride = async () => {
    const booking = seatModal.booking;
    const segments = segmentsOf(booking);
    if (!booking || segments.length === 0) return;
    setOverrideBusy(true);
    setOverrideMsg("");
    let ok = 0;
    try {
      for (const s of segments) {
        const newSeat = (seatModal.seats[s.segmentOrder] || "").trim();
        if (newSeat && newSeat.toUpperCase() !== String(s.currentSeat || "").toUpperCase()) {
          await adminOverrideSeat({
            bookingId: booking.id,
            segmentOrder: s.segmentOrder,
            newSeatNumber: newSeat.toUpperCase(),
          });
          ok += 1;
        }
      }
      setOverrideMsg(`${ok} seat${ok === 1 ? "" : "s"} updated.`);
      setSeatModal({ ...seatModal, open: false });
      setLoading(true);
      load();
      alert(`Seat override applied (${ok} updated).`);
    } catch (err) {
      setOverrideMsg(err.message || "Failed to override seat");
    } finally {
      setOverrideBusy(false);
    }
  };

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 whenever filters change
  useMemo(() => setPage(1), [query, activeStatus, activePayment]);

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
          <StatCard key={label} label={label} value={value} note={note} />
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
                paginated.map((b) => (
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
                        <button
                          onClick={() => openSeatModal(bookings.find((x) => x.id === b.id) || b)}
                          className="text-xs text-badge-green hover:underline flex items-center gap-1"
                        >
                          <Armchair size={12} /> Seats
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
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

      {seatModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md card rounded-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-accent/15 text-cyan-accent flex items-center justify-center">
                  <Armchair size={17} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-black">Seat Override</h3>
                  <p className="text-xs text-text-secondary font-mono">
                    {seatModal.booking.referenceNumber || `#BK-${seatModal.booking.id}`} · {seatModal.booking.customerName || seatModal.booking.customer || ""}
                  </p>
                </div>
              </div>
              <button onClick={() => setSeatModal({ ...seatModal, open: false })} className="text-text-secondary hover:text-badge-red transition">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5">
              {segmentsOf(seatModal.booking).length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-4">No flight segments on this booking.</p>
              ) : (
                segmentsOf(seatModal.booking).map((s) => (
                  <div key={s.segmentOrder} className="rounded-xl border border-navy-700 bg-navy-900 p-3 space-y-1.5">
                    <p className="text-xs text-text-secondary font-mono truncate">{s.label}</p>
                    <input
                      value={seatModal.seats[s.segmentOrder] || ""}
                      onChange={(e) =>
                        setSeatModal((prev) => ({ ...prev, seats: { ...prev.seats, [s.segmentOrder]: e.target.value.toUpperCase() } }))
                      }
                      placeholder="e.g. 12A"
                      className="w-full rounded-lg border border-navy-700 bg-navy-950 px-3 py-2 text-sm font-mono font-bold text-cyan-accent outline-none focus:border-cyan-accent/60"
                    />
                  </div>
                ))
              )}
            </div>

            {overrideMsg && (
              <p className={`text-xs ${overrideMsg.includes("updated") ? "text-badge-green" : "text-badge-red"}`}>{overrideMsg}</p>
            )}

            <button
              onClick={handleOverride}
              disabled={overrideBusy || segmentsOf(seatModal.booking).length === 0}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCcw size={15} className={overrideBusy ? "animate-spin" : ""} />
              {overrideBusy ? "Applying…" : "Apply Seat Override"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
