import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Download, Plus, Search, SlidersHorizontal, Star, Inbox } from "lucide-react";
import { suppliersApi, packagesApi } from "../../services/api";
import CrudModal from "../../components/admin/CrudModal";

const statusBadge = { Active: "badge-green", Review: "badge-orange", Inactive: "badge-red" };

const statusFilters = ["All", "Active", "Review", "Inactive"];

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "—";
}

export default function SuppliersPage() {
  const { role } = useOutletContext();
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [activeType, setActiveType] = useState("All");
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: "add", data: null });
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.allSettled([suppliersApi.list(), packagesApi.list()])
      .then(([sRes, pRes]) => {
        const sups = sRes.status === "fulfilled" && Array.isArray(sRes.value) ? sRes.value : [];
        const pkgs = pRes.status === "fulfilled" && Array.isArray(pRes.value) ? pRes.value : [];
        const withCount = sups.map((s) => ({
          ...s,
          initials: initials(s.contactName || s.companyName),
          packageCount: pkgs.filter((p) => p.supplierId === s.id).length,
        }));
        setSuppliers(withCount);
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
    { key: "companyName", label: "Company Name", required: true },
    { key: "contactName", label: "Contact Name" },
    { key: "contactEmail", label: "Contact Email", type: "text" },
    { key: "contactPhone", label: "Contact Phone" },
    { key: "type", label: "Type", type: "select", options: ["Hotel", "Transport", "Tour Op.", "Activity", "Airline"] },
    { key: "rating", label: "Rating", type: "number" },
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
        (s.contactName || "").toLowerCase().includes(query.toLowerCase());
      const matchStatus = activeStatus === "All" || s.status === activeStatus;
      const matchType = activeType === "All" || s.type === activeType;
      return matchQuery && matchStatus && matchType;
    });
  }, [suppliers, query, activeStatus, activeType]);

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

  return (
    <>
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; Suppliers</p>
          <h1 className="text-3xl font-black mt-1 font-serif">Supplier Management</h1>
          <p className="text-text-secondary mt-2">Manage supplier partnerships and service agreements.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary"><Download size={16} /> Export</button>
          <button onClick={() => openModal("add")} className="btn-primary"><Plus size={17} /> Add Supplier</button>
        </div>
      </section>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        {stats.map(([label, value, note]) => (
          <article key={label} className="card">
            <p className="text-text-secondary text-sm">{label}</p>
            <p className="text-2xl font-black mt-2">{value}</p>
            <p className="text-xs text-text-secondary mt-2">{note}</p>
          </article>
        ))}
      </div>

      <div className="card mb-5">
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-1 min-w-60 gap-2 items-center rounded-xl border border-navy-700 bg-navy-900 px-3 py-2">
            <Search size={17} className="text-text-secondary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search suppliers..."
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
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-cyan-accent text-navy-900 text-left text-xs uppercase tracking-wider">
              <tr>
                {["Company", "Contact", "Type", "Packages", "Rating", "Status", "Actions"].map((c) => (
                  <th key={c} className="px-5 py-3 font-semibold">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-text-secondary">Loading data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <Inbox size={36} className="mx-auto text-text-secondary mb-3" />
                    <p className="text-text-secondary font-semibold">No suppliers found</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {query ? "Try a different search." : "No suppliers have been registered yet."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id ?? s.companyName} className="table-row">
                    <td className="px-5 py-4 font-medium">{s.companyName || "—"}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-violet-500/15 flex items-center justify-center text-violet-400 text-xs font-bold">{s.initials}</div>
                        <span>{s.contactName || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className="badge-cyan">{s.type || "—"}</span></td>
                    <td className="px-5 py-4 text-cyan-accent font-semibold">{s.packageCount ?? 0}</td>
                    <td className="px-5 py-4 text-badge-orange flex items-center gap-1"><Star size={14} fill="currentColor" /> {Number(s.rating || 0).toFixed(1)}</td>
                    <td className="px-5 py-4"><span className={statusBadge[s.status] || "badge-green"}>{s.status || "—"}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openModal("view", s)} className="text-xs text-cyan-accent hover:underline">View</button>
                        <button onClick={() => openModal("edit", s)} className="text-xs text-text-secondary hover:text-badge-orange transition">Edit</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CrudModal
        open={modal.open}
        onClose={() => setModal({ open: false, mode: "add", data: null })}
        title={modal.mode === "add" ? "Add Supplier" : modal.mode === "edit" ? "Edit Supplier" : "Supplier Details"}
        mode={modal.mode}
        fields={modalFields}
        data={modal.data || {}}
        onSave={handleSave}
        saving={saving}
      />
    </>
  );
}
