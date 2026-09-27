import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { cancellationReviewApi } from "../../services/api";
import { money, tierPresentation } from "../../data/cancellationReasons";
import CrudModal from "../../components/admin/CrudModal";
import StatCard from "../../components/admin/StatCard";
import Pagination from "../../components/admin/Pagination";
import { SectionCard } from "../../components/admin/SettingsPrimitives";

const PAGE_SIZE = 10;

// The queue is a filter over the cancellation record's own status, so the tabs
// can only offer statuses the server actually writes.
const VIEWS = [
  { value: "pending", label: "Awaiting review" },
  { value: "Cancellation Approved", label: "Approved" },
  { value: "Cancellation Rejected", label: "Rejected" },
  { value: "Refund Pending", label: "Refund pending" },
  { value: "Refunded", label: "Refunded" },
];

const REASON_LABELS = {
  "change-of-plans": "Change of plans",
  emergency: "Family or personal emergency",
  illness: "Illness or medical",
  weather: "Weather or flight disruption",
  "double-booked": "Booked by mistake",
  "better-price": "Found a better price",
  other: "Other",
  unspecified: "Not specified",
};

const APPROVE_FIELDS = [
  { key: "notes", label: "Internal note", type: "textarea", rows: 2, placeholder: "Why this was approved" },
  {
    key: "resolution",
    label: "Refund resolution",
    type: "select",
    options: [
      { value: "", label: "Keep the quoted resolution" },
      { value: "cash", label: "Cash to original payment method" },
      { value: "travel-credit", label: "Travel credit" },
      { value: "none", label: "No refund" },
    ],
  },
  { key: "refundAmount", label: "Corrected amount (₱, blank = keep quoted)", type: "number", min: 0, step: 0.01 },
];

const REJECT_FIELDS = [
  {
    key: "reason",
    label: "Reason shown to the customer",
    type: "textarea",
    rows: 3,
    required: true,
    placeholder: "This is the explanation the customer receives",
  },
];

function statusBadgeClass(status) {
  if (status === "Cancellation Approved") return "badge-green";
  if (status === "Cancellation Rejected") return "badge-red";
  if (status === "Cancellation Requested") return "badge-orange";
  return "badge-cyan";
}

function when(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

export default function CancellationQueuePage() {
  const { role } = useOutletContext();
  const [view, setView] = useState("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState({ open: false, mode: "approve", id: null, data: null });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ status: view, page: String(page), pageSize: String(PAGE_SIZE) });
      if (search.trim()) query.set("search", search.trim());
      const result = await cancellationReviewApi.list(`?${query.toString()}`);
      setData(result);
      setError("");
    } catch (err) {
      setData(null);
      setError(err?.message || "Failed to load cancellation requests");
    } finally {
      setLoading(false);
    }
  }, [view, page, search]);

  useEffect(() => {
    load();
  }, [load]);

  // A fresh notice must never outlive the view that produced it.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.pageSize || PAGE_SIZE)));
  const canApprove = Boolean(data?.canApprove);
  const canOverrideAmount = Boolean(data?.canOverrideAmount);

  const moneyAwaiting = useMemo(
    () => items.filter((c) => c.status === "Cancellation Requested").reduce((sum, c) => sum + Number(c.refundAmount || 0), 0),
    [items]
  );

  const openDetail = async (id) => {
    try {
      setSelected(await cancellationReviewApi.get(id));
    } catch (err) {
      setNotice(err?.message || "Could not load that request");
    }
  };

  const submitDecision = async (id, mode, form) => {
    if (!id) {
      setNotice("Open a request first.");
      return;
    }

    const payload = mode === "approve"
      ? {
          notes: form.notes || undefined,
          resolution: form.resolution || undefined,
          refundAmount: form.refundAmount === "" || form.refundAmount === undefined ? undefined : Number(form.refundAmount),
        }
      : { reason: form.reason };

    setSaving(true);
    try {
      const result = mode === "approve"
        ? await cancellationReviewApi.approve(id, payload)
        : await cancellationReviewApi.reject(id, payload);
      setModal({ open: false, mode, id: null, data: null });
      setSelected(null);
      setNotice(result.message);
      load();
    } catch (err) {
      setNotice(err?.message || "The decision could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const openDecision = (id, mode) =>
    setModal({
      open: true,
      mode,
      id,
      data: mode === "approve" ? { notes: "", resolution: "", refundAmount: "" } : { reason: "" },
    });

  return (
    <div>
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; Cancellation Queue</p>
          <h1 className="text-3xl font-black mt-1 font-serif">Cancellation Requests</h1>
          <p className="text-text-secondary mt-2">
            Every amount here was calculated and frozen when the customer asked. Approving pays that
            exact figure; changing it is recorded as an exception.
          </p>
        </div>
        {!canApprove && data && (
          <span className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-badge-orange/15 text-badge-orange">
            <ShieldAlert size={14} /> Read-only access
          </span>
        )}
      </section>

      {notice && (
        <div className="mb-6 rounded-xl border border-badge-cyan/30 bg-badge-cyan/10 px-4 py-3 text-sm text-badge-cyan flex items-center gap-2">
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-badge-red/30 bg-badge-red/10 px-4 py-3 text-sm text-badge-red flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard label="In this view" value={loading ? "—" : String(total)} note={VIEWS.find((v) => v.value === view)?.label} />
        <StatCard label="On this page" value={loading ? "—" : String(items.length)} note={`Oldest first · page ${page}`} />
        <StatCard label="Awaiting review" value={money(moneyAwaiting)} note="Refund value on this page" />
        <StatCard
          label="Your permissions"
          value={canApprove ? "Can decide" : "View only"}
          note={canOverrideAmount ? "May correct an amount" : "Amounts are frozen for you"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {VIEWS.map((v) => (
          <button
            key={v.value}
            onClick={() => { setView(v.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              view === v.value ? "bg-cyan-accent text-navy-900" : "bg-navy-800 text-text-secondary hover:text-text-primary"
            }`}
          >
            {v.label}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-auto">
          <Search size={14} className="text-text-secondary" />
          <input
            className="input-field w-56"
            placeholder="Reference, name or email"
            aria-label="Search cancellation requests"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-navy-700 overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-text-secondary">Loading requests...</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-text-secondary flex items-center gap-2">
            <Inbox size={16} /> Nothing in this view.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-text-secondary">
              <tr>
                <th className="px-5 py-3">Request</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Reason</th>
                <th className="px-5 py-3 text-right">Refund</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-navy-700">
                  <td className="px-5 py-3">
                    <p className="font-mono text-xs">{c.reference}</p>
                    <p className="text-[11px] text-text-secondary">
                      {tierPresentation(c.policyTier).label} · {c.refundPercentage}%
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <p>{c.customerName}</p>
                    <p className="text-[11px] text-text-secondary">{c.customerEmail}</p>
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {REASON_LABELS[c.reasonCode] || c.reasonCode}
                    {c.reason && <p className="text-[11px] text-text-secondary">{c.reason}</p>}
                  </td>
                  <td className="px-5 py-3 text-right font-mono">
                    {money(c.refundAmount)}
                    {c.isException && <p className="text-[11px] text-badge-orange">Adjusted</p>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`badge ${statusBadgeClass(c.status)}`}>{c.status}</span>
                    <p className="text-[11px] text-text-secondary mt-1">
                      <Clock size={10} className="inline" /> {when(c.requestedAt)}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openDetail(c.id)} className="text-xs font-semibold text-cyan-accent hover:underline">
                      Review
                    </button>
                    {canApprove && c.status === "Cancellation Requested" && (
                      <button
                        onClick={() => openDecision(c.id, "approve")}
                        className="ml-3 text-xs font-semibold text-badge-green hover:underline"
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={data?.pageSize || PAGE_SIZE} onPage={setPage} />
      </div>

      {/* ─── Detail ─────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-navy-700 bg-navy-900 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs text-text-secondary">{selected.cancellation.reference}</p>
                <h2 className="text-xl font-black text-text-primary">{selected.cancellation.customerName}</h2>
                <p className="text-xs text-text-secondary">{selected.cancellation.customerEmail}</p>
              </div>
              <span className={`badge ${statusBadgeClass(selected.cancellation.status)}`}>
                {selected.cancellation.status}
              </span>
            </div>

            <SectionCard icon={Clock} title="What the customer was quoted" subtitle="Frozen at request time">
              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-text-secondary text-xs">Reason</dt>
                  <dd>{REASON_LABELS[selected.cancellation.reasonCode] || selected.cancellation.reasonCode}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary text-xs">Requested</dt>
                  <dd>{when(selected.cancellation.requestedAt)}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary text-xs">Policy</dt>
                  <dd>{selected.cancellation.policyName} · {tierPresentation(selected.cancellation.policyTier).label}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary text-xs">Hours before departure</dt>
                  <dd>{selected.cancellation.hoursBeforeDeparture}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary text-xs">Fare type</dt>
                  <dd>{selected.cancellation.fareType || "—"}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary text-xs">Resolution</dt>
                  <dd>{selected.cancellation.resolution}</dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard icon={CheckCircle2} title="Money" subtitle="Only a manager may change the amount">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ["Amount originally paid", selected.cancellation.originalAmount],
                    ["Fees deducted", -Number(selected.cancellation.totalFees || 0)],
                    ["Refund to customer", selected.cancellation.refundAmount],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b border-navy-700 last:border-0">
                      <td className="py-2 text-text-secondary">{label}</td>
                      <td className="py-2 text-right font-mono">
                        {typeof value === "number" && value < 0 ? `- ${money(Math.abs(value))}` : money(value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selected.cancellation.isException && (
                <p className="mt-3 text-xs text-badge-orange">This amount was adjusted by staff.</p>
              )}
              {selected.notes && <p className="mt-3 text-xs text-text-secondary whitespace-pre-line">Note: {selected.notes}</p>}
              {selected.rejectionReason && (
                <p className="mt-3 text-xs text-badge-red">Rejected: {selected.rejectionReason}</p>
              )}
            </SectionCard>

            {selected.refunds?.length > 0 && (
              <SectionCard icon={CheckCircle2} title="Refunds raised" subtitle="Paid out by finance">
                <ul className="text-sm space-y-1">
                  {selected.refunds.map((r) => (
                    <li key={r.id} className="flex items-center justify-between">
                      <span className="font-mono text-xs">{r.reference}</span>
                      <span className="font-mono">{money(r.amount)} · {r.status} · {r.method}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            <div className="flex items-center gap-3">
              <button onClick={() => setSelected(null)} className="btn-secondary flex-1">Close</button>
              {selected.canApprove && selected.cancellation.status === "Cancellation Requested" && (
                <>
                  <button
                    onClick={() => openDecision(selected.cancellation.id, "reject")}
                    className="btn-secondary flex items-center justify-center gap-1.5 text-badge-red"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                  <button
                    onClick={() => openDecision(selected.cancellation.id, "approve")}
                    className="btn-primary flex-1 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={14} /> Approve refund
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <CrudModal
        open={modal.open}
        onClose={() => setModal({ open: false, mode: modal.mode, id: null, data: null })}
        title={modal.mode === "approve" ? "Approve cancellation" : "Reject cancellation"}
        mode="edit"
        fields={modal.mode === "approve" ? APPROVE_FIELDS : REJECT_FIELDS}
        data={modal.data}
        onSave={(form) => submitDecision(modal.id, modal.mode, form)}
        saving={saving}
      />
    </div>
  );
}
