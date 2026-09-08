import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Download, Plus, Search, SlidersHorizontal, Eye, Pencil, Trash2, Inbox, X, MapPin, Boxes } from "lucide-react";
import { destinationsApi, packagesApi, assetUrl } from "../../services/api";
import CrudModal from "../../components/admin/CrudModal";

const statusBadge = { Featured: "badge-green", Active: "badge-cyan", Inactive: "badge-red" };

const statusFilters = ["All", "Featured", "Active", "Inactive"];

const emojiFor = (name = "") => {
  const map = { Bali: "🏝️", Paris: "🗼", Tokyo: "⛩️", Maldives: "🌊", Malta: "🏖️", Swiss: "🏔️", Switzerland: "🏔️", "New York": "🗽", Japan: "⛩️", Greece: "🏛️", Rome: "🏛️", Hawaii: "🌺", Santorini: "🇬🇷" };
  for (const [k, v] of Object.entries(map)) if ((name || "").toLowerCase().includes(k.toLowerCase())) return v;
  return "🌍";
};

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "—";
}

export default function DestinationsPage() {
  const { role } = useOutletContext();
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [activeRegion, setActiveRegion] = useState("All");
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: "add", data: null });
  const [viewing, setViewing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    Promise.allSettled([destinationsApi.list(), packagesApi.list()])
      .then(([dRes, pRes]) => {
        const dests = dRes.status === "fulfilled" && Array.isArray(dRes.value) ? dRes.value : [];
        const pkgs = pRes.status === "fulfilled" && Array.isArray(pRes.value) ? pRes.value : [];
        const withCount = dests.map((d) => ({
          ...d,
          initials: initials(d.name),
          packages: pkgs.filter((p) => p.location && (p.location === d.name || d.name.includes(p.location) || p.location.includes(d.name))).length,
        }));
        setDestinations(withCount);
      })
      .catch(() => setDestinations([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = (mode, data = null) => setModal({ open: true, mode, data });

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal.mode === "add") await destinationsApi.create(form);
      else await destinationsApi.update(modal.data.id, { ...form, id: modal.data.id });
      setModal({ open: false, mode: "add", data: null });
      setLoading(true);
      load();
    } catch (err) {
      alert(err.message || "Failed to save destination");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await destinationsApi.remove(deleting.id);
      setDeleting(null);
      setLoading(true);
      load();
    } catch (err) {
      alert(err.message || "Failed to delete destination");
    } finally {
      setSaving(false);
    }
  };

  const modalFields = [
    { key: "imageUrl", label: "Destination Image", type: "image", placeholder: "Paste image URL..." },
    { key: "name", label: "Destination", required: true },
    { key: "region", label: "Region", required: true },
    { key: "category", label: "Category" },
    { key: "description", label: "Description", type: "textarea", rows: 3 },
    { key: "status", label: "Status", type: "select", options: ["Active", "Featured", "Inactive"] },
  ];

  const regionFilters = useMemo(
    () => ["All", ...new Set(destinations.map((d) => d.region).filter(Boolean))],
    [destinations]
  );

  const filtered = useMemo(() => {
    return destinations.filter((d) => {
      const matchQuery =
        !query ||
        (d.name || "").toLowerCase().includes(query.toLowerCase()) ||
        (d.region || "").toLowerCase().includes(query.toLowerCase());
      const matchStatus = activeStatus === "All" || d.status === activeStatus;
      const matchRegion = activeRegion === "All" || d.region === activeRegion;
      return matchQuery && matchStatus && matchRegion;
    });
  }, [destinations, query, activeStatus, activeRegion]);

  const totalPackages = destinations.reduce((s, d) => s + (d.packages || 0), 0);
  const stats = [
    ["Total Destinations", destinations.length.toLocaleString(), "All regions"],
    ["Featured", destinations.filter((d) => d.status === "Featured").length.toLocaleString(), "Homepage highlights"],
    ["Regions", new Set(destinations.map((d) => d.region).filter(Boolean)).size.toLocaleString(), "Geographic regions"],
    ["Total Packages", totalPackages.toLocaleString(), "Across destinations"],
  ];

  const handleExport = () => {
    const rows = [
      ["id", "name", "region", "category", "description", "status"].join(","),
      ...filtered.map((d) =>
        [d.id, d.name, d.region, d.category, d.description, d.status]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `destinations_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; Destinations</p>
          <h1 className="text-3xl font-black mt-1 font-serif">Destinations</h1>
          <p className="text-text-secondary mt-2">Manage and feature travel destinations around the world.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handleExport}><Download size={16} /> Export</button>
          <button onClick={() => openModal("add")} className="btn-primary"><Plus size={17} /> Add Destination</button>
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
              placeholder="Search destinations..."
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
            <span className="text-xs text-text-secondary font-medium">REGION</span>
            {regionFilters.map((r) => (
              <button key={r} onClick={() => setActiveRegion(r)} className={activeRegion === r ? "filter-pill-active" : "filter-pill"}>{r || "—"}</button>
            ))}
          </div>
        </div>
      </div>

      <section className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-cyan-accent text-navy-900 text-left text-xs uppercase tracking-wider">
              <tr>
                {["Destination", "Region", "Category", "Packages", "Status", "Actions"].map((c) => (
                  <th key={c} className="px-5 py-3 font-semibold">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-text-secondary">Loading data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <Inbox size={36} className="mx-auto text-text-secondary mb-3" />
                    <p className="text-text-secondary font-semibold">No destinations found</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {query ? "Try a different search." : "No destinations have been created yet."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id ?? d.name} className="table-row">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {d.imageUrl ? (
                          <img
                            src={assetUrl(d.imageUrl)}
                            alt={d.name}
                            className="w-11 h-11 rounded-xl object-cover border border-navy-700 bg-navy-900"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-cyan-accent/15 flex items-center justify-center text-xl shrink-0">{emojiFor(d.name)}</div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary truncate">{d.name || "—"}</p>
                          <p className="text-xs text-text-secondary truncate">{d.region || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-text-secondary">{d.region || "—"}</td>
                    <td className="px-5 py-4"><span className="badge-cyan">{d.category || "—"}</span></td>
                    <td className="px-5 py-4 text-cyan-accent font-semibold">{d.packages ?? 0}</td>
                    <td className="px-5 py-4"><span className={statusBadge[d.status] || "badge-cyan"}>{d.status || "—"}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewing(d)} className="p-1.5 rounded-lg hover:bg-navy-700 transition text-text-secondary hover:text-cyan-accent"><Eye size={15} /></button>
                        <button onClick={() => openModal("edit", d)} className="p-1.5 rounded-lg hover:bg-navy-700 transition text-text-secondary hover:text-cyan-accent"><Pencil size={15} /></button>
                        <button onClick={() => setDeleting(d)} className="p-1.5 rounded-lg hover:bg-navy-700 transition text-text-secondary hover:text-badge-red"><Trash2 size={15} /></button>
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
        title={modal.mode === "add" ? "Add Destination" : "Edit Destination"}
        mode={modal.mode}
        fields={modalFields}
        data={modal.data || {}}
        onSave={handleSave}
        saving={saving}
      />

      {viewing && <DestinationViewModal destination={viewing} onClose={() => setViewing(null)} onEdit={() => { openModal("edit", viewing); setViewing(null); }} />}

      {deleting && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setDeleting(null); }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(2,8,23,0.72)", backdropFilter: "blur(4px)" }}
        >
          <div className="bg-navy-800 border border-navy-700 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-text-primary">Delete Destination</h3>
            <p className="text-sm text-text-secondary mt-3">
              Are you sure you want to delete <span className="text-text-primary font-semibold">"{deleting.name}"</span>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleting(null)}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-navy-900 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-5 py-2 bg-badge-red text-white text-sm font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DestinationViewModal({ destination: d, onClose, onEdit }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(2,8,23,0.72)", backdropFilter: "blur(4px)" }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-navy-800 border border-navy-700 rounded-2xl shadow-2xl">
        <article className="card p-0 overflow-hidden flex flex-col">
          <div className="relative h-44 sm:h-52 bg-navy-700">
            {d.imageUrl && (
              <img
                src={assetUrl(d.imageUrl)}
                alt={d.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
            <div className={`absolute inset-0 flex items-center justify-center ${d.imageUrl ? "bg-navy-900/40" : "bg-gradient-to-br from-navy-700 to-navy-900"}`}>
              {!d.imageUrl && (
                <span className="w-20 h-20 rounded-full bg-cyan-accent/15 flex items-center justify-center text-4xl">
                  {emojiFor(d.name)}
                </span>
              )}
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <span className={statusBadge[d.status] || "badge-cyan"}>{d.status || "—"}</span>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-navy-900/80 text-text-secondary hover:text-text-primary hover:bg-navy-900 transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <span className="bg-navy-900/80 text-cyan-accent text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur"><MapPin size={12} className="inline mr-1" />{d.region || "—"}</span>
              {d.category && <span className="badge-cyan">{d.category}</span>}
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-black text-2xl leading-tight">{d.name || "—"}</h3>
                <p className="text-sm text-text-secondary mt-0.5">{d.region || "Region not set"}</p>
              </div>
            </div>

            {d.description && (
              <p className="text-sm text-text-secondary mt-4 leading-relaxed">{d.description}</p>
            )}

            <div className="border-t border-navy-700 my-5" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-navy-900/70 border border-navy-700 p-4">
                <p className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <MapPin size={13} /> Region
                </p>
                <p className="text-2xl font-black text-cyan-accent mt-1">{d.region || "—"}</p>
              </div>
              <div className="rounded-xl bg-navy-900/70 border border-navy-700 p-4">
                <p className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <Boxes size={13} /> Packages
                </p>
                <p className="text-2xl font-black text-badge-green mt-1">{d.packages ?? 0}</p>
              </div>
            </div>

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