import { useState, useEffect, useRef } from "react";
import { Headset, X, Send, Paperclip, MessageSquare, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useBooking } from "../../context/BookingContext";
import { supportApi } from "../../services/api";

const DEFAULT_SUBJECT = "General support request";
const WELCOME = {
  role: "agent",
  body: "Hi! You're chatting with the TravelConnect support team. Tell us how we can help.",
  at: new Date().toISOString(),
};

/**
 * Floating Customer Support Chat — a small bubble that anyone can open,
 * plus the full Experience (page/route) wired by the Support page.
 *
 * Login gate: same pattern as booking checkout — guests get the sign-in
 * modal opened and the thread they were typing is resumed automatically
 * after they authenticate.
 */
export function SupportChatWidget() {
  const { isLoggedIn, user, openLoginModal } = useAuth();
  const { openLoginModal: _unused0 } = useBooking(); // keep bundle tree-shakeable
  const [open, setOpen] = useState(false);
  const [conv, setConv] = useState(null); // active conversation
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadPing, setUnreadPing] = useState(false);
  const pendingRef = useRef(null);
  const listEndRef = useRef(null);

  // Poll for admin replies while the bubble is closed so the client gets a
  // red ping the moment there's a new message (e.g. a Super Admin replying
  // to their subscription inquiry).
  useEffect(() => {
    if (!isLoggedIn || open) return;
    let cancelled = false;

    const checkUnread = async () => {
      try {
        const list = await supportApi.list();
        if (cancelled) return;
        const hasUnread = Array.isArray(list) && list.some((c) => (c.unreadByCustomer || 0) > 0);
        setUnreadPing(hasUnread);
      } catch {
        /* ignore polling errors */
      }
    };

    checkUnread();
    const timer = setInterval(checkUnread, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isLoggedIn, open]);

  // Resume a draft thread after login (mirror of booking's pendingCheckout).
  useEffect(() => {
    if (isLoggedIn && pendingRef.current) {
      const resume = pendingRef.current;
      pendingRef.current = null;
      sendFirst(resume.subject);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Auto-scroll to newest message.
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ensureSession = async (subject = DEFAULT_SUBJECT) => {
    if (!isLoggedIn) {
      pendingRef.current = { subject };
      openLoginModal();
      return null;
    }
    return sendFirst(subject);
  };

  /** Open (or resume) the customer's conversation: first create if new. */
  async function sendFirst(subject) {
    setLoading(true);
    try {
      let id = conv?.id;
      if (!id) {
        const list = await supportApi.list();
        if (Array.isArray(list) && list.length > 0) {
          id = list[0].id;
        }
        if (!id) {
          const created = await supportApi.create({ subject });
          id = created.id;
        }
      }
      setConv({ id });
      const thread = await supportApi.thread(id);
      setMessages(Array.isArray(thread.messages) ? thread.messages : []);
      try {
        await supportApi.markRead(id);
        setUnreadPing(false);
      } catch {
        /* keep thread usable even if mark-read fails */
      }
    } catch (err) {
      console.warn("Support session error:", err.message);
      setMessages([WELCOME]);
    } finally {
      setLoading(false);
      setOpen(true);
    }
  }

  async function handleSend() {
    const text = draft.trim();
    if (!text || !conv?.id) return;
    setSending(true);
    try {
      const msg = await supportApi.send(conv.id, { senderEmail: user?.email, body: text });
      setMessages((m) => [...m, msg]);
      setDraft("");
    } catch (err) {
      console.warn("Send failed:", err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Bubble toggle */}
      <button
        onClick={() => {
          if (!open) ensureSession();
          else setOpen(false);
        }}
        aria-label="Chat with customer support"
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-[#008fe5] hover:bg-[#0079c4] text-white shadow-2xl flex items-center justify-center transition-transform hover:scale-105"
      >
        {open ? <X size={22} /> : <Headset size={24} />}
        {!open && unreadPing && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            ●
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-22 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm h-[480px] max-h-[70vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#008fe5] text-white">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Headset size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold leading-tight">TravelConnect Support</p>
              <p className="text-[11px] text-white/80">Typically replies in minutes</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white" aria-label="Close chat">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-slate-50 dark:bg-slate-950/40">
            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <RefreshCw size={13} className="animate-spin" /> Loading your conversation…
              </div>
            )}
            {!loading &&
              (messages.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-6">
                  Start a support conversation — we're here to help.
                </div>
              ) : (
                messages.map((m, i) => {
                  const mine = String(m.senderType || m.senderRole || "").toLowerCase() === "customer";
                  return (
                    <div key={m.id ?? i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13px] leading-snug ${
                          mine
                            ? "bg-[#008fe5] text-white rounded-br-sm"
                            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm"
                        }`}
                      >
                        {m.body}
                        <div className={`mt-1 text-[9px] ${mine ? "text-white/70" : "text-slate-400"}`}>
                          {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "now"}
                        </div>
                      </div>
                    </div>
                  );
                })
              ))}
            <div ref={listEndRef} />
          </div>

          {/* Composer */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <Paperclip size={18} className="text-slate-400" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={isLoggedIn ? "Type your message…" : "Sign in to start chatting…"}
              disabled={!isLoggedIn}
              className="flex-1 text-[13px] px-3 py-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#008fe5]/40"
            />
            <button
              onClick={handleSend}
              disabled={!isLoggedIn || sending || !draft.trim()}
              className="w-9 h-9 rounded-full bg-[#008fe5] hover:bg-[#0079c4] text-white flex items-center justify-center disabled:opacity-40 transition"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Full-page support experience (route /support): same thread, roomier layout. */
export function SupportPage() {
  const { isLoggedIn, user, openLoginModal } = useAuth();
  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-[#008fe5] text-white flex items-center justify-center">
          <MessageSquare size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Customer Support</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Chat with our travel specialists — replies in minutes.</p>
        </div>
      </div>
      {!isLoggedIn ? (
        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-10 text-center bg-white dark:bg-slate-900">
          <p className="text-slate-600 dark:text-slate-300 mb-4">Sign in to chat with our support team.</p>
          <button
            onClick={openLoginModal}
            className="px-5 py-2.5 rounded-full bg-[#008fe5] hover:bg-[#0079c4] text-white text-sm font-semibold transition"
          >
            Sign in to chat
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-slate-500">Open the chat bubble (bottom-right) to start a conversation.</p>
        </div>
      )}
    </div>
  );
}
