import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  Inbox,
  RotateCcw,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { refundsApi } from "../../services/api";
import { money } from "../../data/cancellationReasons";
import CrudModal from "../../components/admin/CrudModal";
import StatCard from "../../components/admin/StatCard";
import Pagination from "../../components/admin/Pagination";
import { SectionCard } from "../../components/admin/SettingsPrimitives";

const PAGE_SIZE = 10;

// Every tab is a status the refund CHECK constraint actually allows, so the
// console can never ask for a state the database would reject.
const VIEWS = [
  { value: "open", label: "To settle" },
  { value: "Pending", label: "Awaiting release" },
  { value: "Approved", label: "Released" },
  { value: "Processing", label: "Processing" },
  { value: "Failed", label: "Failed" },
  { value: "Completed", label: "Completed" },
];

const FIELD_SETS = {
  release: [
    { key: "notes", label: "Release note", type: "textarea", rows: 2, placeholder: "Batch, approver or anything finance should know" },
  ],
  process: [
    { key: "refundReference", label: "Provider or remittance reference", type: "text", placeholder: "e.g. TRACE-77123" },
    { key: "notes", label: "Note", type: "textarea", rows: 2 },
  ],
  complete: [
    { key: "refundReference", label: "Provider or remittance reference", type: "text", placeholder: "Required for a cash payout" },
    { key: "notes", label: "Note", type: "textarea", rows: 2 },
  ],
  fail: [
    { key: "reason", label: "Why the payout failed", type: "textarea", rows: 2, required: true, placeholder: "e.g. GCash account is closed" },
    { key: "notes", label: "Note", type: "textarea", rows: 2 },
  ],
  retry: [
    { key: "notes", label: "Retry note", type: "textarea", rows: 2, placeholder: "What changed since the failure" },
  ],
};

const TITLES = {
  release: "Release refund for payout",
  process: "Start the payout",
  complete: "Mark the refund paid out",
  fail: "Report a failed payout",
  retry: "Retry the payout",
};

const CALLS = {
  release: (id, body) => refundsApi.release(id, body),
  process: (id, body) => refundsApi.process(id, body),
  complete: (id, body) => refundsApi.complete(id, body),
  fail: (id, body) => refundsApi.fail(id, body),
  retry: (id, body) => refundsApi.retry(id, body),
};

function statusBadgeClass(status) {
  if (status === "Completed") return "badge-green";
  if (status === "Failed") return "badge-red";
  if (status === "Processing") return "badge-cyan";
  if (status === "Approved") return "badge-orange";
  return "badge-orange";
}

function when(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

export default function RefundQueuePage() {
  const { role } = useOutletContext();
  const [view, setView] = useState("open");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState({ open: false, action: "release", id: null, data: null });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ status: view, page: String(page), pageSize: String(PAGE_SIZE) });
      if (search.trim()) query.set("search", search.trim());
      const result = await refundsApi.list(`?${query.toString()}`);
      setData(result);
      setError("");
    } catch (err) {
      setData(null);
      setError(err?.message || "Failed to load refunds");
    } finally {
      setLoading(false);
    }
  }, [view, page, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.pageSize || PAGE_SIZE)));
  const canProcess = Boolean(data?.canProcess);

  // Only money finance still owes counts as outstanding; a failed or completed
  // refund is either being chased or already settled.
  const outstanding = useMemo(
    () => items.filter((r) => r.status === "Pending" || r.status === "Approved" || r.status === "Processing")
      .reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [items]
  );
  const failed = useMemo(
    () => items.filter((r) => r.status === "Failed").reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [items]
  );

  const openDetail = async (id) => {
    try {
      setSelected(await refundsApi.get(id));
    } catch (err) {
      setNotice(err?.message || "Could not load that refund");
    }
  };

  const openAction = (id, action, seed = {}) =>
    setModal({
      open: true,
      action,
      id,
      data: action === "process" || action === "complete"
        ? { refundReference: seed.refundReference || "", notes: "" }
        : { reason: "", notes: "" },
    });

  const runAction = async (id, action, form) => {
    if (!id) {
      setNotice("Open a refund first.");
      return;
    }

    // Only send what the finance user actually typed, so the server keeps its own
    // recorded reference when a field is left blank.
    const payload = { notes: form.notes || undefined };
    if (form.refundReference?.trim()) payload.refundReference = form.refundReference.trim();
    if (form.reason?.trim()) payload.reason = form.reason.trim();

    setSaving(true);
    try {
      const result = await CALLS[action](id, payload);
      setModal({ open: false, action, id: null, data: null });
      setSelected(null);
      setNotice(result.message);
      load();
    } catch (err) {
      setNotice(err?.message || "That payout step could not be saved");
    } finally {
      setSaving(false);
    }
  };

  // The buttons are derived from the transitions the server says are legal for
  // this refund, so the console can never offer a step the database would reject.
  const actionsFor = (refund) => {
    const allowed = refund.allowedTransitions ?? [];
    const failedBefore = refund.status === "Failed";
    const steps = [];

    if (failedBefore && allowed.includes("Processing")) {
      steps.push({ action: "retry", label: "Retry payout", style: "btn-primary" });
    }
    if (allowed.includes("Approved")) {
      steps.push({ action: "release", label: "Release", style: "btn-primary" });
    }
    if (!failedBefore && allowed.includes("Processing")) {
      steps.push({ action: "process", label: "Start payout", style: "btn-primary" });
    }
    if (allowed.includes("Completed")) {
      steps.push({ action: "complete", label: "Complete", style: "btn-primary" });
    }
    if (allowed.includes("Failed")) {
      steps.push({ action: "fail", label: "Report failure", style: "btn-secondary" });
    }

    return steps;
  };

  return (
    <div>
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; Refunds</p>
          <h1 className="text-3xl font-black mt-1 font-serif">Refund Payouts</h1>
          <p className="text-text-secondary mt-2">
            Approved cancellations sit here until finance moves the money. A cash payout needs the
            provider reference, and every step is written to the refund&apos;s own audit trail.
          </p>
        </div>
        {!canProcess && data && (
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
        <StatCard label="Still owed" value={loading ? "—" : money(outstanding)} note="On this page" />
        <StatCard label="Failed attempts" value={loading ? "—" : money(failed)} note="Needs a retry" />
        <StatCard
          label="Your permissions"
          value={canProcess ? "Can pay out" : "View only"}
          note={canProcess ? "Release, process, settle" : "Finance handles the payout"}
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
            placeholder="Refund, customer or booking"
            aria-label="Search refunds"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-navy-700 overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-text-secondary">Loading refunds...</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-text-secondary flex items-center gap-2">
            <Inbox size={16} /> Nothing in this view.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-text-secondary">
              <tr>
                <th className="px-5 py-3">Refund</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t border-navy-700">
                  <td className="px-5 py-3">
                    <p className="font-mono text-xs">{r.reference}</p>
                    <p className="text-[11px] text-text-secondary">Booking {r.bookingReference}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p>{r.customerName}</p>
                    <p className="text-[11px] text-text-secondary">{r.customerEmail}</p>
                  </td>
                  <td className="px-5 py-3 text-xs uppercase">{r.method}</td>
                  <td className="px-5 py-3 text-right font-mono">
                    {money(r.amount)}
                    {r.isAdjusted && <p className="text-[11px] text-badge-orange">Adjusted</p>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`badge ${statusBadgeClass(r.status)}`}>{r.status}</span>
                    {r.failureReason && <p className="text-[11px] text-badge-red mt-1">{r.failureReason}</p>}
                    <p className="text-[11px] text-text-secondary mt-1">
                      <Clock size={10} className="inline" /> {when(r.createdAt)}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openDetail(r.id)} className="text-xs font-semibold text-cyan-accent hover:underline">
                      Open
                    </button>
                    {canProcess && actionsFor(r).map((step) => (
                      <button
                        key={step.action}
                        onClick={() => openAction(r.id, step.action, r)}
                        className="ml-3 text-xs font-semibold text-badge-green hover:underline"
                      >
                        {step.label}
                      </button>
                    ))}
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
                <p className="font-mono text-xs text-text-secondary">{selected.refund.reference}</p>
                <h2 className="text-xl font-black text-text-primary">{selected.refund.customerName}</h2>
                <p className="text-xs text-text-secondary">
                  {selected.booking?.referenceNumber} · {selected.refund.method}
                </p>
              </div>
              <span className={`badge ${statusBadgeClass(selected.refund.status)}`}>{selected.refund.status}</span>
            </div>

            <SectionCard icon={Banknote} title="What is owed" subtitle="The figure the customer was quoted">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ["Amount originally paid", selected.refund.originalAmount],
                    ["Fees deducted", -Number(selected.refund.totalDeductions || 0)],
                    ["Payout to customer", selected.refund.amount],
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
              {selected.refund.isAdjusted && (
                <p className="mt-3 text-xs text-badge-orange">A manager adjusted this figure before it was queued.</p>
              )}
            </SectionCard>

            <SectionCard icon={Clock} title="Payout trail" subtitle="Every step finance took">
              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-text-secondary text-xs">Queued</dt>
                  <dd>{when(selected.refund.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary text-xs">Released by</dt>
                  <dd>{selected.refund.approvedBy || "—"}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary text-xs">Processing started</dt>
                  <dd>{when(selected.refund.processedAt)}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary text-xs">Completed</dt>
                  <dd>{when(selected.refund.completedAt)}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary text-xs">Provider reference</dt>
                  <dd className="font-mono text-xs">{selected.refund.refundReference || "—"}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary text-xs">Linked payment</dt>
                  <dd className="font-mono text-xs">{selected.payment?.referenceId || "Not linked yet"}</dd>
                </div>
              </dl>
              {selected.failureReason && (
                <p className="mt-3 text-xs text-badge-red">Last failure: {selected.failureReason}</p>
              )}
              {selected.notes && (
                <p className="mt-3 text-xs text-text-secondary whitespace-pre-line">{selected.notes}</p>
              )}
            </SectionCard>

            <div className="flex items-center gap-3">
              <button onClick={() => setSelected(null)} className="btn-secondary flex-1">Close</button>
              {selected.canProcess && actionsFor(selected.refund).map((step) => (
                <button
                  key={step.action}
                  onClick={() => openAction(selected.refund.id, step.action, selected.refund)}
                  className={`${step.style} flex items-center justify-center gap-1.5`}
                >
                  {step.action === "fail" ? <XCircle size={14} /> : <RotateCcw size={14} />}
                  {step.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <CrudModal
        open={modal.open}
        onClose={() => setModal({ open: false, action: modal.action, id: null, data: null })}
        title={TITLES[modal.action]}
        mode="edit"
        fields={FIELD_SETS[modal.action]}
        data={modal.data}
        onSave={(form) => runAction(modal.id, modal.action, form)}
        saving={saving}
      />
    </div>
  );
}
