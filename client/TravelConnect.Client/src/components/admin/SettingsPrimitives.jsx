// Shared form primitives for the admin settings screens (System Settings and
// Cancellation Policy) so both render the same switch / card / field markup
// instead of each page keeping its own copy.

export function Toggle({ checked, onChange, disabled, id, ariaLabel }) {
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

export function SectionCard({ icon: Icon, title, subtitle, children }) {
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

export function Field({ label, hint, children }) {
  return (
    <label className="block text-xs font-semibold text-text-secondary">
      {label}
      <div className="mt-2 font-normal">{children}</div>
      {hint && <span className="mt-1.5 block text-[11px] font-normal text-text-secondary/80 leading-relaxed">{hint}</span>}
    </label>
  );
}

export function SwitchRow({ label, description, checked, onChange, disabled, ariaLabel }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-navy-900/80 border border-navy-700 p-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-text-primary">{label}</p>
        {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
      </div>
      <Toggle checked={Boolean(checked)} onChange={onChange} disabled={disabled} ariaLabel={ariaLabel || label} />
    </div>
  );
}
