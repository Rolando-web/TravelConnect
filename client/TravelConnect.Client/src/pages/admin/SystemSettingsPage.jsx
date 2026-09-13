import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Building2,
  CreditCard,
  CalendarClock,
  Bell,
  RotateCcw,
  Save,
  ShieldAlert,
} from "lucide-react";

const SETTINGS_KEY = "tc_system_settings";

const DEFAULT_SETTINGS = {
  agencyName: "TravelConnect",
  supportEmail: "support@travelconnect.ph",
  supportPhone: "+63 917 000 0000",
  currency: "PHP (₱)",
  enableGcash: true,
  enablePaymaya: true,
  enableCard: true,
  cancellationWindowHours: 48,
  defaultLuggageProtection: true,
  emailConfirmations: true,
  inquiryAlerts: true,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-cyan-accent" : "bg-navy-600"
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-cyan-accent/15 flex items-center justify-center text-cyan-accent">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="text-sm text-text-secondary">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block text-xs text-text-secondary">
      {label}
      <div className="mt-2">{children}</div>
      {hint && <span className="mt-1 block text-[11px] text-text-secondary/80">{hint}</span>}
    </label>
  );
}

export default function SystemSettingsPage() {
  const { role, access } = useOutletContext();
  const [settings, setSettings] = useState(loadSettings);
  const [saved, setSaved] = useState(false);

  const canManage = access?.settings === "Manage";

  const set = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    localStorage.removeItem(SETTINGS_KEY);
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <div>
      {/* Header */}
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; Settings</p>
          <h1 className="text-3xl font-black mt-1 font-serif">System Settings</h1>
          <p className="text-text-secondary mt-2">
            Configure platform-wide preferences for TravelConnect.
          </p>
        </div>
        {!canManage && (
          <span className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-badge-orange/15 text-badge-orange">
            <ShieldAlert size={14} /> Read-only access
          </span>
        )}
      </section>

      {saved && (
        <div className="mb-6 rounded-xl border border-badge-green/30 bg-badge-green/10 px-4 py-3 text-sm text-badge-green">
          System settings saved successfully.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* General */}
        <Section icon={Building2} title="General" subtitle="Brand and contact information">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Agency Name">
              <input
                className="input-field"
                value={settings.agencyName}
                onChange={(e) => set("agencyName", e.target.value)}
                disabled={!canManage}
              />
            </Field>
            <Field label="Default Currency">
              <select
                className="input-field"
                value={settings.currency}
                onChange={(e) => set("currency", e.target.value)}
                disabled={!canManage}
              >
                <option>PHP (₱)</option>
                <option>USD ($)</option>
              </select>
            </Field>
            <Field label="Support Email">
              <input
                className="input-field"
                value={settings.supportEmail}
                onChange={(e) => set("supportEmail", e.target.value)}
                disabled={!canManage}
              />
            </Field>
            <Field label="Support Phone">
              <input
                className="input-field"
                value={settings.supportPhone}
                onChange={(e) => set("supportPhone", e.target.value)}
                disabled={!canManage}
              />
            </Field>
          </div>
        </Section>

        {/* Payments */}
        <Section
          icon={CreditCard}
          title="Payment Methods"
          subtitle="Which payment options customers can use"
        >
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              ["GCash / E-wallet", "enableGcash"],
              ["PayMaya / Maya", "enablePaymaya"],
              ["Credit / Debit Card", "enableCard"],
            ].map(([label, key]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-xl bg-navy-900/70 border border-navy-700 px-4 py-3"
              >
                <span className="text-sm text-text-primary">{label}</span>
                <Toggle
                  checked={settings[key]}
                  disabled={!canManage}
                  onChange={(v) => set(key, v)}
                />
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-text-secondary">
            Payments are processed through PayMongo. Toggling a method here updates platform-wide availability.
          </p>
        </Section>

        {/* Bookings */}
        <Section
          icon={CalendarClock}
          title="Booking Policies"
          subtitle="Defaults applied to new bookings"
        >
          <div className="grid sm:grid-cols-2 gap-4 items-start">
            <Field label="Cancellation Window (hours)" hint="Minimum notice before a booking's start date. Refund eligibility is determined by this window.">
              <input
                type="number"
                min="0"
                step="1"
                className="input-field"
                value={settings.cancellationWindowHours}
                onChange={(e) => set("cancellationWindowHours", Number(e.target.value))}
                disabled={!canManage}
              />
            </Field>
            <div className="flex items-center justify-between rounded-xl bg-navy-900/70 border border-navy-700 px-4 py-3 mt-6">
              <span className="text-sm text-text-primary">Luggage Protection default</span>
              <Toggle
                checked={settings.defaultLuggageProtection}
                disabled={!canManage}
                onChange={(v) => set("defaultLuggageProtection", v)}
              />
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section
          icon={Bell}
          title="Notifications"
          subtitle="Automatic emails and alerts"
        >
          <div className="space-y-3">
            {[
              ["Send booking confirmation emails", "emailConfirmations"],
              ["Email admins when a new inquiry arrives", "inquiryAlerts"],
            ].map(([label, key]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-xl bg-navy-900/70 border border-navy-700 px-4 py-3"
              >
                <span className="text-sm text-text-primary">{label}</span>
                <Toggle
                  checked={settings[key]}
                  disabled={!canManage}
                  onChange={(v) => set(key, v)}
                />
              </div>
            ))}
          </div>
        </Section>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
          {canManage && (
            <>
              <button type="button" onClick={handleReset} className="btn-secondary">
                <RotateCcw size={16} /> Reset Defaults
              </button>
              <button type="submit" className="btn-primary">
                <Save size={16} /> Save Settings
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}