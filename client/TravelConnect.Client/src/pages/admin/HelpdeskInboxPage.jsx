import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Inbox, Headset, Clock, Send, UserCheck } from "lucide-react";
import { supportAdminApi } from "../../services/api";
import StatCard from "../../components/admin/StatCard";

const STATUS_TONE = {
  Open: "badge-green",
  Replied: "badge-cyan",
  Resolved: "badge-green",
  Closed: "badge-red",
};

const STATUSES = ["Open", "Replied", "Resolved", "Closed"];

/**
 * Multi-agent helpdesk inbox.
 *
 * Super Admin / Agency Staff (role-accessable, tier-gated) work the same
 * shared inbox. "Assign" picks a specific support agent so each ticket has
 * a single owner (the user's "who assign in the support" requirement).
 * The "assignedToMe" toggle shows only tickets owned by the current agent.
 */
export default function HelpdeskInboxPage() {
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async (asLoading = true) => {
    if (asLoading) setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams();
      if (query) q.set("q", query);
      if (mineOnly) q.set("assignedToMe", "true");
      const data = await supportAdminApi.inbox(q.toString() ? `?${q}` : "");
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query, mineOnly]);

  const loadAgents = useCallback(async () => {
    try {
      const data = await supportAdminApi.agents();
      setAgents(Array.isArray(data) ? data : []);
    } catch {
      setAgents([]);
    }
  }, []);

  useEffect(() => {
    // Debounce search (each keystroke changes `load`'s identity). The inbox
    // shows a spinner anyway, so a 300ms delay avoids hammering the API.
    const t = window.setTimeout(() => { load(); }, 300);
    return () => window.clearTimeout(t);
  }, [load]);
  useEffect(() => { loadAgents(); }, [loadAgents]);

  const openThread = async (id) => {
    setSelected(id);
    setThreadLoading(true);
    setThread(null);
    try {
      const data = await supportAdminApi.thread(id);
      setThread(data);
    } catch (err) {
      setThread(null);
      setError(err.message);
      setTimeout(() => setError(""), 4000);
    } finally {
      setThreadLoading(false);
    }
  };

  const sendReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    try {
      await supportAdminApi.reply(selected, { body: replyText.trim() });
      setReplyText("");
      await openThread(selected);
      await load(false);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 4000);
    } finally {
      setSending(false);
    }
  };

  const assign = async (agentEmail) => {
    if (!selected) return;
    try {
      await supportAdminApi.assign(selected, {
        assigneeEmail: agentEmail,
        status: "Open",
      });
      await openThread(selected);
      await load(false);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 4000);
    }
  };

  const setStatus = async (status) => {
    if (!selected) return;
    try {
      await supportAdminApi.setStatus(selected, { status });
      await openThread(selected);
      await load(false);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 4000);
    }
  };

  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status === "Open" || t.status === "Replied").length;
    const mine = tickets.filter((t) => t.assigneeEmail && t.assigneeEmail !== "Unassigned").length;
    return { total: tickets.length, open, mine };
  }, [tickets]);

  const threadMessages = useMemo(() => {
    if (!thread) return [];
    return Array.isArray(thread.messages) ? thread.messages : [];
  }, [thread]);

  return (
    <div>
      <section className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          Multi-Agent Helpdesk
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Chat inbox — reply to customers and assign each ticket to a specific support agent.
        </p>
      </section>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Inbox" value={stats.total} note="All support threads" icon={Inbox} accent="text-[#008fe5]" />
        <StatCard label="Open / Replied" value={stats.open} note="Needs a reply" icon={Clock} accent="text-amber-500" />
        <StatCard label="Assigned" value={stats.mine} note="Owned by an agent" icon={UserCheck} accent="text-emerald-500" />
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-[340px_1fr] gap-5 items-start">
        {/* Inbox list */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Inbox size={15} className="text-[#008fe5]" /> Inbox
            </h2>
            <button
              onClick={() => load()}
              className="text-xs text-slate-400 hover:text-[#008fe5] flex items-center gap-1"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subject / customer…"
            className="w-full mb-3 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#008fe5]/40"
          />

          <label className="flex items-center gap-2 mb-3 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={mineOnly}
              onChange={(e) => setMineOnly(e.target.checked)}
              className="rounded accent-[#008fe5]"
            />
            Assigned to me only
          </label>

          {loading ? (
            <div className="text-xs text-slate-400 py-6 text-center">Loading inbox…</div>
          ) : tickets.length === 0 ? (
            <div className="text-xs text-slate-400 py-6 text-center">No tickets match.</div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openThread(t.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition ${
                    selected === t.id
                      ? "bg-[#008fe5]/10 ring-1 ring-[#008fe5]/40"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {t.subject || "Support request"}
                    </p>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${STATUS_TONE[t.status] || "badge-cyan"}`}>
                      {t.status || "Open"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {t.customerName} · {t.lastMessagePreview || "no messages yet"}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                    <span>{t.assigneeEmail && t.assigneeEmail !== "Unassigned" ? t.assigneeEmail : "Unassigned"}</span>
                    {t.unreadByAgent > 0 && (
                      <span className="bg-red-500 text-white rounded-full min-w-[16px] h-4 px-1 inline-flex items-center justify-center font-bold">
                        {t.unreadByAgent}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Thread pane */}
        <div className="card p-4 min-h-[420px]">
          {!selected ? (
            <div className="text-center py-24">
              <Headset size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-400">Select a conversation from the inbox to read and reply.</p>
            </div>
          ) : threadLoading ? (
            <div className="text-center py-24 text-sm text-slate-400">Loading thread…</div>
          ) : thread ? (
            <div>
              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {thread.subject || "Support request"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {thread.customerName} · {thread.customerEmail}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={thread.assigneeEmail || ""}
                    onChange={(e) => assign(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#008fe5]/40"
                  >
                    <option value="">Assign to…</option>
                    {agents.map((a) => (
                      <option key={a.email} value={a.email}>{a.name || a.email}</option>
                    ))}
                  </select>
                  <select
                    value={thread.status || "Open"}
                    onChange={(e) => setStatus(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#008fe5]/40"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-3 mb-4 max-h-[360px] overflow-y-auto pr-1">
                {threadMessages.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-8">No messages yet.</div>
                ) : (
                  threadMessages.map((m, i) => {
                    const isAgent = (m.senderType || "").toLowerCase() === "agent";
                    return (
                      <div key={m.id || i} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-snug ${
                            isAgent
                              ? "bg-[#008fe5] text-white rounded-br-md"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-md"
                          }`}
                        >
                          <p className="text-[10px] font-semibold mb-1 opacity-80">{m.senderName || m.senderEmail}</p>
                          {m.body}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply box */}
              <div className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-700 pt-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={2}
                  placeholder="Reply as agent…"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#008fe5]/40 resize-none"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !replyText.trim()}
                  className="shrink-0 h-10 px-4 rounded-xl bg-[#008fe5] hover:bg-[#0079c4] text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 transition"
                >
                  <Send size={14} /> Send
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-24 text-sm text-slate-400">Couldn't load this thread.</div>
          )}
        </div>
      </div>
    </div>
  );
}
