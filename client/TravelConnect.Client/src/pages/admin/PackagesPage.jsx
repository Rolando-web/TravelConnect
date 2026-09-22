import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Download, Plus, Search, SlidersHorizontal, Inbox, Pencil, Eye, X, Tag, MapPin, Clock, Users } from "lucide-react";
import { packagesApi, assetUrl } from "../../services/api";
import CrudModal from "../../components/admin/CrudModal";
import StatCard from "../../components/admin/StatCard";
import Pagination from "../../components/admin/Pagination";

const tagBadge = {
  "Best Seller": "badge-orange",
  "Top Rated": "badge-purple",
  Cultural: "badge-cyan",
  Luxury: "badge-purple",
  "Ultra-Luxury": "badge-purple",
  "City Break": "badge-cyan",
};

const statusBadge = {
  Active: "badge-green",
  Inactive: "badge-red",
  Draft: "badge-orange",
};

function money(v) {
  return `₱${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function avatarFor(name = "") {
  const map = { Bali: "🏝️", Paris: "🗼", Tokyo: "⛩️", Maldives: "🌊", Malta: "🏖️", Swiss: "🏔️", Switzerland: "🏔️", "New York": "🗽", Japan: "⛩️", Greece: "🏛️" };
  for (const [k, v] of Object.entries(map)) if ((name || "").toLowerCase().includes(k.toLowerCase())) return v;
  return "🌍";
}

export default function PackagesPage() {
  const { role } = useOutletContext();
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [activeCountry, setActiveCountry] = useState("All");
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: "add", data: null });
  const [viewing, setViewing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const load = () => {
    packagesApi
      .list()
      .then((d) => setPackages(Array.isArray(d) ? d : []))
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = (mode, data = null) => setModal({ open: true, mode, data });

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal.mode === "add") await packagesApi.create(form);
      else await packagesApi.update(modal.data.id, { ...form, id: modal.data.id });
      setModal({ open: false, mode: "add", data: null });
      setLoading(true);
      load();
    } catch (err) {
      alert(err.message || "Failed to save package");
    } finally {
      setSaving(false);
    }
  };

  const modalFields = [
    { key: "imageUrl", label: "Package Image", type: "image", placeholder: "Paste image URL..." },
    { key: "name", label: "Package Name", required: true },
    { key: "location", label: "Location", required: true },
    { key: "description", label: "Description", type: "textarea", rows: 3 },
    { key: "duration", label: "Duration (e.g. 7D)" },
    { key: "price", label: "Price (₱)", type: "number" },
    { key: "rating", label: "Rating", type: "number" },
    { key: "reviews", label: "Reviews", type: "number" },
    { key: "tag", label: "Tag", type: "select", options: ["Best Seller", "Top Rated", "Cultural", "Luxury", "Ultra-Luxury", "City Break", "Adventure"] },
    { key: "status", label: "Status", type: "select", options: ["Active", "Inactive", "Draft"] },
  ];

  const tagFilters = useMemo(
    () => ["All", ...new Set(packages.map((p) => p.tag).filter(Boolean))],
    [packages]
  );
  const countryFilters = useMemo(
    () => ["All", ...new Set(packages.map((p) => p.location).filter(Boolean))],
    [packages]
  );

  const filtered = useMemo(() => {
    return packages.filter((p) => {
      const matchQuery =
        !query ||
        (p.name || "").toLowerCase().includes(query.toLowerCase()) ||
        (p.location || "").toLowerCase().includes(query.toLowerCase());
      const matchTag = activeTag === "All" || p.tag === activeTag;
      const matchCountry = activeCountry === "All" || p.location === activeCountry;
      return matchQuery && matchTag && matchCountry;
    });
  }, [packages, query, activeTag, activeCountry]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [query, activeTag, activeCountry]);

  const avgPrice = packages.length
    ? packages.reduce((s, p) => s + (p.price || 0), 0) / packages.length
    : 0;
  const avgRating = packages.length
    ? packages.reduce((s, p) => s + (p.rating || 0), 0) / packages.length
    : 0;

  const stats = [
    ["Total Packages", packages.length.toLocaleString(), "Published & active"],
    ["Avg Price", money(avgPrice), "Per package"],
    ["Avg Rating", avgRating ? `★ ${avgRating.toFixed(1)}` : "0", "Customer reviews"],
    ["Countries", new Set(packages.map((p) => p.location).filter(Boolean)).size.toLocaleString(), "Destinations covered"],
  ];

  const handleExport = () => {
    const rows = [
      ["id", "name", "location", "description", "duration", "price", "rating", "reviews", "tag", "status"].join(","),
      ...filtered.map((p) =>
        [p.id, p.name, p.location, p.description, p.duration, p.price, p.rating, p.reviews, p.tag, p.status]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `packages_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; Packages</p>
          <h1 className="text-3xl font-black mt-1 font-serif">Travel Packages</h1>
          <p className="text-text-secondary mt-2">Create curated itineraries and package listings.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handleExport}><Download size={16} /> Export</button>
          <button onClick={() => openModal("add")} className="btn-primary"><Plus size={17} /> Add Package</button>
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
              placeholder="Search packages..."
              className="w-full bg-transparent outline-none text-sm text-text-primary placeholder:text-text-secondary"
            />
          </label>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-text-secondary" />
            <span className="text-xs text-text-secondary font-medium">TAG</span>
            {tagFilters.map((t) => (
              <button key={t} onClick={() => setActiveTag(t)} className={activeTag === t ? "filter-pill-active" : "filter-pill"}>{t || "—"}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary font-medium">COUNTRY</span>
            {countryFilters.map((c) => (
              <button key={c} onClick={() => setActiveCountry(c)} className={activeCountry === c ? "filter-pill-active" : "filter-pill"}>{c || "—"}</button>
            ))}
          </div>
        </div>
      </div>

      <section className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-cyan-accent text-navy-900 text-left text-xs uppercase tracking-wider">
              <tr>
                {["Package", "Days", "Price", "Rating", "Reviews", "Status", "Tag", "Actions"].map((c) => (
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
                    <p className="text-text-secondary font-semibold">No packages found</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {query ? "Try a different search." : "No packages have been created yet."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((p) => (
                  <tr key={p.id ?? p.name} className="table-row">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <img
                            src={assetUrl(p.imageUrl)}
                            alt={p.name}
                            className="w-11 h-11 rounded-xl object-cover border border-navy-700 bg-navy-900"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-navy-700 flex items-center justify-center text-xl shrink-0">{avatarFor(p.location)}</div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary truncate">{p.name || "—"}</p>
                          <p className="text-xs text-text-secondary truncate">{p.location || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-cyan-accent font-bold">{p.duration || "—"}</td>
                    <td className="px-5 py-4 text-badge-green font-semibold">{money(p.price)}</td>
                    <td className="px-5 py-4 text-badge-orange font-semibold">{Number(p.rating || 0).toFixed(1)}</td>
                    <td className="px-5 py-4 text-text-secondary">{p.reviews ?? 0} reviews</td>
                    <td className="px-5 py-4"><span className={statusBadge[p.status] || "badge-green"}>{p.status || "—"}</span></td>
                    <td className="px-5 py-4"><span className={tagBadge[p.tag] || "badge-cyan"}>{p.tag || "—"}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewing(p)} className="p-1.5 rounded-lg hover:bg-navy-700 transition text-text-secondary hover:text-cyan-accent"><Eye size={15} /></button>
                        <button onClick={() => openModal("edit", p)} className="p-1.5 rounded-lg hover:bg-navy-700 transition text-text-secondary hover:text-cyan-accent"><Pencil size={15} /></button>
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
        title={modal.mode === "add" ? "Add Package" : "Edit Package"}
        mode={modal.mode}
        fields={modalFields}
        data={modal.data || {}}
        onSave={handleSave}
        saving={saving}
      />

      {viewing && <PackageViewModal package={viewing} onClose={() => setViewing(null)} onEdit={() => { openModal("edit", viewing); setViewing(null); }} />}
    </>
  );
}

function PackageViewModal({ package: p, onClose, onEdit }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(2,8,23,0.72)", backdropFilter: "blur(4px)" }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-navy-800 border border-navy-700 rounded-2xl shadow-2xl">
        <article className="card p-0 overflow-hidden flex flex-col">
          <div className="relative h-44 sm:h-52 bg-navy-700">
            {p.imageUrl && (
              <img
                src={assetUrl(p.imageUrl)}
                alt={p.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
            <div className={`absolute inset-0 flex items-center justify-center ${p.imageUrl ? "bg-navy-900/40" : "bg-gradient-to-br from-navy-700 to-navy-900"}`}>
              {!p.imageUrl && (
                <span className="w-20 h-20 rounded-full bg-navy-700 flex items-center justify-center text-4xl">
                  {avatarFor(p.location)}
                </span>
              )}
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <span className={statusBadge[p.status] || "badge-green"}>{p.status || "—"}</span>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-navy-900/80 text-text-secondary hover:text-text-primary hover:bg-navy-900 transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <span className="bg-navy-900/80 text-cyan-accent text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur"><MapPin size={12} className="inline mr-1" />{p.location || "—"}</span>
              {p.tag && <span className={tagBadge[p.tag] || "badge-cyan"}>{p.tag || "—"}</span>}
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-black text-2xl leading-tight">{p.name || "—"}</h3>
                <p className="text-sm text-text-secondary mt-0.5">{p.duration ? `${p.duration} trip` : "Duration not set"}</p>
              </div>
              <span className="text-badge-orange text-lg font-black whitespace-nowrap">
                {Number(p.rating || 0).toFixed(1)}
              </span>
            </div>

            {p.description && (
              <p className="text-sm text-text-secondary mt-4 leading-relaxed">{p.description}</p>
            )}

            <div className="border-t border-navy-700 my-5" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-navy-900/70 border border-navy-700 p-4">
                <p className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <Tag size={13} /> Price
                </p>
                <p className="text-2xl font-black text-badge-green mt-1">{money(p.price)}</p>
              </div>
              <div className="rounded-xl bg-navy-900/70 border border-navy-700 p-4">
                <p className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <Clock size={13} /> Duration
                </p>
                <p className="text-2xl font-black text-cyan-accent mt-1">{p.duration || "—"}</p>
              </div>
              <div className="rounded-xl bg-navy-900/70 border border-navy-700 p-4">
                <p className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <Users size={13} /> Reviews
                </p>
                <p className="text-2xl font-black text-text-primary mt-1">{p.reviews ?? 0}</p>
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