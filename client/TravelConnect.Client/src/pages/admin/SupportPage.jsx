import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { MessageSquare, Plus, Send, Clock, CheckCircle, Inbox } from "lucide-react";
import { inquiriesApi } from "../../services/api";
import StatCard from "../../components/admin/StatCard";
import Pagination from "../../components/admin/Pagination";

const categoryTone = {
  Flight: "badge-cyan",
  Hotel: "badge-purple",
  Payment: "badge-green",
  Transport: "badge-orange",
  Activity: "badge-orange",
  General: "badge-cyan",
};

const statusIcon = {
  Pending: <Clock size={14} className="text-badge-orange" />,
  Replied: <CheckCircle size={14} className="text-badge-green" />,
  Resolved: <CheckCircle size={14} className="text-cyan-accent" />,
};

function dateStr(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function SupportPage() {
  const { role } = useOutletContext();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [form, setForm] = useState({
    subject: "",
    category: "General",
    message: "",
  });

  const load = (asLoading = true) => {
    if (asLoading) setLoading(true);
    inquiriesApi
      .list()
      .then((d) => setTickets(Array.isArray(d) ? d : []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    inquiriesApi
      .list()
      .then((d) => !cancelled && setTickets(Array.isArray(d) ? d : []))
      .catch(() => !cancelled && setTickets([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.message) return;
    const payload = {
      customerName: "Admin",
      customerEmail: "admin@travelconnect.ph",
      subject: form.subject,
      category: form.category,
      message: form.message,
      status: "Pending",
    };
    setForm({ subject: "", category: "General", message: "" });
    setShowForm(false);
    try {
      await inquiriesApi.create(payload);
      load(false);
      setExpandedId(null);
    } catch {
      const nextId = `INQ-${String(tickets.length + 1).padStart(3, "0")}`;
      setTickets((prev) => [{ ...payload, id: nextId, createdAt: new Date().toISOString(), reply: "" }, ...prev]);
    }
  };

  const pending = tickets.filter((t) => t.status === "Pending").length;
  const replied = tickets.filter((t) => t.status === "Replied").length;

  const totalPages = Math.max(1, Math.ceil(tickets.length / PAGE_SIZE));
  const paginated = tickets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <section className="mb-8">
        <p className="text-cyan-accent font-medium text-sm">{role}</p>
        <h1 className="text-3xl font-black mt-1">Support & Inquiries</h1>
        <p className="text-text-secondary mt-2">
          Submit and track your support requests.
        </p>
      </section>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {[
          ["Total Inquiries", tickets.length, "All submitted"],
          ["Pending", pending, "Awaiting response"],
          ["Replied", replied, "Response received"],
        ].map(([label, value, note]) => (
          <StatCard key={label} label={label} value={value} note={note} />
        ))}
      </div>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-accent/15 flex items-center justify-center text-cyan-accent">
              <MessageSquare size={18} />
            </div>
            <div>
              <h2 className="font-bold">New Inquiry</h2>
              <p className="text-sm text-text-secondary">
                Submit a support request
              </p>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            <Plus size={16} /> {showForm ? "Cancel" : "New Inquiry"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="border-t border-navy-700 pt-5 space-y-4"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-xs text-text-secondary">
                Subject
                <input
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  placeholder="Brief description of your issue"
                  className="mt-2 input-field"
                />
              </label>
              <label className="block text-xs text-text-secondary">
                Category
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="mt-2 input-field"
                >
                  <option>General</option>
                  <option>Flight</option>
                  <option>Hotel</option>
                  <option>Transport</option>
                  <option>Activity</option>
                  <option>Payment</option>
                </select>
              </label>
            </div>
            <label className="block text-xs text-text-secondary">
              Message
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                rows={4}
                placeholder="Describe your inquiry in detail..."
                className="mt-2 input-field resize-none"
              />
            </label>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary">
                <Send size={16} /> Submit Inquiry
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-navy-700">
          <h2 className="font-bold">My Inquiries</h2>
        </div>
        {loading ? (
          <div className="px-6 py-14 text-center text-text-secondary">Loading data...</div>
        ) : tickets.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Inbox size={36} className="mx-auto text-text-secondary mb-3" />
            <p className="text-text-secondary font-semibold">No inquiries yet</p>
            <p className="text-xs text-text-secondary mt-1">Submitted inquiries will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-navy-700">
            {paginated.map((ticket) => (
              <div
                key={ticket.id ?? ticket.subject}
                className="px-6 py-4 hover:bg-navy-700/30 transition"
              >
                <div
                  className="flex flex-wrap items-center gap-3 cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === ticket.id ? null : ticket.id)
                  }
                >
                  <span className="text-xs text-text-secondary font-mono w-16">
                    {ticket.id ? `#${ticket.id}` : "#INQ"}
                  </span>
                  <span className="font-medium text-sm flex-1">
                    {ticket.subject || "—"}
                  </span>
                  <span className={categoryTone[ticket.category] || "badge-cyan"}>
                    {ticket.category || "General"}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs">
                    {statusIcon[ticket.status] || <Clock size={14} className="text-badge-orange" />}
                    <span
                      className={
                        ticket.status === "Pending"
                          ? "text-badge-orange"
                          : "text-badge-green"
                      }
                    >
                      {ticket.status || "Pending"}
                    </span>
                  </span>
                  <span className="text-xs text-text-secondary">{dateStr(ticket.createdAt)}</span>
                </div>
                {expandedId === ticket.id && (
                  <div className="mt-4 ml-16 p-4 rounded-xl bg-navy-900 border border-navy-700">
                    <p className="text-xs text-text-secondary mb-2 font-medium">
                      {ticket.message ? "Message" : "Latest Response"}
                    </p>
                    <p className="text-sm text-text-primary">{ticket.reply || ticket.message || "—"}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          total={tickets.length}
          pageSize={PAGE_SIZE}
          onPage={setPage}
        />
      </div>
    </div>
  );
}
