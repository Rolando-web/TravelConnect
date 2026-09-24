import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Inbox, RefreshCw, Send, LifeBuoy, Headset, CheckCircle, CloudOff } from "lucide-react";
import { supportAdminApi } from "../../services/api";
import StatCard from "../../components/admin/StatCard";

/**
 * Agency Support Hub — the agency owner's customer problem workspace.
 *   • Customer Problems (refunds, general issues) → handled by Agency Admin
 *
 * The backend enforces the split (an agency's problems ⇒ Agency Admin only;
 * Subscription/tier inquiries ⇒ Super Admin only), so the Super Admin has
 * no authority over this agency's customer problems.
 */
const STATUS_BADGE = {
  Open: "badge-orange",
  Replied: "badge-cyan",
  Resolved: "badge-green",
  Closed: "badge-red",
};

const STATUSES = ["Open", "Replied", "Resolved", "Closed"];

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "—";
}

export default function AgencySupportHubPage() {
  const { role } = useOutletContext();
  const isAgencyAdmin = role === "Agency Admin";

  const [convos, setConvos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [loadErrorKind, setLoadErrorKind] = useState(null);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  };

  // No explicit category: the backend scopes the inbox to the role's own
  // view — the Agency Admin sees the agency's customer problems and is never
  // handed the tier (Subscription) threads owned by the Super Admin.
  const load = async () => {
    try {
      const data = await supportAdminApi.inbox("");
      setConvos(Array.isArray(data) ? data : []);
      setLoadError(null);
      setLoadErrorKind(null);
    } catch (err) {
      const msg = err.message || "Failed to load the support inbox";
      const offline = /failed to fetch|network error|abort|404|502|503|504/i.test(msg);
      console.warn("Failed to load support inbox:", msg);
      setConvos([]);
      setLoadError(msg);
      setLoadErrorKind(offline ? "offline" : "error");
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    setLoading(true);
    load();
  };

  useEffect(() => {
    load();
  }, []);

  const openThread = async (id) => {
    setSelected(id);
    setThreadLoading(true);
    setThread(null);
    try {
      const data = await supportAdminApi.thread(id);
      setThread(data);
      try {
        await supportAdminApi.read(id);
        await load(false);
      } catch {
        /* keep thread usable even if mark-read fails */
      }
    } catch (err) {
      setThread(null);
      showToast(err.message || "Failed to load thread");
    } finally {
      setThreadLoading(false);
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      await supportAdminApi.reply(selected, { body: reply.trim() });
      setReply("");
      await openThread(selected);
      await load(false);
      showToast("Reply sent to the customer's chat");
    } catch (err) {
      showToast(err.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (status) => {
    if (!selected) return;
    try {
      await supportAdminApi.status(selected, { status });
      await openThread(selected);
      await load(false);
    } catch (err) {
      showToast(err.message || "Failed to update status");
    }
  };

  const unreadCount = useMemo(
    () => convos.filter((c) => (c.unreadByAgent || 0) > 0).length,
    [convos]
  );

  if (!isAgencyAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-text-secondary">
        <Headset size={40} className="mb-3 opacity-50" />
        <p className="font-medium">This agency's customer problems are handled by the Agency Admin only.</p>
      </div>
    );
  }

  return (
    <>
      <section className="flex flex-wrap gap-4 items-start justify-between mb-7">
        <div>
          <p className="text-text-secondary text-sm">{role} &gt; Agency Support Hub</p>
          <h1 className="text-3xl font-black mt-1 font-serif">Agency Support Hub</h1>
          <p className="text-text-secondary mt-2">
            Your agency's customer problems (refunds &amp; general issues). The Super Admin only handles your tier plan.
          </p>
        </div>
        <button onClick={refresh} className="btn-primary">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </section>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-[#06D6A0] text-navy-900 text-sm font-bold px-5 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle size={16} /> {toast}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Inbox" value={convos.length} note="All threads" icon={Inbox} />
        <StatCard label="Unread" value={unreadCount} note="New messages" icon={LifeBuoy} />
        <StatCard label="Problem Handler" value="Agency Admin" note="This inbox" icon={Headset} />
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-4 items-start">
        {/* Conversation list */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-text-secondary flex items-center gap-2">
              <Inbox size={15} className="text-cyan-accent" /> Customer problems
            </h3>
            <button
              onClick={refresh}
              className="text-xs text-text-secondary hover:text-cyan-accent flex items-center gap-1"
              title="Refresh"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-xs text-text-secondary py-8 text-center">Loading conversations…</div>
          ) : loadError ? (
            <div className={`text-center py-8 ${loadErrorKind === "offline" ? "text-amber-400" : "text-badge-red"}`}>
              <CloudOff size={28} className={`mx-auto mb-2 ${loadErrorKind === "offline" ? "text-amber-400/70" : "text-badge-red/70"}`} />
              <p className="text-sm font-semibold leading-snug px-2">
                {loadErrorKind === "offline"
                  ? "The API server isn't reachable from this preview, so the inbox can't load right now."
                  : loadError}
              </p>
              <p className="text-xs mt-1.5 text-text-secondary">
                {loadErrorKind === "offline"
                  ? "This works once the backend is deployed to the API host — Refresh to retry."
                  : "Refresh to try again."}
              </p>
            </div>
          ) : convos.length === 0 ? (
            <div className="text-center py-10 text-text-secondary">
              <LifeBuoy size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No customer problems yet.</p>
              <p className="text-xs mt-1">New customer requests from your agency will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {convos.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openThread(c.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition border ${
                    selected === c.id
                      ? "bg-cyan-accent/10 border-cyan-accent/40"
                      : "bg-navy-900/50 border-navy-800 hover:bg-navy-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-[13px] font-semibold truncate">
                      <span className="w-6 h-6 rounded-full bg-[#06D6A0]/15 text-[#06D6A0] text-[10px] font-black inline-flex items-center justify-center shrink-0">
                        {initials(c.customerName || c.customerEmail)}
                      </span>
                      {c.subject || "Support request"}
                    </p>
                    {(c.unreadByAgent || 0) > 0 && (
                      <span className="shrink-0 bg-red-500 text-white rounded-full min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center text-[10px] font-bold">
                        {c.unreadByAgent}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5 truncate">
                    {c.customerName || c.customerEmail} · {c.lastMessagePreview || "no messages yet"}
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className={`text-[10px] font-bold ${STATUS_BADGE[c.status] || "badge-gray"}`}>{c.status || "Open"}</span>
                    <span className="text-[10px] text-text-secondary/60">
                      {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : ""}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Thread + reply pane */}
        <div className="card p-4 min-h-[420px]">
          {!selected ? (
            <div className="text-center py-20">
              <Headset size={40} className="mx-auto text-navy-700 mb-3" />
              <p className="text-sm text-text-secondary">
                Select a conversation to read the thread and reply.
              </p>
            </div>
          ) : threadLoading ? (
            <div className="text-center py-20 text-sm text-text-secondary">Loading thread…</div>
          ) : thread ? (
            <div>
              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h3 className="text-base font-bold">{thread.subject || "Support request"}</h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {thread.customerName || "Customer"} · {thread.customerEmail}
                  </p>
                </div>
                <select
                  value={thread.status || "Open"}
                  onChange={(e) => setStatus(e.target.value)}
                  className={`text-[11px] font-bold ${STATUS_BADGE[thread.status] || "badge-orange"} outline-none cursor-pointer`}
                  title="Set status"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3 mb-4 max-h-[340px] overflow-y-auto pr-1">
                {Array.isArray(thread.messages) && thread.messages.length > 0 ? (
                  thread.messages.map((m, i) => {
                    const isAgent = String(m.senderType || "").toLowerCase() === "agent";
                    return (
                      <div key={m.id ?? i} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-snug ${
                            isAgent
                              ? "bg-cyan-accent text-white rounded-br-md"
                              : "bg-navy-800 text-slate-100 rounded-bl-md"
                          }`}
                        >
                          <p className="text-[10px] font-semibold mb-1 opacity-80">
                            {m.senderName || m.senderEmail || (isAgent ? "You" : "Customer")}
                          </p>
                          {m.body}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-text-secondary text-center py-8">No messages yet.</div>
                )}
              </div>

              <div className="flex items-center gap-2 border-t border-navy-700 pt-3">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={2}
                  placeholder="Reply as Agency Admin…"
                  className="flex-1 px-3 py-2 rounded-xl bg-navy-900 border border-navy-700 text-sm placeholder:text-text-secondary focus:outline-none focus:border-cyan-accent resize-none"
                />
                <div className="shrink-0">
                  <button
                    onClick={sendReply}
                    disabled={sending || !reply.trim()}
                    className="h-9 px-3.5 rounded-xl bg-cyan-accent hover:bg-cyan-accent/80 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition"
                    title="Send as a chat message (customer's support bubble)"
                  >
                    <Send size={13} /> Chat
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-sm text-text-secondary">Couldn't load this thread.</div>
          )}
        </div>
      </div>
    </>
  );
}