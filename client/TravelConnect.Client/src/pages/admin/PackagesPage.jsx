import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Download, Plus, Search, SlidersHorizontal, Star, Inbox } from "lucide-react";
import { packagesApi } from "../../services/api";
import CrudModal from "../../components/admin/CrudModal";

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

export default function PackagesPage() {
  const { role } = useOutletContext();
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [activeCountry, setActiveCountry] = useState("All");
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: "add", data: null });
  const [saving, setSaving] = useState(false);

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

  const avatarFor = (name = "") => {
    const map = { Bali: "🏝️", Paris: "🗼", Tokyo: "⛩️", Maldives: "🌊", Malta: "🏖️", Swiss: "🏔️", Switzerland: "🏔️", "New York": "🗽", Japan: "⛩️", Greece: "🏛️" };
    for (const [k, v] of Object.entries(map)) if ((name || "").toLowerCase().includes(k.toLowerCase())) return v;
    return "🌍";
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
          <button className="btn-secondary"><Download size={16} /> Export</button>
          <button onClick={() => openModal("add")} className="btn-primary"><Plus size={17} /> Add Package</button>
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
                filtered.map((p) => (
                  <tr key={p.id ?? p.name} className="table-row">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-navy-700 flex items-center justify-center text-xl shrink-0">{avatarFor(p.location)}</div>
                        <div>
                          <p className="font-medium">{p.name || "—"}</p>
                          <p className="text-xs text-text-secondary">{p.location || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-cyan-accent font-bold">{p.duration || "—"}</td>
                    <td className="px-5 py-4 text-badge-green font-semibold">{money(p.price)}</td>
                    <td className="px-5 py-4 text-badge-orange flex items-center gap-1"><Star size={14} fill="currentColor" /> {Number(p.rating || 0).toFixed(1)}</td>
                    <td className="px-5 py-4 text-text-secondary">{p.reviews ?? 0} reviews</td>
                    <td className="px-5 py-4"><span className={statusBadge[p.status] || "badge-green"}>{p.status || "—"}</span></td>
                    <td className="px-5 py-4"><span className={tagBadge[p.tag] || "badge-cyan"}>{p.tag || "—"}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openModal("view", p)} className="text-xs text-cyan-accent hover:underline">View</button>
                        <button onClick={() => openModal("edit", p)} className="text-xs text-text-secondary hover:text-badge-orange transition">Edit</button>
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
        title={modal.mode === "add" ? "Add Package" : modal.mode === "edit" ? "Edit Package" : "Package Details"}
        mode={modal.mode}
        fields={modalFields}
        data={modal.data || {}}
        onSave={handleSave}
        saving={saving}
      />
    </>
  );
}
