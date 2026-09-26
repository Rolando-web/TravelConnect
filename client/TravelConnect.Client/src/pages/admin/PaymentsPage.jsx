import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Download, Plus, Search, SlidersHorizontal, Inbox, RefreshCcw, Check, ShieldCheck } from "lucide-react";
import { paymentsApi, getPaymentReconciliation, refundPaymentToWallet } from "../../services/api";
import CrudModal from "../../components/admin/CrudModal";
import StatCard from "../../components/admin/StatCard";
import Pagination from "../../components/admin/Pagination";

const statusBadge = {
  Paid: "badge-green",
  Partial: "badge-orange",
  Pending: "badge-orange",
  Refunded: "badge-red",
};

const methodBadge = {
  Card: "badge-cyan",
  PayPal: "badge-purple",
  Bank: "badge-orange",
  GCash: "badge-cyan",
  PayMaya: "badge-purple",
  gcash: "badge-cyan",
  paymaya: "badge-purple",
  Credit: "badge-cyan",
};

const statusFilters = ["All", "Paid", "Partial", "Pending", "Refunded"];

function money(v) {
  return `₱${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "—";
}

function methodLabel(m) {
  if (!m) return "—";
  if (m.toLowerCase() === "paymaya") return "PayMaya";
  if (m.toLowerCase() === "gcash") return "GCash";
  return m;
}

function dateStr(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toISOString().slice(0, 10);
}

export default function PaymentsPage() {
  const { role } = useOutletContext();
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [activeMethod, setActiveMethod] = useState("All");
  const [activeTab, setActiveTab] = useState("transactions");
  const [payments, setPayments] = useState([]);
  const [recon, setRecon] = useState([]);
  const [reconFilter, setReconFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: "add", data: null });
  const [saving, setSaving] = useState(false);
  const [refundingId, setRefundingId] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const classifyRecon = (r) => {
    if (!r.isMatched) {
      if (r.matchStatus === "orphan") return { label: "Unmatched", cls: "badge-red" };
      if (r.matchStatus === "mismatch") return { label: "Amount Mismatch", cls: "badge-orange" };
      if (r.matchStatus === "duplicate") return { label: "Duplicate", cls: "badge-orange" };
    }
    return { label: "Matched", cls: "badge-green" };
  };

  const load = () => {
    paymentsApi
      .list()
      .then((d) => setPayments(Array.isArray(d) ? d : []))
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  };

  const loadRecon = () => {
    getPaymentReconciliation()
      .then((d) => setRecon(Array.isArray(d) ? d : []))
      .catch(() => setRecon([]));
  };

  useEffect(() => {
    load();
    loadRecon();
  }, []);

  const handleRefund = async (p) => {
    if (!window.confirm(`Issue refund to wallet for ${money(p.amount)} (${p.referenceId || p.id})?`)) return;
    setRefundingId(p.id ?? p.referenceId);
    try {
      await refundPaymentToWallet(p.id);
      setLoading(true);
      load();
      loadRecon();
    } catch (err) {
      alert(err.message || "Failed to issue refund");
    } finally {
      setRefundingId(null);
    }
  };

  const openModal = (mode, data = null) => setModal({ open: true, mode, data });

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal.mode === "add") await paymentsApi.create(form);
      else await paymentsApi.update(modal.data.id, { ...form, id: modal.data.id });
      setModal({ open: false, mode: "add", data: null });
      setLoading(true);
      load();
    } catch (err) {
      alert(err.message || "Failed to save payment");
    } finally {
      setSaving(false);
    }
  };

  const modalFields = [
    { key: "referenceId", label: "Reference ID", required: true },
    { key: "bookingId", label: "Booking ID", type: "number", min: 0 },
    { key: "customerName", label: "Customer", required: true },
    { key: "packageName", label: "Package" },
    { key: "amount", label: "Amount (₱)", type: "number", min: 0 },
    { key: "method", label: "Method", type: "select", options: ["GCash", "gcash", "PayMaya", "paymaya", "Card", "PayPal", "Bank"] },
    { key: "status", label: "Status", type: "select", options: ["Paid", "Partial", "Pending", "Refunded"] },
    { key: "paymentDate", label: "Payment Date", type: "date" },
  ];

  const methodFilters = useMemo(
    () => ["All", ...new Set(payments.map((p) => methodLabel(p.method)).filter(Boolean))],
    [payments]
  );

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const matchQuery =
        !query ||
        String(p.referenceId || p.id).toLowerCase().includes(query.toLowerCase()) ||
        (p.customerName || "").toLowerCase().includes(query.toLowerCase()) ||
        (p.packageName || "").toLowerCase().includes(query.toLowerCase());
      const matchStatus = activeStatus === "All" || p.status === activeStatus;
      const matchMethod = activeMethod === "All" || methodLabel(p.method) === activeMethod;
      return matchQuery && matchStatus && matchMethod;
    });
  }, [payments, query, activeStatus, activeMethod]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [query, activeStatus, activeMethod]);

  const totalCollected = payments.filter((p) => p.status === "Paid").reduce((s, p) => s + (p.amount || 0), 0);
  const stats = [
    ["Total Collected", money(totalCollected), `${payments.filter((p) => p.status === "Paid").length} paid transactions`],
    ["Paid", payments.filter((p) => p.status === "Paid").length.toLocaleString(), "Completed payments"],
    ["Pending", payments.filter((p) => (p.status || "").toLowerCase().includes("pending")).length.toLocaleString(), "Awaiting completion"],
    ["Refunded", payments.filter((p) => p.status === "Refunded").length.toLocaleString(), "Returned to customer"],
  ];

  return (
    <>
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; Payments</p>
          <h1 className="text-3xl font-black mt-1 font-serif">Payment Management</h1>
          <p className="text-text-secondary mt-2">Monitor, track, and reconcile payment transactions.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary"><Download size={16} /> Export</button>
          <button onClick={() => openModal("add")} className="btn-primary"><Plus size={17} /> Record Payment</button>
        </div>
      </section>

      <div className="flex items-center gap-1 mb-5 bg-navy-900 border border-navy-700 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("transactions")}
          className={activeTab === "transactions" ? "filter-pill-active" : "filter-pill"}
        >
          <RefreshCcw size={14} /> Transactions
        </button>
        <button
          onClick={() => setActiveTab("reconciliation")}
          className={activeTab === "reconciliation" ? "filter-pill-active" : "filter-pill"}
        >
          <ShieldCheck size={14} /> Reconciliation
          {recon.filter((r) => !r.isMatched).length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-badge-red text-white text-[10px] font-black">
              {recon.filter((r) => !r.isMatched).length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "reconciliation" ? (
        <section className="card overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-navy-700">
            <div>
              <h2 className="text-lg font-black font-serif flex items-center gap-2">
                <ShieldCheck size={16} className="text-cyan-accent" /> Payment Reconciliation
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Cross-references captured payments against confirmed bookings to flag orphan, duplicate, or mismatched transactions.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-medium">FILTER</span>
              {["All", "Matched", "Mismatched", "Orphan", "Duplicate"].map((f) => (
                <button
                  key={f}
                  onClick={() => setReconFilter(f)}
                  className={reconFilter === f ? "filter-pill-active" : "filter-pill"}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-cyan-accent text-navy-900 text-left text-xs uppercase tracking-wider">
                <tr>
                  {["Payment Ref", "Booking Ref", "Customer", "Amount", "Method", "Gateway", "Match Status", "Action"].map((c) => (
                    <th key={c} className="px-5 py-3 font-semibold">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recon.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-14 text-center">
                      <Inbox size={36} className="mx-auto text-text-secondary mb-3" />
                      <p className="text-text-secondary font-semibold">No payments to reconcile</p>
                    </td>
                  </tr>
                ) : (
                  recon
                    .filter((r) => {
                      if (reconFilter === "All") return true;
                      const who = classifyRecon(r);
                      if (reconFilter === "Mismatched") return who.label === "Amount Mismatch";
                      if (reconFilter === "Orphan") return who.label === "Unmatched";
                      return who.label === reconFilter;
                    })
                    .map((r) => {
                      const who = classifyRecon(r);
                      return (
                        <tr key={`${r.paymentId}-${r.bookingId}`} className="table-row">
                          <td className="px-5 py-4 font-mono text-xs font-semibold text-cyan-accent">{r.paymentRef || `#PAY-${r.paymentId}`}</td>
                          <td className="px-5 py-4 font-mono text-xs text-text-secondary">{r.bookingRef || "—"}</td>
                          <td className="px-5 py-4">{r.customerName || "—"}</td>
                          <td className="px-5 py-4 font-semibold text-badge-green">{money(r.amount)}</td>
                          <td className="px-5 py-4"><span className={methodBadge[r.method] || "badge-cyan"}>{methodLabel(r.method)}</span></td>
                          <td className="px-5 py-4 text-xs font-mono text-text-secondary">{r.gatewayRef || r.paymentRef || "—"}</td>
                          <td className="px-5 py-4"><span className={who.cls}>{who.label}</span></td>
                          <td className="px-5 py-4">
                            {r.paymentId && (
                              <button
                                onClick={() => handleRefund({ id: r.paymentId, referenceId: r.paymentRef, amount: r.amount })}
                                className="text-xs text-badge-red hover:underline flex items-center gap-1"
                              >
                                <RefreshCcw size={12} /> Refund
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
      <>
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
              placeholder="Search payments..."
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
            <span className="text-xs text-text-secondary font-medium">METHOD</span>
            {methodFilters.map((m) => (
              <button key={m} onClick={() => setActiveMethod(m)} className={activeMethod === m ? "filter-pill-active" : "filter-pill"}>{m}</button>
            ))}
          </div>
        </div>
      </div>

      <section className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-cyan-accent text-navy-900 text-left text-xs uppercase tracking-wider">
              <tr>
                {["Payment ID", "Customer", "Package", "Amount", "Method", "Status", "Date", "Actions"].map((c) => (
                  <th key={c} className="px-5 py-3 font-semibold">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-text-secondary">Loading data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center">
                    <Inbox size={36} className="mx-auto text-text-secondary mb-3" />
                    <p className="text-text-secondary font-semibold">No payments found</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {query ? "Try a different search." : "No payments have been recorded yet."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((p) => (
                  <tr key={p.id ?? p.referenceId} className="table-row">
                    <td className="px-5 py-4 font-mono text-xs text-badge-green font-semibold">{p.referenceId || `#PAY-${p.id}`}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cyan-accent/15 flex items-center justify-center text-cyan-accent text-xs font-bold">{initials(p.customerName)}</div>
                        <span>{p.customerName || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-text-secondary">{p.packageName || "—"}</td>
                    <td className="px-5 py-4 font-semibold text-badge-green">{money(p.amount)}</td>
                    <td className="px-5 py-4"><span className={methodBadge[p.method] || "badge-cyan"}>{methodLabel(p.method)}</span></td>
                    <td className="px-5 py-4"><span className={statusBadge[p.status] || "badge-orange"}>{p.status || "—"}</span></td>
                    <td className="px-5 py-4 text-text-secondary font-mono text-xs">{dateStr(p.paymentDate || p.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openModal("view", p)} className="text-xs text-cyan-accent hover:underline">View</button>
                        <button onClick={() => openModal("edit", p)} className="text-xs text-text-secondary hover:text-badge-orange transition">Edit</button>
                        {p.status === "Paid" && (
                          <button
                            onClick={() => handleRefund(p)}
                            disabled={refundingId !== null}
                            className="text-xs text-badge-red hover:underline flex items-center gap-1 disabled:opacity-50"
                          >
                            {refundingId === (p.id ?? p.referenceId) ? <><Check size={12} /> Processing…</> : <><RefreshCcw size={12} /> Refund</>}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onPage={setPage}
        />
      </section>
      </>
      )}

      <CrudModal
        open={modal.open}
        onClose={() => setModal({ open: false, mode: "add", data: null })}
        title={modal.mode === "add" ? "Record Payment" : modal.mode === "edit" ? "Edit Payment" : "Payment Details"}
        mode={modal.mode}
        fields={modalFields}
        data={modal.data || {}}
        onSave={handleSave}
        saving={saving}
      />
    </>
  );
}
