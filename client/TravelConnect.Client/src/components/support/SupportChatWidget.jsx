import { useState, useEffect, useRef } from "react";
import { Headset, X, Send, Paperclip, MessageSquare, RefreshCw, Crown, LifeBuoy, ShoppingBag, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supportApi } from "../../services/api";
import { TIER_QUICK_QUESTIONS } from "../../data/tierQuickReplies";

const WELCOME = {
  role: "agent",
  body: "Hi! You're chatting with the TravelConnect support team. Tell us how we can help.",
  at: new Date().toISOString(),
};

// A customer picks a topic when they start a chat. The topic becomes the
// conversation Category, which routes each thread to the right admin inbox:
//   • Subscription → Super Admin (Tier Support Hub)
//   • Problem / General → Agency Admin (Agency Support Hub)
const TOPICS = [
  {
    key: "General",
    label: "General Support",
    subject: "General support request",
    desc: "Site questions or help with a booking",
    icon: LifeBuoy,
  },
  {
    key: "Subscription",
    label: "Agency & Tier Plan",
    subject: "Agency subscription & tier inquiry",
    desc: "Tiers, pricing, or account upgrades",
    icon: Crown,
  },
  {
    key: "Problem",
    label: "Refund / Problem",
    subject: "Refund or booking problem",
    desc: "Refunds, cancellations, or issues",
    icon: ShoppingBag,
  },
];

const HEADER_NOTE = {
  Subscription: "Handled by the Super Admin",
  Problem: "Handled by our Agency Admin",
  General: "Typically replies in minutes",
};

/**
 * Floating Customer Support Chat — a small bubble that anyone can open,
 * plus the full Experience (page/route) wired by the Support page.
 *
 * Guests pick a topic first; if they're not signed in the sign-in modal
 * opens and the thread they chose is resumed after they authenticate.
 */
export function SupportChatWidget() {
  const { isLoggedIn, user, openLoginModal } = useAuth();
  const [open, setOpen] = useState(false);
  const [conv, setConv] = useState(null); // active conversation
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadPing, setUnreadPing] = useState(false);
  const pendingRef = useRef(null);
  const listEndRef = useRef(null);

  // The full /support page can open the bubble too.
  useEffect(() => {
    const openBubble = () => setOpen(true);
    window.addEventListener("tc:opensupport", openBubble);
    return () => window.removeEventListener("tc:opensupport", openBubble);
  }, []);

  // Poll for admin replies while the bubble is closed so the client gets a
  // red ping the moment there's a new message (e.g. a Super Admin replying
  // to their subscription inquiry). Polling pauses while the tab is hidden
  // so background tabs don't hammer the API, and refreshes on re-focus.
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

    const onVisibility = () => {
      if (!document.hidden) checkUnread();
    };
    document.addEventListener("visibilitychange", onVisibility);

    checkUnread();
    const timer = setInterval(() => {
      if (!document.hidden) checkUnread();
    }, 15000);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(timer);
    };
  }, [isLoggedIn, open]);

  // Auto-scroll to newest message.
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /** A topic chip was tapped: gate on login, then open/resume that thread. */
  const pickTopic = (topic) => {
    pendingRef.current = { subject: topic.subject, category: topic.key };
    if (!isLoggedIn) {
      openLoginModal();
      return;
    }
    sendFirst(topic.subject, topic.key);
  };

  /** Open (or resume) the customer's conversation by topic/category. */
  async function sendFirst(subject, category) {
    const cat = category || "General";
    setLoading(true);
    try {
      let id = conv?.id;
      if (!id) {
        const list = await supportApi.list();
        const prior =
          Array.isArray(list) &&
          list.find((c) => String(c.category || "").toLowerCase() === cat.toLowerCase());
        if (prior) id = prior.id;
      }
      if (!id) {
        const created = await supportApi.create({ subject, category: cat });
        id = created.id;
      }
      setConv({ id, category: cat });
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

  // Resume a draft thread after login (mirror of booking's pendingCheckout).
  useEffect(() => {
    if (isLoggedIn && pendingRef.current) {
      const resume = pendingRef.current;
      pendingRef.current = null;
      sendFirst(resume.subject, resume.category);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

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

  /** Send a pre-made tier question straight into the active Subscription thread. */
  async function sendQuickQuestion(question) {
    if (!conv?.id || !isLoggedIn) return;
    setSending(true);
    try {
      const msg = await supportApi.send(conv.id, {
        senderEmail: user?.email,
        body: question.message,
      });
      setMessages((m) => [...m, msg]);
    } catch (err) {
      console.warn("Quick question send failed:", err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Bubble toggle */}
      <button
        onClick={() => setOpen(!open)}
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
              <p className="text-[11px] text-white/80">
                {conv ? HEADER_NOTE[conv.category] || HEADER_NOTE.General : "Pick a topic to start"}
              </p>
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

          {/* Topic picker (before any conversation exists) */}
          {!conv && (
            <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                {isLoggedIn ? "What do you need help with?" : "Pick a topic, then sign in"}
              </p>
              {TOPICS.map((t) => {
                const TIcon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => pickTopic(t)}
                    className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#008fe5] hover:bg-[#008fe5]/5 transition"
                  >
                    <span className="w-8 h-8 rounded-lg bg-[#008fe5]/10 text-[#008fe5] flex items-center justify-center shrink-0">
                      <TIcon size={15} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100">{t.label}</span>
                      <span className="block text-[11px] text-slate-400 truncate">{t.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Composer */}
          {conv && (
            <>
              {conv.category === "Subscription" && (
                <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <p className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                    <Sparkles size={11} /> Common tier questions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {TIER_QUICK_QUESTIONS.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => sendQuickQuestion(q)}
                        disabled={sending || !isLoggedIn}
                        className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#008fe5] hover:text-[#008fe5] rounded-full px-3 py-1.5 transition disabled:opacity-40"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
            </>
          )}
        </div>
      )}
    </>
  );
}

/** Full-page support experience (route /support): opens the chat bubble. */
export function CustomerSupportExperience() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-14">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-[#008fe5] text-white flex items-center justify-center">
          <MessageSquare size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Customer Support</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Agency &amp; tier plans go to the Super Admin; refunds and booking problems go to your Agency Admin.
          </p>
        </div>
      </div>
      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center bg-white dark:bg-slate-900">
        <Headset size={34} className="mx-auto mb-3 text-[#008fe5]" />
        <p className="text-slate-600 dark:text-slate-300 mb-4">
          Tell us what you need and we'll route it to the right team.
        </p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("tc:opensupport"))}
          className="px-5 py-2.5 rounded-full bg-[#008fe5] hover:bg-[#0079c4] text-white text-sm font-semibold transition"
        >
          Open the chat
        </button>
      </div>
    </div>
  );
}