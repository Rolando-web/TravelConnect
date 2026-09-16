import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Download, Plus, Search, SlidersHorizontal, Inbox, UserCheck, Info } from "lucide-react";
import { leadsApi, convertLeadToCustomer } from "../../services/api";
import CrudModal from "../../components/admin/CrudModal";
import StatCard from "../../components/admin/StatCard";
import Pagination from "../../components/admin/Pagination";

const stageBadge = {
  New: "badge-orange",
  Qualified: "badge-cyan",
  Proposal: "badge-purple",
  Negotiation: "badge-orange",
  "Closed Won": "badge-green",
};

const stageFilters = ["All", "New", "Qualified", "Proposal", "Negotiation", "Closed Won"];

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "—";
}

export default function LeadsPage() {
  const { role } = useOutletContext();
  const [query, setQuery] = useState("");
  const [activeStage, setActiveStage] = useState("All");
  const [activeAgent, setActiveAgent] = useState("All");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: "add", data: null });
  const [saving, setSaving] = useState(false);
  const [convertingId, setConvertingId] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const load = () => {
    leadsApi
      .list()
      .then((d) => setLeads(Array.isArray(d) ? d : []))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = (mode, data = null) => setModal({ open: true, mode, data });

  const handleConvert = async (lead) => {
    if (convertingId) return;
    if (!window.confirm(`Convert "${lead.name || lead.email}" to a Customer?`)) return;
    setConvertingId(lead.id);
    try {
      const res = await convertLeadToCustomer(lead.id);
      alert(res?.message || "Lead converted to customer");
      setLoading(true);
      load();
    } catch (err) {
      alert(err.message || "Failed to convert lead");
    } finally {
      setConvertingId(null);
    }
  };

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal.mode === "add") await leadsApi.create(form);
      else await leadsApi.update(modal.data.id, { ...form, id: modal.data.id });
      setModal({ open: false, mode: "add", data: null });
      setLoading(true);
      load();
    } catch (err) {
      alert(err.message || "Failed to save lead");
    } finally {
      setSaving(false);
    }
  };

  const modalFields = [
    { key: "name", label: "Name", required: true },
    { key: "email", label: "Email", required: true },
    { key: "phone", label: "Phone" },
    { key: "interest", label: "Interest" },
    { key: "stage", label: "Stage", type: "select", options: ["New", "Qualified", "Proposal", "Negotiation", "Closed Won"] },
    { key: "assignedTo", label: "Assigned To" },
    { key: "lastContact", label: "Last Contact" },
    { key: "notes", label: "Notes", type: "textarea", rows: 3 },
  ];

  const agentFilters = useMemo(
    () => ["All", ...new Set(leads.map((l) => l.assignedTo).filter(Boolean))],
    [leads]
  );

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchQuery =
        !query ||
        (l.name || "").toLowerCase().includes(query.toLowerCase()) ||
        (l.email || "").toLowerCase().includes(query.toLowerCase());
      const matchStage = activeStage === "All" || l.stage === activeStage;
      const matchAgent = activeAgent === "All" || l.assignedTo === activeAgent;
      return matchQuery && matchStage && matchAgent;
    });
  }, [leads, query, activeStage, activeAgent]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useMemo(() => setPage(1), [query, activeStage, activeAgent]);

  const stageCount = (s) => leads.filter((l) => l.stage === s).length;

  const stats = [
    ["Total Leads", leads.length.toLocaleString(), "In pipeline"],
    ["New", stageCount("New").toLocaleString(), "Awaiting contact"],
    ["Qualified", stageCount("Qualified").toLocaleString(), "Hot prospects"],
    ["Closed Won", stageCount("Closed Won").toLocaleString(), "Converted customer"],
  ];

  return (
    <>
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; CRM & Leads</p>
          <h1 className="text-3xl font-black mt-1 font-serif">CRM & Lead Management</h1>
          <p className="text-text-secondary mt-2">Track leads through the sales pipeline from inquiry to close.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary"><Download size={16} /> Export</button>
          <button onClick={() => openModal("add")} className="btn-primary"><Plus size={17} /> Add Lead</button>
        </div>
      </section>

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-cyan-accent/25 bg-cyan-accent/5 px-4 py-3.5">
        <span className="mt-0.5 w-8 h-8 shrink-0 grid place-items-center rounded-lg bg-cyan-accent/15 text-cyan-accent">
          <Info size={16} />
        </span>
        <p className="text-sm text-text-primary leading-relaxed">
          <span className="font-bold text-cyan-accent">How the pipeline works:</span> every inquiry sent from
          the website or booking checkout is logged under <span className="font-semibold">Inquiries</span> and
          automatically becomes a <span className="font-semibold">New</span> lead here (matched by email). When
          a traveler{"'"}s booking is paid, their lead is closed as <span className="font-semibold">Closed Won</span> and
          they appear under <span className="font-semibold">Customers</span>. You can also manually convert a lead with the
          <span className="font-semibold"> Convert</span> action below.
        </p>
      </div>

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
              placeholder="Search leads..."
              className="w-full bg-transparent outline-none text-sm text-text-primary placeholder:text-text-secondary"
            />
          </label>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-text-secondary" />
            <span className="text-xs text-text-secondary font-medium">STAGE</span>
            {stageFilters.map((s) => (
              <button key={s} onClick={() => setActiveStage(s)} className={activeStage === s ? "filter-pill-active" : "filter-pill"}>{s}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary font-medium">ASSIGNED</span>
            {agentFilters.map((a) => (
              <button key={a} onClick={() => setActiveAgent(a)} className={activeAgent === a ? "filter-pill-active" : "filter-pill"}>{a}</button>
            ))}
          </div>
        </div>
      </div>

      <section className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-cyan-accent text-navy-900 text-left text-xs uppercase tracking-wider">
              <tr>
                {["Lead", "Email", "Interest", "Stage", "Assigned", "Last Contact", "Actions"].map((c) => (
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
                    <p className="text-text-secondary font-semibold">No leads found</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {query ? "Try a different search." : "No leads have been recorded yet."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((l) => (
                  <tr key={l.id ?? l.email} className="table-row">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-badge-green/15 flex items-center justify-center text-badge-green text-xs font-bold">{initials(l.name)}</div>
                        <span className="font-medium">{l.name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-text-secondary">{l.email || "—"}</td>
                    <td className="px-5 py-4">{l.interest || "—"}</td>
                    <td className="px-5 py-4"><span className={stageBadge[l.stage] || "badge-orange"}>{l.stage || "—"}</span></td>
                    <td className="px-5 py-4 text-text-secondary">{l.assignedTo || "—"}</td>
                    <td className="px-5 py-4 text-text-secondary font-mono text-xs">{l.lastContact || "—"}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openModal("view", l)} className="text-xs text-cyan-accent hover:underline">View</button>
                        <button onClick={() => openModal("edit", l)} className="text-xs text-text-secondary hover:text-badge-orange transition">Edit</button>
                        {(l.stage || "New") !== "Closed Won" && (
                          <button
                            onClick={() => handleConvert(l)}
                            disabled={convertingId === l.id}
                            className="text-xs text-badge-green hover:underline disabled:opacity-50 flex items-center gap-1"
                          >
                            {convertingId === l.id ? (
                              <span className="w-3.5 h-3.5 border-2 border-badge-green border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <UserCheck size={13} /> Convert
                              </>
                            )}
                          </button>
                        )}
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
        title={modal.mode === "add" ? "Add Lead" : modal.mode === "edit" ? "Edit Lead" : "Lead Details"}
        mode={modal.mode}
        fields={modalFields}
        data={modal.data || {}}
        onSave={handleSave}
        saving={saving}
      />
    </>
  );
}
