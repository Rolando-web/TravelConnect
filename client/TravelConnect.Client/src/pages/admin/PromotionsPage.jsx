import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Download, Plus, Search, SlidersHorizontal, Inbox } from "lucide-react";
import { promotionsApi } from "../../services/api";
import CrudModal from "../../components/admin/CrudModal";

const statusBadge = {
  Active: "badge-green",
  Expired: "badge-red",
  Scheduled: "badge-orange",
  Inactive: "badge-red",
};

const typeBadge = {
  Percent: "badge-cyan",
  Fixed: "badge-purple",
};

const statusFilters = ["All", "Active", "Expired", "Scheduled", "Inactive"];
const typeFilters = ["All", "Percent", "Fixed"];

function money(v) {
  return `₱${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function PromotionsPage() {
  const { role } = useOutletContext();
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [activeType, setActiveType] = useState("All");
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: "add", data: null });
  const [saving, setSaving] = useState(false);

  const load = () => {
    promotionsApi
      .list()
      .then((d) => setPromotions(Array.isArray(d) ? d : []))
      .catch(() => setPromotions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = (mode, data = null) => setModal({ open: true, mode, data });

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal.mode === "add") await promotionsApi.create(form);
      else await promotionsApi.update(modal.data.id, { ...form, id: modal.data.id });
      setModal({ open: false, mode: "add", data: null });
      setLoading(true);
      load();
    } catch (err) {
      alert(err.message || "Failed to save promotion");
    } finally {
      setSaving(false);
    }
  };

  const modalFields = [
    { key: "code", label: "Code", required: true },
    { key: "campaignName", label: "Campaign Name", required: true },
    { key: "description", label: "Description", type: "textarea", rows: 3 },
    { key: "discount", label: "Discount", type: "number" },
    { key: "discountType", label: "Type", type: "select", options: ["Percent", "Fixed"] },
    { key: "maxUses", label: "Max Uses", type: "number" },
    { key: "usedCount", label: "Used Count", type: "number" },
    { key: "expiresAt", label: "Expires At", type: "date" },
    { key: "status", label: "Status", type: "select", options: ["Active", "Scheduled", "Expired", "Inactive"] },
  ];

  const filtered = useMemo(() => {
    return promotions.filter((p) => {
      const matchQuery =
        !query ||
        (p.code || "").toLowerCase().includes(query.toLowerCase()) ||
        (p.campaignName || "").toLowerCase().includes(query.toLowerCase());
      const matchStatus = activeStatus === "All" || p.status === activeStatus;
      const matchType = activeType === "All" || p.discountType === activeType;
      return matchQuery && matchStatus && matchType;
    });
  }, [promotions, query, activeStatus, activeType]);

  const discountLabel = (p) => {
    if ((p.discountType || "").toLowerCase() === "fixed") return money(p.discount);
    return `${Number(p.discount || 0)}%`;
  };

  const totalUses = promotions.reduce((s, p) => s + (p.usedCount || 0), 0);
  const topCampaign = promotions.reduce((a, b) => ((a?.usedCount || 0) >= (b.usedCount || 0) ? a : b), null);

  const stats = [
    ["Active Promos", promotions.filter((p) => p.status === "Active").length.toLocaleString(), "Currently running"],
    ["Total Uses", totalUses.toLocaleString(), "Promo redemptions"],
    ["Top Campaign", topCampaign?.code || "—", topCampaign ? `${topCampaign.usedCount || 0} uses` : "No campaigns yet"],
    ["Promo Codes", promotions.length.toLocaleString(), "Total campaigns"],
  ];

  return (
    <>
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; Promotions</p>
          <h1 className="text-3xl font-black mt-1 font-serif">Promotion Management</h1>
          <p className="text-text-secondary mt-2">Create, schedule, and monitor discount campaigns.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary"><Download size={16} /> Export</button>
          <button onClick={() => openModal("add")} className="btn-primary"><Plus size={17} /> Add Promotion</button>
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
              placeholder="Search promotions..."
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
              <button key={t} onClick={() => setActiveType(t)} className={activeType === t ? "filter-pill-active" : "filter-pill"}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <section className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-cyan-accent text-navy-900 text-left text-xs uppercase tracking-wider">
              <tr>
                {["Code", "Campaign", "Discount", "Type", "Progress", "Expires", "Status", "Actions"].map((c) => (
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
                    <p className="text-text-secondary font-semibold">No promotions found</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {query ? "Try a different search." : "No promotions have been created yet."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const max = p.maxUses || 0;
                  const used = p.usedCount || 0;
                  const pct = max > 0 ? Math.round((used / max) * 100) : 0;
                  return (
                    <tr key={p.id ?? p.code} className="table-row">
                      <td className="px-5 py-4">
                        <span className="bg-cyan-accent/15 text-cyan-accent px-3 py-1 rounded-lg font-mono font-bold text-xs">
                          {p.code || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-medium">{p.campaignName || "—"}</td>
                      <td className="px-5 py-4 text-badge-green font-semibold">{discountLabel(p)}</td>
                      <td className="px-5 py-4"><span className={typeBadge[p.discountType] || "badge-cyan"}>{p.discountType || "—"}</span></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-navy-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= 100 ? "bg-badge-red" : "bg-cyan-accent"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-text-secondary whitespace-nowrap">
                            {used}/{max || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-text-secondary font-mono text-xs">{p.expiresAt || "—"}</td>
                      <td className="px-5 py-4"><span className={statusBadge[p.status] || "badge-orange"}>{p.status || "—"}</span></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openModal("view", p)} className="text-xs text-cyan-accent hover:underline">View</button>
                          <button onClick={() => openModal("edit", p)} className="text-xs text-text-secondary hover:text-badge-orange transition">Edit</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CrudModal
        open={modal.open}
        onClose={() => setModal({ open: false, mode: "add", data: null })}
        title={modal.mode === "add" ? "Add Promotion" : modal.mode === "edit" ? "Edit Promotion" : "Promotion Details"}
        mode={modal.mode}
        fields={modalFields}
        data={modal.data || {}}
        onSave={handleSave}
        saving={saving}
      />
    </>
  );
}
