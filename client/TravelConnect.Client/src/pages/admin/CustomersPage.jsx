import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Download, Search, SlidersHorizontal, Inbox } from "lucide-react";
import { customersApi } from "../../services/api";
import CrudModal from "../../components/admin/CrudModal";
import StatCard from "../../components/admin/StatCard";
import Pagination from "../../components/admin/Pagination";

const statusBadge = {
  Active: "badge-green",
  Inactive: "badge-red",
  Pending: "badge-orange",
};

const statusFilters = ["All", "Active", "Inactive", "Pending"];

function money(v) {
  return `₱${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "—";
}

export default function CustomersPage() {
  const { role } = useOutletContext();
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [activeCountry, setActiveCountry] = useState("All");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: "add", data: null });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const load = () => {
    customersApi
      .list()
      .then((d) => setCustomers(Array.isArray(d) ? d : []))
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = (mode, data = null) => setModal({ open: true, mode, data });

  const handleSave = async (form) => {
    setSaving(true);
    try {
      await customersApi.update(modal.data.id, { ...form, id: modal.data.id });
      setModal({ open: false, mode: "add", data: null });
      setLoading(true);
      load();
    } catch (err) {
      alert(err.message || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  const modalFields = [
    { key: "name", label: "Name", required: true },
    { key: "email", label: "Email", required: true, type: "email" },
    { key: "phone", label: "Phone", type: "tel" },
    { key: "country", label: "Country" },
    { key: "totalBookings", label: "Total Bookings", type: "number", min: 0 },
    { key: "totalSpent", label: "Total Spent (₱)", type: "number", min: 0 },
    { key: "status", label: "Status", type: "select", options: ["Active", "Inactive", "Pending"] },
  ];

  const countryFilters = useMemo(
    () => ["All", ...new Set(customers.map((c) => c.country).filter(Boolean))],
    [customers]
  );

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchQuery =
        !query ||
        (c.name || "").toLowerCase().includes(query.toLowerCase()) ||
        (c.email || "").toLowerCase().includes(query.toLowerCase());
      const matchStatus = activeStatus === "All" || c.status === activeStatus;
      const matchCountry = activeCountry === "All" || c.country === activeCountry;
      return matchQuery && matchStatus && matchCountry;
    });
  }, [customers, query, activeStatus, activeCountry]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [query, activeStatus, activeCountry]);

  const totalSpent = customers.reduce((s, c) => s + (c.totalSpent || 0), 0);
  const topSpender = customers.reduce((a, b) => (a && (a.totalSpent || 0) >= (b.totalSpent || 0) ? a : b), null);

  const stats = [
    ["Total Customers", customers.length.toLocaleString(), "All registered"],
    ["Active", customers.filter((c) => c.status === "Active").length.toLocaleString(), "Active accounts"],
    ["Total Revenue", money(totalSpent), "All-time spend"],
    ["Top Spender", topSpender?.name?.split(" ")[0] || "—", topSpender ? money(topSpender.totalSpent) + " lifetime" : "No customers yet"],
  ];

  return (
    <>
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; Customers</p>
          <h1 className="text-3xl font-black mt-1 font-serif">Customer Management</h1>
          <p className="text-text-secondary mt-2">Track, segment, and manage your customer base.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary"><Download size={16} /> Export</button>
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
              placeholder="Search customers..."
              className="w-full bg-transparent outline-none text-sm text-text-primary placeholder:text-text-secondary"
            />
          </label>

          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-text-secondary" />
            {statusFilters.map((s) => (
              <button key={s} onClick={() => setActiveStatus(s)} className={activeStatus === s ? "filter-pill-active" : "filter-pill"}>{s}</button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {countryFilters.map((c) => (
              <button key={c} onClick={() => setActiveCountry(c)} className={activeCountry === c ? "filter-pill-active" : "filter-pill"}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      <section className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-cyan-accent text-navy-900 text-left text-xs uppercase tracking-wider">
              <tr>
                {["Customer", "Email", "Country", "Bookings", "Total Spent", "Status", "Actions"].map((c) => (
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
                    <p className="text-text-secondary font-semibold">No customers found</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {query ? "Try a different search." : "No customers have been registered yet."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((c) => (
                  <tr key={c.id ?? c.email} className="table-row">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-cyan-accent/15 flex items-center justify-center text-cyan-accent text-xs font-bold">
                          {initials(c.name)}
                        </div>
                        <span className="font-medium">{c.name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-text-secondary">{c.email || "—"}</td>
                    <td className="px-5 py-4">{c.country || "—"}</td>
                    <td className="px-5 py-4 text-cyan-accent font-semibold">{c.totalBookings ?? 0}</td>
                    <td className="px-5 py-4 text-badge-green font-semibold">{money(c.totalSpent)}</td>
                    <td className="px-5 py-4"><span className={statusBadge[c.status] || "badge-orange"}>{c.status || "—"}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openModal("view", c)} className="text-xs text-cyan-accent hover:underline">View</button>
                        <button onClick={() => openModal("edit", c)} className="text-xs text-text-secondary hover:text-badge-orange transition">Edit</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onPage={setPage}
        />
      </section>

      <CrudModal
        open={modal.open}
        onClose={() => setModal({ open: false, mode: "add", data: null })}
        title={modal.mode === "edit" ? "Edit Customer" : "Customer Details"}
        mode={modal.mode}
        fields={modalFields}
        data={modal.data || {}}
        onSave={handleSave}
        saving={saving}
      />
    </>
  );
}
