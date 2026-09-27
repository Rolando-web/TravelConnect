import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Calculator,
  CheckCircle2,
  Plus,
  RotateCcw,
  Save,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import { cancellationPolicyApi } from "../../services/api";
import { previewRefund } from "../../data/cancellationPolicyPreview";
import CrudModal from "../../components/admin/CrudModal";
import StatCard from "../../components/admin/StatCard";
import { Field, SectionCard, SwitchRow } from "../../components/admin/SettingsPrimitives";

const TIER_LABELS = {
  grace: "Grace period",
  early: "Early cancellation",
  late: "Late cancellation",
  "non-refundable": "Non-refundable fare",
  "no-show": "No-show / departure passed",
};

const RESOLUTIONS = ["Cash", "Travel Credit", "None"];

const APPROVAL_OPTIONS = [
  { value: "", label: "Inherit agency setting" },
  { value: "true", label: "Always require approval" },
  { value: "false", label: "Never require approval" },
];

// The rule form. "requiresApproval" is a tri-state on the server (null = inherit),
// so it is edited as a select and converted on save.
const RULE_FIELDS = [
  { key: "name", label: "Rule Name", required: true },
  { key: "policyTier", label: "Policy Tier", type: "select", required: true, options: Object.entries(TIER_LABELS).map(([value, label]) => ({ value, label })) },
  { key: "airline", label: "Airline", placeholder: "Leave blank to apply to every airline" },
  { key: "fareType", label: "Fare Type", type: "select", options: ["Economy", "Premium Economy", "Business", "First", "Non-Refundable"] },
  { key: "minHoursBeforeDeparture", label: "Min Hours Before Departure", type: "number", min: 0, step: 1 },
  { key: "maxHoursBeforeDeparture", label: "Max Hours Before Departure (0 = no limit)", type: "number", min: 0, step: 1 },
  { key: "refundPercentage", label: "Refund %", type: "number", min: 0, max: 100, step: 1 },
  { key: "airlineFeePercent", label: "Airline Fee %", type: "number", min: 0, max: 100, step: 0.01 },
  { key: "airlineFeeAmount", label: "Airline Fee (₱)", type: "number", min: 0, step: 0.01 },
  { key: "agencyServiceFee", label: "Agency Service Fee (₱)", type: "number", min: 0, step: 0.01 },
  { key: "paymentProcessingFee", label: "Payment Processing Fee (₱)", type: "number", min: 0, step: 0.01 },
  { key: "otherFee", label: "Other Fee (₱)", type: "number", min: 0, step: 0.01 },
  { key: "isNonRefundable", label: "Mark fare as non-refundable", type: "checkbox" },
  { key: "requiresApproval", label: "Approval", type: "select", options: APPROVAL_OPTIONS },
  { key: "resolution", label: "Refund Resolution", type: "select", options: RESOLUTIONS },
  { key: "priority", label: "Priority (higher wins)", type: "number", step: 1 },
  { key: "isActive", label: "Active", type: "checkbox" },
  { key: "notes", label: "Notes", type: "textarea", rows: 2 },
];

const EMPTY_RULE = {
  policyTier: "early",
  minHoursBeforeDeparture: 0,
  maxHoursBeforeDeparture: 0,
  refundPercentage: 100,
  airlineFeePercent: 0,
  airlineFeeAmount: 0,
  agencyServiceFee: 0,
  paymentProcessingFee: 0,
  otherFee: 0,
  isNonRefundable: false,
  requiresApproval: "",
  resolution: "Cash",
  priority: 50,
  isActive: true,
};

// Mirrors the server-side calculation for the admin's "what would this return?"
// preview (see src/data/cancellationPolicyPreview.js). The authoritative number
// is always the one the server stores on the cancellation record.
function money(v) {
  const n = Number(v || 0);
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function windowLabel(rule) {
  if (rule.policyTier === "grace") return "Within grace period";
  if (rule.policyTier === "non-refundable" || rule.policyTier === "no-show") return "Fare / departure based";
  const min = Number(rule.minHoursBeforeDeparture) || 0;
  const max = Number(rule.maxHoursBeforeDeparture) || 0;
  return max > 0 ? `${min}–${max} hrs before departure` : `${min}+ hrs before departure`;
}

function scopeLabel(rule) {
  const parts = [];
  if (rule.airline) parts.push(rule.airline);
  if (rule.fareType) parts.push(rule.fareType);
  return parts.length ? parts.join(" · ") : "All bookings";
}

export default function CancellationPolicyPage() {
  const { role } = useOutletContext();
  const [policy, setPolicy] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ open: false, mode: "add", data: null });
  const [sampleTotal, setSampleTotal] = useState(10000);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cancellationPolicyApi.get();
      setPolicy(data);
      setSettings(data.settings);
      setError("");
    } catch (err) {
      setError(err?.message || "Failed to load the cancellation policy");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canManage = Boolean(policy?.canManage);

  const rules = useMemo(() => policy?.rules ?? [], [policy]);
  const activeRules = useMemo(() => rules.filter((r) => r.isActive), [rules]);

  const set = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 4000);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await cancellationPolicyApi.saveSettings(settings);
      await load();
      flash("Policy settings saved. New cancellations use them immediately.");
    } catch (err) {
      alert(err?.message || "Failed to save policy settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRule = async (form) => {
    // The approval select is a tri-state ("" = inherit) which the server stores
    // as null, so an unset value must not be sent as a boolean.
    const body = {
      ...form,
      requiresApproval:
        form.requiresApproval === "" || form.requiresApproval === undefined || form.requiresApproval === null
          ? null
          : form.requiresApproval === "true" || form.requiresApproval === true,
    };
    setSaving(true);
    try {
      if (modal.mode === "add") await cancellationPolicyApi.createRule(body);
      else await cancellationPolicyApi.updateRule(modal.data.id, body);
      setModal({ open: false, mode: "add", data: null });
      await load();
      flash("Policy rule saved.");
    } catch (err) {
      alert(err?.message || "Failed to save the policy rule");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (rule) => {
    if (!window.confirm(`Deactivate "${rule.name}"? Past cancellations keep the rule they were processed with.`)) return;
    try {
      await cancellationPolicyApi.deactivateRule(rule.id);
      await load();
      flash("Rule deactivated.");
    } catch (err) {
      alert(err?.message || "Failed to deactivate the rule");
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Restore the shipped default policy? Your current rules will be replaced.")) return;
    try {
      await cancellationPolicyApi.reset();
      await load();
      flash("Default policy restored.");
    } catch (err) {
      alert(err?.message || "Failed to restore defaults");
    }
  };

  const openEdit = (rule) => setModal({
    open: true,
    mode: "edit",
    data: { ...rule, requiresApproval: rule.requiresApproval == null ? "" : String(rule.requiresApproval) },
  });

  if (loading) return <p className="text-text-secondary">Loading cancellation policy...</p>;
  if (error) return <p className="text-badge-red">{error}</p>;
  if (!settings) return null;

  return (
    <div>
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; Cancellation Policy</p>
          <h1 className="text-3xl font-black mt-1 font-serif">Cancellation &amp; Refund Policy</h1>
          <p className="text-text-secondary mt-2">
            These numbers decide what a customer gets back. Saving applies to the next cancellation request.
          </p>
        </div>
        {!canManage && (
          <span className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-badge-orange/15 text-badge-orange">
            <ShieldAlert size={14} /> Read-only access
          </span>
        )}
      </section>

      {notice && (
        <div className="mb-6 rounded-xl border border-badge-green/30 bg-badge-green/10 px-4 py-3 text-sm text-badge-green flex items-center gap-2">
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard label="Grace Period" value={`${settings.gracePeriodHours}h`} note="After booking, full refund" />
        <StatCard label="Active Rules" value={String(activeRules.length)} note={`${rules.length} total configured`} />
        <StatCard
          label="Auto-Approved"
          value={settings.autoApproveGracePeriod ? "Yes" : "No"}
          note="Grace-period cancellations"
        />
        <StatCard
          label="Last Updated"
          value={settings.updatedBy || "—"}
          note={settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : "Seeded defaults"}
        />
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-5">
        <SectionCard icon={SlidersHorizontal} title="Agency-Wide Settings" subtitle="Applies to every cancellation unless a rule overrides it">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Grace Period (hours)" hint="A cancellation within this many hours of booking follows the grace rule.">
              <input
                type="number"
                min="0"
                max="8760"
                className="input-field"
                value={settings.gracePeriodHours}
                onChange={(e) => set("gracePeriodHours", Math.max(0, Number(e.target.value) || 0))}
                disabled={!canManage}
              />
            </Field>
            <Field label="Non-Refundable Resolution" hint="What a non-refundable fare receives instead of cash.">
              <select
                className="input-field cursor-pointer"
                value={settings.nonRefundableResolution || "None"}
                onChange={(e) => set("nonRefundableResolution", e.target.value)}
                disabled={!canManage}
              >
                {RESOLUTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Travel Credit Validity (months)">
              <input
                type="number"
                min="0"
                className="input-field"
                value={settings.travelCreditValidityMonths}
                onChange={(e) => set("travelCreditValidityMonths", Math.max(0, Number(e.target.value) || 0))}
                disabled={!canManage}
              />
            </Field>
            <Field label="Maximum Staff Override (%)" hint="Cap on how far staff may adjust a calculated refund.">
              <input
                type="number"
                min="0"
                max="100"
                className="input-field"
                value={settings.maxRefundOverridePercent}
                onChange={(e) => set("maxRefundOverridePercent", Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                disabled={!canManage}
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-5">
            <SwitchRow
              label="Auto-approve grace-period cancellations"
              description="Refunded immediately with no staff review."
              checked={settings.autoApproveGracePeriod}
              onChange={(v) => set("autoApproveGracePeriod", v)}
              disabled={!canManage}
            />
            <SwitchRow
              label="Require approval for late cancellations"
              description="Inside the departure window."
              checked={settings.requireApprovalLateCancellation}
              onChange={(v) => set("requireApprovalLateCancellation", v)}
              disabled={!canManage}
            />
            <SwitchRow
              label="Require approval for no-shows"
              description="Departure date has already passed."
              checked={settings.requireApprovalNoShow}
              onChange={(v) => set("requireApprovalNoShow", v)}
              disabled={!canManage}
            />
            <SwitchRow
              label="Require approval for non-refundable fares"
              checked={settings.requireApprovalNonRefundable}
              onChange={(v) => set("requireApprovalNonRefundable", v)}
              disabled={!canManage}
            />
            <SwitchRow
              label="Allow travel credit"
              description="Offer credit instead of a cash refund when configured."
              checked={settings.allowTravelCredit}
              onChange={(v) => set("allowTravelCredit", v)}
              disabled={!canManage}
            />
            <SwitchRow
              label="Allow staff amount override"
              description="Permits a manual refund adjustment, capped above."
              checked={settings.allowAmountOverride}
              onChange={(v) => set("allowAmountOverride", v)}
              disabled={!canManage}
            />
            <SwitchRow
              label="Require a cancellation reason"
              description="Customers must pick a reason when requesting."
              checked={settings.requireCancellationReason}
              onChange={(v) => set("requireCancellationReason", v)}
              disabled={!canManage}
            />
          </div>

          {canManage && (
            <div className="mt-5 flex justify-end">
              <button type="submit" className="btn-primary !px-4 !py-2 text-xs" disabled={saving}>
                <Save size={15} /> Save Settings
              </button>
            </div>
          )}
        </SectionCard>
      </form>

      <section className="card mt-5 overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-navy-700">
          <div>
            <h2 className="text-lg font-bold text-white">Policy Rules</h2>
            <p className="text-xs text-text-secondary">
              The first matching rule wins: no-show, then non-refundable, then grace, then the departure window.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <button type="button" onClick={handleReset} className="btn-secondary !px-3.5 !py-2 text-xs">
                  <RotateCcw size={15} /> Restore Defaults
                </button>
                <button
                  type="button"
                  onClick={() => setModal({ open: true, mode: "add", data: EMPTY_RULE })}
                  className="btn-primary !px-3.5 !py-2 text-xs"
                >
                  <Plus size={15} /> Add Rule
                </button>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="table-header">
              <tr>
                <th className="px-5 py-3 font-semibold text-text-secondary">RULE</th>
                <th className="px-5 py-3 font-semibold text-text-secondary">APPLIES TO</th>
                <th className="px-5 py-3 font-semibold text-text-secondary">WINDOW</th>
                <th className="px-5 py-3 font-semibold text-text-secondary">REFUND</th>
                <th className="px-5 py-3 font-semibold text-text-secondary">APPROVAL</th>
                <th className="px-5 py-3 font-semibold text-text-secondary">STATUS</th>
                <th className="px-5 py-3 font-semibold text-text-secondary">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-text-secondary">
                    No policy rules configured. Cancellations will need manual approval with no automatic refund.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="table-row">
                    <td className="px-5 py-4">
                      <span className="block font-semibold text-text-primary">{rule.name}</span>
                      <span className="block text-xs text-text-secondary">
                        {TIER_LABELS[rule.policyTier] || rule.policyTier}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-text-secondary">{scopeLabel(rule)}</td>
                    <td className="px-5 py-4 text-text-secondary">{windowLabel(rule)}</td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-text-primary">{rule.refundPercentage}%</span>
                      <span className="block text-xs text-text-secondary">
                        {Number(rule.airlineFeePercent) > 0 ? `${rule.airlineFeePercent}% airline fee` : "no airline fee"}
                        {Number(rule.agencyServiceFee) > 0 ? ` · ${money(rule.agencyServiceFee)} agency` : ""}
                        {Number(rule.paymentProcessingFee) > 0 ? ` · ${money(rule.paymentProcessingFee)} payment` : ""}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-text-secondary">
                      {rule.requiresApproval == null ? "Inherited" : rule.requiresApproval ? "Required" : "Not required"}
                    </td>
                    <td className="px-5 py-4">
                      <span className={rule.isActive ? "badge-green" : "badge-red"}>{rule.isActive ? "Active" : "Inactive"}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {canManage && (
                          <>
                            <button className="text-xs text-cyan-accent hover:underline" onClick={() => openEdit(rule)}>
                              Edit
                            </button>
                            {rule.isActive && (
                              <button
                                className="text-xs text-badge-orange hover:underline"
                                onClick={() => handleDeactivate(rule)}
                              >
                                Deactivate
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <SectionCard icon={Calculator} title="Refund Preview" subtitle="Estimate for a sample booking total — the server recalculates on every request">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <Field label="Sample booking total (₱)">
            <input
              type="number"
              min="0"
              step="100"
              className="input-field !w-40"
              value={sampleTotal}
              onChange={(e) => setSampleTotal(Math.max(0, Number(e.target.value) || 0))}
            />
          </Field>
        </div>
        <ul className="space-y-2">
          {activeRules.length === 0 && (
            <li className="text-sm text-text-secondary">No active rules — every cancellation needs manual review.</li>
          )}
          {activeRules.map((rule) => (
            <li key={rule.id} className="flex items-center justify-between gap-3 rounded-xl bg-navy-900/80 border border-navy-700 px-4 py-3">
              <span className="text-sm text-text-primary">{rule.name}</span>
              <span className="font-bold tabular-nums text-cyan-accent">{money(previewRefund(rule, sampleTotal))}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <CrudModal
        open={modal.open}
        mode={modal.mode}
        title={modal.mode === "add" ? "Add Policy Rule" : "Edit Policy Rule"}
        fields={RULE_FIELDS}
        data={modal.data}
        onClose={() => setModal({ open: false, mode: "add", data: null })}
        onSave={handleSaveRule}
        saving={saving}
      />
    </div>
  );
}
