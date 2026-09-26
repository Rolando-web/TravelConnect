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
  CheckCircle2,
  Sliders,
} from "lucide-react";
import { sanitizePhMobile, formatPhMobileFull } from "../../utils/phone";

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

const TABS = [
  { id: "general", label: "General", desc: "Brand & contact details", icon: Building2 },
  { id: "payments", label: "Payment Methods", desc: "Gateway & payment options", icon: CreditCard },
  { id: "policies", label: "Booking Policies", desc: "Cancellations & defaults", icon: CalendarClock },
  { id: "notifications", label: "Notifications", desc: "Alerts & email triggers", icon: Bell },
];

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function Toggle({ checked, onChange, disabled, id, ariaLabel }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-label={ariaLabel}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-accent/50 disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? "bg-cyan-accent" : "bg-navy-700 hover:bg-navy-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SectionCard({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-navy-700">
        <div className="w-10 h-10 rounded-xl bg-cyan-accent/15 flex items-center justify-center text-cyan-accent shrink-0">
          <Icon size={19} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <p className="text-xs text-text-secondary">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block text-xs font-semibold text-text-secondary">
      {label}
      <div className="mt-2 font-normal">{children}</div>
      {hint && <span className="mt-1.5 block text-[11px] font-normal text-text-secondary/80 leading-relaxed">{hint}</span>}
    </label>
  );
}

export default function SystemSettingsPage() {
  const { role, access } = useOutletContext();
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState(loadSettings);
  const [saved, setSaved] = useState(false);

  const canManage = access?.settings === "Manage";

  const set = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (!window.confirm("Reset all settings to default values?")) return;
    localStorage.removeItem(SETTINGS_KEY);
    setSettings(DEFAULT_SETTINGS);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      {/* Header */}
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; Settings</p>
          <h1 className="text-3xl font-black mt-1 font-serif">System Settings</h1>
          <p className="text-text-secondary mt-2">
            Configure platform-wide preferences and business rules for TravelConnect.
          </p>
        </div>
        {!canManage && (
          <span className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-badge-orange/15 text-badge-orange">
            <ShieldAlert size={14} /> Read-only access
          </span>
        )}
      </section>

      {/* Success Alert */}
      {saved && (
        <div className="mb-6 rounded-xl border border-badge-green/30 bg-badge-green/10 px-4 py-3 text-sm text-badge-green flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>System settings updated and saved successfully.</span>
        </div>
      )}

      {/* Layout: Mini-Sidebar Tabs + Active Panel */}
      <form onSubmit={handleSave} className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Mini Sidebar Sub-Tabs */}
        <aside className="w-full lg:w-72 shrink-0 card p-3 space-y-1.5">
          <div className="px-3 py-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
            <Sliders size={14} className="text-cyan-accent" />
            <span>Settings Menu</span>
          </div>

          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition cursor-pointer ${
                  active
                    ? "bg-cyan-accent text-navy-900 font-bold shadow-md shadow-cyan-accent/20"
                    : "text-text-secondary hover:text-white hover:bg-navy-700/60"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${
                    active
                      ? "bg-navy-900/20 text-navy-900"
                      : "bg-cyan-accent/10 text-cyan-accent"
                  }`}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate leading-tight">{t.label}</p>
                  <p
                    className={`text-xs truncate mt-0.5 ${
                      active ? "text-navy-900/80 font-medium" : "text-text-secondary/80"
                    }`}
                  >
                    {t.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Tab Content Panel */}
        <div className="flex-1 w-full space-y-5">
          {/* General Tab */}
          {activeTab === "general" && (
            <SectionCard
              icon={Building2}
              title="General Information"
              subtitle="Brand identity and public contact channels"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Agency Name">
                  <input
                    className="input-field"
                    value={settings.agencyName}
                    onChange={(e) => set("agencyName", e.target.value)}
                    disabled={!canManage}
                    placeholder="e.g. TravelConnect"
                  />
                </Field>
                <Field label="Default Currency">
                  <select
                    className="input-field cursor-pointer"
                    value={settings.currency}
                    onChange={(e) => set("currency", e.target.value)}
                    disabled={!canManage}
                  >
                    <option>PHP (₱)</option>
                    <option>USD ($)</option>
                  </select>
                </Field>
                <Field label="Support Email" hint="Customers receive confirmations and support replies from this address.">
                  <input
                    type="email"
                    className="input-field"
                    value={settings.supportEmail}
                    onChange={(e) => set("supportEmail", e.target.value)}
                    disabled={!canManage}
                    placeholder="support@agency.com"
                  />
                </Field>
                <Field label="Support Phone" hint="Included in voucher PDFs and customer itinerary headers.">
                  <input
                    type="tel"
                    inputMode="tel"
                    maxLength={16}
                    className="input-field"
                    value={settings.supportPhone}
                    onChange={(e) => set("supportPhone", formatPhMobileFull(sanitizePhMobile(e.target.value)))}
                    disabled={!canManage}
                    placeholder="+63 9XX-XXX-XXXX"
                  />
                </Field>
              </div>
            </SectionCard>
          )}

          {/* Payments Tab */}
          {activeTab === "payments" && (
            <SectionCard
              icon={CreditCard}
              title="Payment Methods"
              subtitle="Enable or disable checkout payment channels for customers"
            >
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: "GCash / E-wallet", key: "enableGcash", desc: "Direct PayMongo GCash QR & checkout" },
                  { label: "PayMaya / Maya", key: "enablePaymaya", desc: "Maya wallet & checkout integration" },
                  { label: "Credit / Debit Card", key: "enableCard", desc: "Visa, Mastercard & JCB processing" },
                ].map(({ label, key, desc }) => (
                  <div
                    key={key}
                    className="flex flex-col justify-between rounded-xl bg-navy-900/80 border border-navy-700 p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-text-primary">{label}</span>
                      <Toggle
                        checked={Boolean(settings[key])}
                        disabled={!canManage}
                        ariaLabel={label}
                        onChange={(v) => set(key, v)}
                      />
                    </div>
                    <p className="text-xs text-text-secondary">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl bg-navy-900/40 border border-navy-700/60 p-4 text-xs text-text-secondary flex items-start gap-3">
                <CreditCard size={18} className="text-cyan-accent shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-text-primary">PayMongo Gateway Integration</p>
                  <p className="mt-1 leading-relaxed">
                    Toggling methods here immediately updates payment availability across customer checkouts. Live payments require configured PayMongo secret keys in your server environment.
                  </p>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Booking Policies Tab */}
          {activeTab === "policies" && (
            <SectionCard
              icon={CalendarClock}
              title="Booking Policies"
              subtitle="Default cancellation rules and package add-on protections"
            >
              <div className="grid sm:grid-cols-2 gap-5 items-start">
                <Field
                  label="Cancellation Window (hours)"
                  hint="Minimum notice required prior to travel date. Bookings cancelled outside this window qualify for refund processing."
                >
                  <input
                    type="number"
                    min="0"
                    max="8760"
                    step="1"
                    className="input-field"
                    value={settings.cancellationWindowHours}
                    onChange={(e) => set("cancellationWindowHours", Math.min(8760, Math.max(0, Number(e.target.value) || 0)))}
                    disabled={!canManage}
                  />
                </Field>

                <div className="rounded-xl bg-navy-900/80 border border-navy-700 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-sm font-bold text-text-primary">
                      Default Luggage Protection
                    </span>
                    <Toggle
                      checked={Boolean(settings.defaultLuggageProtection)}
                      disabled={!canManage}
                      ariaLabel="Default Luggage Protection"
                      onChange={(v) => set("defaultLuggageProtection", v)}
                    />
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    Automatically opt new packages into complimentary standard baggage insurance.
                  </p>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <SectionCard
              icon={Bell}
              title="Automated Notifications"
              subtitle="Trigger platform emails and operational alerts"
            >
              <div className="space-y-3">
                {[
                  {
                    label: "Customer Booking Confirmations",
                    key: "emailConfirmations",
                    desc: "Automatically send itinerary vouchers and payment receipts to customers upon successful booking.",
                  },
                  {
                    label: "Admin Inquiry Alerts",
                    key: "inquiryAlerts",
                    desc: "Notify staff inbox whenever a user submits a support ticket or quote inquiry.",
                  },
                ].map(({ label, key, desc }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-4 rounded-xl bg-navy-900/80 border border-navy-700 p-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text-primary">{label}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{desc}</p>
                    </div>
                    <Toggle
                      checked={Boolean(settings[key])}
                      disabled={!canManage}
                      ariaLabel={label}
                      onChange={(v) => set(key, v)}
                    />
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Bottom Action Bar */}
          <div className="card flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-xs text-text-secondary">
              {canManage
                ? "Changes are saved locally and applied to active operations."
                : "You have view-only access to platform settings."}
            </p>
            {canManage && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-secondary !px-3.5 !py-2 text-xs"
                >
                  <RotateCcw size={15} /> Reset Defaults
                </button>
                <button
                  type="submit"
                  className="btn-primary !px-4 !py-2 text-xs"
                >
                  <Save size={15} /> Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}