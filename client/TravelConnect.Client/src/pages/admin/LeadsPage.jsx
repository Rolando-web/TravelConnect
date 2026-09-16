import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Download, Plus, Search, SlidersHorizontal, Inbox, UserCheck, Info, ChevronRight, XCircle, TrendingUp } from "lucide-react";
import { leadsApi, convertLeadToCustomer, setLeadStage } from "../../services/api";
import CrudModal from "../../components/admin/CrudModal";
import StatCard from "../../components/admin/StatCard";
import Pagination from "../../components/admin/Pagination";

const PIPELINE = ["New", "Contacted", "Qualified", "Proposal", "Negotiation"];

const stageBadge = {
  New: "badge-orange",
  Contacted: "badge-cyan",
  Qualified: "badge-purple",
  Proposal: "badge-cyan",
  Negotiation: "badge-orange",
  Won: "badge-green",
  Lost: "badge-red",
};

const stageOrder = {
  New: 0,
  Contacted: 1,
  Qualified: 2,
  Proposal: 3,
  Negotiation: 4,
  Won: 5,
  Lost: 5,
};

const SOURCES = ["Manual", "Website", "Checkout", "Referral", "Partner", "Walk-in"];

const stageFilters = ["All", ...PIPELINE, "Won", "Lost"];

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "—";
}

function money(v) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(v ?? 0);
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
  const [busyId, setBusyId] = useState(null);
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

  const handleStage = async (lead, stage) => {
    if (busyId) return;
    if (stage === "Lost" && !window.confirm(`Mark "${lead.name || lead.email}" as Lost?`)) return;
    setBusyId(lead.id);
    try {
      await setLeadStage(lead.id, stage);
      load();
    } catch (err) {
      alert(err.message || "Failed to update stage");
    } finally {
      setBusyId(null);
    }
  };

  const handleConvert = async (lead) => {
    if (busyId) return;
    if (!window.confirm(`Convert "${lead.name || lead.email}" to a Customer?`)) return;
    setBusyId(lead.id);
    try {
      const res = await convertLeadToCustomer(lead.id);
      alert(res?.message || "Lead converted to customer");
      setLoading(true);
      load();
    } catch (err) {
      alert(err.message || "Failed to convert lead");
    } finally {
      setBusyId(null);
    }
  };

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (modal.mode === "add") await leadsApi.create({ ...form, worth: Number(form.worth || 0) });
      else await leadsApi.update(modal.data.id, { ...form, id: modal.data.id, worth: Number(form.worth || 0) });
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
    { key: "source", label: "Source", type: "select", options: SOURCES },
    { key: "stage", label: "Stage", type: "select", options: stageFilters.slice(1) },
    { key: "worth", label: "Potential Value (₱)", type: "number" },
    { key: "nextFollowUp", label: "Next Follow-up", type: "date" },
    { key: "assignedTo", label: "Assigned To" },
    { key: "lastContact", label: "Last Contact", type: "date" },
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

  useEffect(() => { setPage(1); }, [query, activeStage, activeAgent]);

  const stageCount = (s) => leads.filter((l) => l.stage === s).length;
  const openValue = leads
    .filter((l) => stageOrder[l.stage] != null && stageOrder[l.stage] < 5)
    .reduce((s, l) => s + Number(l.worth || 0), 0);

  const stats = [
    ["Pipeline Value", money(openValue), "Open deals"],
    ["Total Leads", leads.length.toLocaleString(), "All time"],
    ["Active Stage", stageCount("Contacted") + stageCount("Qualified") + stageCount("Proposal") + stageCount("Negotiation"), "In progress"],
    ["Won / Lost", `${stageCount("Won")} / ${stageCount("Lost")}`, "Closed outcomes"],
  ];

  return (
    <>
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; CRM & Leads</p>
          <h1 className="text-3xl font-black mt-1 font-serif">CRM & Lead Management</h1>
          <p className="text-text-secondary mt-2">Move leads through the sales pipeline from first contact to close.</p>
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
          <span className="font-bold text-cyan-accent">How the pipeline works:</span> leads are entered manually or
          auto-created from website &amp; checkout messages. Sales reps advance them
          <span className="font-semibold"> New → Contacted → Qualified → Proposal → Negotiation</span>, then close as
          <span className="font-semibold"> Won</span> (converts to a Customer) or <span className="font-semibold"> Lost</span>.
          A paid booking also closes the matching lead as Won automatically.
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
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-cyan-accent text-navy-900 text-left text-xs uppercase tracking-wider">
              <tr>
                {["Lead", "Email / Interest", "Stage", "Source", "Value", "Next Follow-up", "Assigned", "Actions"].map((c) => (
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
                    <p className="text-text-secondary font-semibold">No leads found</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {query ? "Try a different search." : "No leads have been recorded yet."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((l) => {
                  const isClosed = l.stage === "Won" || l.stage === "Lost";
                  const idx = PIPELINE.indexOf(l.stage);
                  const nextStage = idx >= 0 && idx < PIPELINE.length - 1 ? PIPELINE[idx + 1] : null;
                  return (
                    <tr key={l.id ?? l.email} className="table-row">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-badge-green/15 flex items-center justify-center text-badge-green text-xs font-bold">{initials(l.name)}</div>
                          <span className="font-medium">{l.name || "—"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="block text-text-secondary">{l.email || "—"}</span>
                        <span className="block text-xs text-text-secondary/70">{l.interest || ""}</span>
                      </td>
                      <td className="px-5 py-4"><span className={stageBadge[l.stage] || "badge-orange"}>{l.stage || "—"}</span></td>
                      <td className="px-5 py-4 text-text-secondary">{l.source || "Manual"}</td>
                      <td className="px-5 py-4"><span className="flex items-center gap-1 font-mono text-xs"><TrendingUp size={13} className="text-badge-green" /> {money(l.worth)}</span></td>
                      <td className="px-5 py-4 text-text-secondary font-mono text-xs">{l.nextFollowUp || "—"}</td>
                      <td className="px-5 py-4 text-text-secondary">{l.assignedTo || "—"}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openModal("view", l)} className="text-xs text-cyan-accent hover:underline">View</button>
                          <button onClick={() => openModal("edit", l)} className="text-xs text-text-secondary hover:text-badge-orange transition">Edit</button>
                          {!isClosed && (
                            <>
                              <button onClick={() => handleStage(l, nextStage || "Won")} disabled={busyId === l.id} className="text-xs text-cyan-accent hover:underline disabled:opacity-50 flex items-center gap-0.5">
                                {busyId === l.id ? <span className="w-3.5 h-3.5 border-2 border-cyan-accent border-t-transparent rounded-full animate-spin" /> : <ChevronRight size={13} />}
                                {nextStage ? `Move to ${nextStage}` : "Close Won"}
                              </button>
                              <button onClick={() => handleConvert(l)} disabled={busyId === l.id} className="text-xs text-badge-green hover:underline disabled:opacity-50 flex items-center gap-1">
                                <UserCheck size={13} /> Convert
                              </button>
                              <button onClick={() => handleStage(l, "Lost")} disabled={busyId === l.id} className="text-xs text-badge-red hover:underline disabled:opacity-50 flex items-center gap-0.5">
                                <XCircle size={13} /> Lost
                              </button>
                            </>
                          )}
                          {l.stage === "Won" && <span className="text-xs text-badge-green font-semibold">Converted ✓</span>}
                          {l.stage === "Lost" && <button onClick={() => handleStage(l, "New")} disabled={busyId === l.id} className="text-xs text-text-secondary hover:underline disabled:opacity-50">Reopen</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })
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