import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Download,
  Plus,
  Search,
  SlidersHorizontal,
  Inbox,
  Mail,
  Phone,
  Package,
  Pencil,
  Eye,
  X,
  Building2,
  Car,
  Compass,
  Ticket,
  Plane,
  Store,
} from "lucide-react";
import { suppliersApi, packagesApi, assetUrl } from "../../services/api";
import CrudModal from "../../components/admin/CrudModal";
import StatCard from "../../components/admin/StatCard";
import Pagination from "../../components/admin/Pagination";

const statusBadge = { Active: "badge-green", Review: "badge-orange", Inactive: "badge-red" };

const statusFilters = ["All", "Active", "Review", "Inactive"];

const typeIcons = {
  Hotel: Building2,
  Transport: Car,
  "Tour Op.": Compass,
  Activity: Ticket,
  Airline: Plane,
};

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "—";
}

function money(v) {
  return `₱${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function downloadCSV(filename, headers, rows) {
  const csv = [headers.join(","), ...rows.map((r) =>
    headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")
  )].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SuppliersPage() {
  const { role } = useOutletContext();
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [activeType, setActiveType] = useState("All");
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: "add", data: null });
  const [viewing, setViewing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const load = () => {
    Promise.allSettled([suppliersApi.list(), packagesApi.list()])
      .then(([sRes, pRes]) => {
        const sups = sRes.status === "fulfilled" && Array.isArray(sRes.value) ? sRes.value : [];
        const pkgs = pRes.status === "fulfilled" && Array.isArray(pRes.value) ? pRes.value : [];
        const withInfo = sups.map((s) => {
          const owned = pkgs.filter((p) => p.supplierId === s.id);
          const sum = owned.reduce((acc, p) => acc + (p.price || 0), 0);
          return {
            ...s,
            initials: initials(s.companyName || s.contactName),
            packageCount: owned.length,
            avgPackagePrice: owned.length ? sum / owned.length : 0,
          };
        });
        setSuppliers(withInfo);
      })
      .catch(() => setSuppliers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = (mode, data = null) => setModal({ open: true, mode, data });

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal.mode === "add") await suppliersApi.create(form);
      else await suppliersApi.update(modal.data.id, { ...form, id: modal.data.id });
      setModal({ open: false, mode: "add", data: null });
      setLoading(true);
      load();
    } catch (err) {
      alert(err.message || "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  };

  const modalFields = [
    { key: "imageUrl", label: "Supplier Image", type: "image", placeholder: "Paste image URL..." },
    { key: "companyName", label: "Company Name", required: true },
    { key: "contactName", label: "Contact Name" },
    { key: "contactEmail", label: "Contact Email", type: "text" },
    { key: "contactPhone", label: "Contact Phone" },
    { key: "type", label: "Type", type: "select", options: ["Hotel", "Transport", "Tour Op.", "Activity", "Airline"] },
    { key: "rating", label: "Rating", type: "number", placeholder: "0.0 – 5.0" },
    { key: "status", label: "Status", type: "select", options: ["Active", "Review", "Inactive"] },
  ];

  const typeFilters = useMemo(
    () => ["All", ...new Set(suppliers.map((s) => s.type).filter(Boolean))],
    [suppliers]
  );

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      const matchQuery =
        !query ||
        (s.companyName || "").toLowerCase().includes(query.toLowerCase()) ||
        (s.contactName || "").toLowerCase().includes(query.toLowerCase()) ||
        (s.contactEmail || "").toLowerCase().includes(query.toLowerCase());
      const matchStatus = activeStatus === "All" || s.status === activeStatus;
      const matchType = activeType === "All" || s.type === activeType;
      return matchQuery && matchStatus && matchType;
    });
  }, [suppliers, query, activeStatus, activeType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [query, activeStatus, activeType]);

  const avgRating = suppliers.length
    ? suppliers.reduce((s, v) => s + (v.rating || 0), 0) / suppliers.length
    : 0;
  const totalPackages = suppliers.reduce((s, v) => s + (v.packageCount || 0), 0);

  const stats = [
    ["Total Suppliers", suppliers.length.toLocaleString(), "All partners"],
    ["Active", suppliers.filter((s) => s.status === "Active").length.toLocaleString(), "Currently active"],
    ["Avg Rating", avgRating ? `★ ${avgRating.toFixed(1)}` : "0", "Partner quality"],
    ["Total Packages", totalPackages.toLocaleString(), "Across suppliers"],
  ];

  const handleExport = () => {
    downloadCSV(
      "suppliers.csv",
      ["id", "companyName", "contactName", "contactEmail", "contactPhone", "type", "rating", "status", "packageCount", "avgPackagePrice"],
      filtered
    );
  };

  return (
    <>
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; Suppliers</p>
          <h1 className="text-3xl font-black mt-1 font-serif">Supplier Management</h1>
          <p className="text-text-secondary mt-2">Manage supplier partnerships and service agreements.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handleExport}><Download size={16} /> Export</button>
          <button onClick={() => openModal("add")} className="btn-primary"><Plus size={17} /> Add Supplier</button>
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
              placeholder="Search by company, contact, email..."
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
            <span className="text-xs text-text-secondary font-medium">TYPE</span>
            {typeFilters.map((t) => (
              <button key={t} onClick={() => setActiveType(t)} className={activeType === t ? "filter-pill-active" : "filter-pill"}>{t || "—"}</button>
            ))}
          </div>
        </div>
      </div>

      <section className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-cyan-accent text-navy-900 text-left text-xs uppercase tracking-wider">
              <tr>
                {["Supplier", "Type", "Contact", "Rating", "Status", "Packages", "Avg Price", "Actions"].map((c) => (
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
                    <p className="text-text-secondary font-semibold">No suppliers found</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {query ? "Try a different search." : "No suppliers have been registered yet."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((s) => (
                  <tr key={s.id ?? s.companyName} className="table-row">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {s.imageUrl ? (
                          <img
                            src={assetUrl(s.imageUrl)}
                            alt={s.companyName}
                            className="w-9 h-9 rounded-xl object-cover border border-navy-700 bg-navy-900"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-badge-green/15 flex items-center justify-center text-badge-green text-xs font-black">
                            {s.initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary truncate">{s.companyName || "—"}</p>
                          <p className="text-xs text-text-secondary truncate">{s.contactName || "No contact assigned"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <span className="p-1.5 rounded-lg bg-badge-green/15 text-badge-green"><TypeIcon type={s.type} size={14} /></span>
                        <span className="text-text-secondary">{s.type || "Supplier"}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-0.5 text-xs text-text-secondary">
                        {s.contactEmail && <p className="flex items-center gap-1.5 max-w-52 truncate"><Mail size={12} className="shrink-0" /> {s.contactEmail}</p>}
                        {s.contactPhone && <p className="flex items-center gap-1.5"><Phone size={12} className="shrink-0" /> {s.contactPhone}</p>}
                        {!s.contactEmail && !s.contactPhone && <span>—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-badge-orange text-sm font-semibold">
                        {Number(s.rating || 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={statusBadge[s.status] || "badge-green"}>{s.status || "—"}</span>
                    </td>
                    <td className="px-5 py-4 text-cyan-accent font-semibold">{s.packageCount ?? 0}</td>
                    <td className="px-5 py-4 text-badge-green font-semibold">
                      {s.avgPackagePrice ? money(s.avgPackagePrice) : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewing(s)} className="p-1.5 rounded-lg hover:bg-navy-700 transition text-text-secondary hover:text-badge-green"><Eye size={15} /></button>
                        <button onClick={() => openModal("edit", s)} className="p-1.5 rounded-lg hover:bg-navy-700 transition text-text-secondary hover:text-badge-green"><Pencil size={15} /></button>
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
        title={modal.mode === "add" ? "Add Supplier" : "Edit Supplier"}
        mode={modal.mode}
        fields={modalFields}
        data={modal.data || {}}
        onSave={handleSave}
        saving={saving}
      />

      {viewing && <SupplierViewModal supplier={viewing} onClose={() => setViewing(null)} onEdit={() => { openModal("edit", viewing); setViewing(null); }} />}
    </>
  );
}

function TypeIcon({ type, size = 16 }) {
  const Icon = typeIcons[type] || Store;
  return <Icon size={size} />;
}

function SupplierViewModal({ supplier: s, onClose, onEdit }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(2,8,23,0.72)", backdropFilter: "blur(4px)" }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-navy-800 border border-navy-700 rounded-2xl shadow-2xl">
        <article className="card p-0 overflow-hidden flex flex-col">
          <div className="relative h-44 sm:h-52 bg-navy-700">
            {s.imageUrl && (
              <img
                src={assetUrl(s.imageUrl)}
                alt={s.companyName}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
            <div className={`absolute inset-0 flex items-center justify-center ${s.imageUrl ? "bg-navy-900/40" : "bg-gradient-to-br from-navy-700 to-navy-900"}`}>
              {!s.imageUrl && (
                <span className="w-20 h-20 rounded-full bg-badge-green/15 flex items-center justify-center text-badge-green text-3xl font-black">
                  {s.initials}
                </span>
              )}
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <span className={statusBadge[s.status] || "badge-green"}>{s.status || "—"}</span>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-navy-900/80 text-text-secondary hover:text-text-primary hover:bg-navy-900 transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <span className="p-2 rounded-lg bg-badge-green/15 text-badge-green"><TypeIcon type={s.type} size={20} /></span>
              <span className="bg-navy-900/80 text-badge-green text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur">{s.type || "Supplier"}</span>
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-black text-2xl leading-tight">{s.companyName || "—"}</h3>
                <p className="text-sm text-text-secondary mt-0.5">{s.contactName || "No contact assigned"}</p>
              </div>
              <span className="text-badge-orange text-lg font-black whitespace-nowrap">
                {Number(s.rating || 0).toFixed(1)}
              </span>
            </div>

            <div className="border-t border-navy-700 my-5" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-navy-900/70 border border-navy-700 p-4">
                <p className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <Package size={13} /> Packages
                </p>
                <p className="text-2xl font-black text-cyan-accent mt-1">{s.packageCount ?? 0}</p>
              </div>
              <div className="rounded-xl bg-navy-900/70 border border-navy-700 p-4">
                <p className="text-xs text-text-secondary">Avg Package Price</p>
                <p className="text-2xl font-black text-badge-green mt-1">
                  {s.avgPackagePrice ? money(s.avgPackagePrice) : "—"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="rounded-xl bg-navy-900/70 border border-navy-700 p-4">
                <p className="flex items-center gap-1.5 text-xs text-text-secondary"><Mail size={13} /> Email</p>
                <p className="text-sm font-semibold text-text-primary mt-1 break-all">{s.contactEmail || "—"}</p>
              </div>
              <div className="rounded-xl bg-navy-900/70 border border-navy-700 p-4">
                <p className="flex items-center gap-1.5 text-xs text-text-secondary"><Phone size={13} /> Phone</p>
                <p className="text-sm font-semibold text-text-primary mt-1">{s.contactPhone || "—"}</p>
              </div>
            </div>

            {s.firebaseUid && (
              <div className="mt-3 rounded-xl bg-navy-900/70 border border-navy-700 p-4">
                <p className="text-xs text-text-secondary">Firebase ID</p>
                <p className="text-sm font-mono text-cyan-accent mt-1 break-all">{s.firebaseUid}</p>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-navy-700 flex items-center justify-end gap-2">
              <button onClick={onClose} className="btn-secondary justify-center py-2">
                Close
              </button>
              <button onClick={onEdit} className="btn-primary justify-center py-2">
                <Pencil size={15} /> Edit
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}