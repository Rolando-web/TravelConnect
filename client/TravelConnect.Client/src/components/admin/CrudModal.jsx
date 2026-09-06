import { useState, useEffect } from "react";
import { Upload, Trash2 } from "lucide-react";
import { uploadImage, assetUrl } from "../../services/api";

export default function CrudModal({
  open,
  onClose,
  title,
  mode = "add",
  fields = [],
  data = {},
  onSave,
  saving = false,
}) {
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(mode === "add" ? {} : { ...data });
      setErrors({});
    }
  }, [open, mode, data]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const isView = mode === "view";

  // Primary keys can never be edited — surface them as read-only fields in
  // edit/view mode so users can see them without being able to change them.
  const primaryKeyField =
    mode !== "add" && data?.id != null
      ? [{ key: "id", label: "ID", readOnly: true }]
      : [];
  const allFields = [...primaryKeyField, ...fields];

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const errs = {};
    for (const f of allFields) {
      if (f.required && (form[f.key] === undefined || form[f.key] === null || form[f.key] === "")) {
        errs[f.key] = `${f.label} is required`;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await onSave(form);
  };

  const inputBase = "w-full bg-navy-900 border border-navy-700 rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-cyan-accent focus:ring-1 focus:ring-cyan-accent/30";
  const viewBase = `${inputBase} bg-navy-900/60 text-text-secondary cursor-default`;

  const renderField = (f) => {
    const disabled = isView || f.readOnly;
    const cls = disabled ? viewBase : inputBase;
    const errCls = errors[f.key] ? " border-badge-red" : "";

    if (f.type === "image") {
      const url = form[f.key] || "";
      const preview = url ? (
        <img
          src={assetUrl(url)}
          alt={f.label}
          className="h-36 w-full object-cover rounded-xl border border-navy-700 bg-navy-900"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      ) : (
        <div className="h-36 w-full flex items-center justify-center rounded-xl border border-dashed border-navy-700 bg-navy-900 text-text-secondary text-sm">
          No image set
        </div>
      );
      const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const res = await uploadImage(file);
          set(f.key, res.url);
        } catch (err) {
          alert(err.message || "Image upload failed");
        } finally {
          e.target.value = "";
        }
      };
      return (
        <div className="space-y-2">
          {preview}
          {!disabled && (
            <>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-accent/60 px-3 py-2 text-xs font-bold text-cyan-accent hover:bg-cyan-accent/10 transition cursor-pointer">
                  <Upload size={14} /> Upload Image
                  <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </label>
                {url && (
                  <button
                    type="button"
                    onClick={() => set(f.key, "")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-badge-red/50 px-3 py-2 text-xs font-bold text-badge-red hover:bg-badge-red/10 transition"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder || "Paste image URL..."}
                className={inputBase}
              />
            </>
          )}
        </div>
      );
    }
    if (f.type === "textarea") {
      return (
        <textarea
          value={form[f.key] ?? ""}
          onChange={(e) => set(f.key, e.target.value)}
          disabled={disabled}
          rows={f.rows || 3}
          placeholder={f.placeholder || ""}
          className={`${cls}${errCls} resize-none`}
        />
      );
    }
    if (f.type === "select") {
      return (
        <select
          value={form[f.key] ?? ""}
          onChange={(e) => set(f.key, e.target.value)}
          disabled={disabled}
          className={`${cls}${errCls}`}
        >
          <option value="">{f.placeholder || "Select..."}</option>
          {(f.options || []).map((o) => {
            const ov = typeof o === "object" ? o.value : o;
            const ol = typeof o === "object" ? o.label : o;
            return (
              <option key={ov} value={ov}>{ol}</option>
            );
          })}
        </select>
      );
    }
    if (f.type === "checkbox") {
      return (
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={!!form[f.key]}
            onChange={(e) => set(f.key, e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 accent-[#00A8FF]"
          />
          {f.checkboxLabel || f.label}
        </label>
      );
    }
    return (
      <input
        type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
        value={form[f.key] ?? ""}
        onChange={(e) => set(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)}
        disabled={disabled}
        placeholder={f.placeholder || ""}
        className={`${cls}${errCls}`}
      />
    );
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(2,8,23,0.72)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-navy-800 border border-navy-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h3 className="text-lg font-bold text-text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-navy-900 hover:bg-navy-700 text-text-secondary hover:text-text-primary transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {allFields.map((f) => (
            <div key={f.key}>
              {f.type !== "checkbox" && (
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  {f.label}
                  {f.required && !isView && <span className="text-badge-red ml-0.5">*</span>}
                  {f.readOnly && (
                    <span className="ml-1 font-normal text-text-secondary/70">
                      (auto — cannot be edited)
                    </span>
                  )}
                </label>
              )}
              {renderField(f)}
              {errors[f.key] && <p className="text-xs text-badge-red mt-1">{errors[f.key]}</p>}
            </div>
          ))}
        </form>

        {!isView && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-navy-700">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-navy-900 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 bg-cyan-accent text-navy-900 text-sm font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <div className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />}
              {mode === "add" ? "Create" : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
