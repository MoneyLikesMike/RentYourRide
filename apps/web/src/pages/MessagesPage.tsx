import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ApiError } from '../api/http';
import {
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
  type ChatMessage,
  type Conversation,
} from '../api/messaging';
import { useAuth } from '../auth/AuthContext';
import { useMessagingUnread } from '../auth/MessagingUnreadContext';
import PageMeta from '../components/PageMeta';
import SiteHeader from '../components/SiteHeader';

const POLL_MS = 8000;

function initials(name: string): string {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

function formatMessageTime(ts: number): string {
  const d = new Date(ts);
  const hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const h12 = ((hours + 11) % 12) + 1;
  return `${h12}:${mins} ${suffix}`;
}

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type ThreadItem =
  | { kind: 'day'; id: string; label: string }
  | { kind: 'message'; message: ChatMessage };

function withDaySeparators(messages: ChatMessage[]): ThreadItem[] {
  if (!messages.length) return [];
  const out: ThreadItem[] = [];
  let lastDay = '';
  for (const msg of messages) {
    const label = dayLabel(msg.createdAt);
    if (label !== lastDay) {
      out.push({ kind: 'day', id: `sep-${msg.id}`, label });
      lastDay = label;
    }
    out.push({ kind: 'message', message: msg });
  }
  return out;
}

function bookingStatusMeta(status: string | undefined): {
  label: string;
  tone: 'approved' | 'requested' | 'complete' | 'neutral';
} {
  switch (status) {
    case 'pending_host':
      return { label: 'Requested', tone: 'requested' };
    case 'confirmed':
    case 'checkin_pending':
    case 'active':
    case 'extension_pending':
    case 'checkout_pending':
      return { label: 'Approved', tone: 'approved' };
    case 'completed':
      return { label: 'Complete', tone: 'complete' };
    case 'declined':
      return { label: 'Declined', tone: 'neutral' };
    case 'cancelled':
      return { label: 'Cancelled', tone: 'neutral' };
    default:
      return { label: status ? status.replace(/_/g, ' ') : 'Message', tone: 'neutral' };
  }
}

function Avatar({
  name,
  url,
  size = 70,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="msg-avatar"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="msg-avatar msg-avatar--placeholder"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials(name) || '?'}
    </span>
  );
}

export default function MessagesPage() {
  const { isAuthenticated, user } = useAuth();
  const { refreshUnread } = useMessagingUnread();
  const location = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadScrollRef = useRef<HTMLDivElement | null>(null);
  const currentUserId = user?.id;

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const threadItems = useMemo(() => withDaySeparators(messages), [messages]);

  const refreshList = useCallback(async () => {
    const rows = await listConversations();
    setConversations(rows);
    return rows;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      setError(null);
      try {
        const rows = await refreshList();
        if (cancelled) return;
        setSelectedId((prev) => prev ?? (rows[0]?.id ?? null));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Could not load messages',
          );
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, refreshList]);

  const loadThread = useCallback(async (conversationId: string) => {
    setLoadingThread(true);
    setError(null);
    try {
      const page = await listMessages(conversationId, { take: 80 });
      setMessages(page.messages || []);
      await markConversationRead(conversationId);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c,
        ),
      );
      void refreshUnread();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not load conversation',
      );
    } finally {
      setLoadingThread(false);
    }
  }, [refreshUnread]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void loadThread(selectedId);
  }, [selectedId, loadThread]);

  useEffect(() => {
    const el = threadScrollRef.current;
    if (!el) return;
    // Scroll only the thread pane — never the page (scrollIntoView jumps the window).
    el.scrollTop = el.scrollHeight;
  }, [messages.length, selectedId]);

  useEffect(() => {
    if (!isAuthenticated || !selectedId) return;
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const page = await listMessages(selectedId, { take: 80 });
          setMessages(page.messages || []);
          const rows = await refreshList();
          setConversations(rows);
        } catch {
          /* ignore poll errors */
        }
      })();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [isAuthenticated, selectedId, refreshList]);

  const onSend = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    setError(null);
    try {
      const sent = await sendMessage(selectedId, text);
      setDraft('');
      setMessages((prev) => [...prev, sent]);
      await refreshList();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not send message',
      );
    } finally {
      setSending(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ backgroundLocation: location, from: '/messages' }}
      />
    );
  }

  return (
    <div className="messages-page">
      <PageMeta title="Messages | Rent Your Ride" noindex />
      <SiteHeader />
      <div className="messages-shell">
        <h1 className="messages-title">Messages</h1>
        <hr className="messages-header-rule" />

        <div className="messages-body">
        <aside className="messages-list-pane">
          {loadingList ? (
            <p className="messages-muted">Loading conversations…</p>
          ) : conversations.length === 0 ? (
            <div className="messages-empty-panel">
              <img src="/messages.png" alt="" className="messages-empty-icon" />
              <p>You don’t have any messages yet.</p>
              <Link to="/find-your-car" className="messages-empty-link">
                Find a ride
              </Link>
            </div>
          ) : (
            <ul className="messages-conv-list">
              {conversations.map((c) => {
                const active = c.id === selectedId;
                const status = bookingStatusMeta(c.bookingSnapshot?.status);
                const preview =
                  c.lastMessage?.type === 'system'
                    ? c.lastMessage.text
                    : c.lastMessage
                      ? c.lastMessage.senderUserId === currentUserId
                        ? `You: ${c.lastMessage.text}`
                        : c.lastMessage.text
                      : 'Start the conversation';
                const unread = c.unreadCount > 0;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={`messages-conv${active ? ' is-active' : ''}${unread ? ' is-unread' : ''}`}
                      onClick={() => setSelectedId(c.id)}
                    >
                      <span className="messages-conv-avatar-wrap">
                        <Avatar
                          name={c.counterpart.fullName}
                          url={c.counterpart.avatarUrl}
                        />
                        {unread ? (
                          <span className="messages-unread-dot" aria-hidden />
                        ) : null}
                      </span>
                      <span className="messages-conv-body">
                        <span className="messages-conv-top">
                          <span className="messages-conv-name">
                            {c.counterpart.fullName}
                          </span>
                          {unread ? (
                            <span className="messages-new-badge">New</span>
                          ) : null}
                        </span>
                        <span
                          className={`messages-conv-status messages-conv-status--${status.tone}`}
                        >
                          {status.label}
                        </span>
                        <span className="messages-conv-preview">{preview}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="messages-thread-pane" aria-live="polite">
          {!selectedId ? (
            <div className="messages-thread-empty">
              <p>Select a conversation to start messaging.</p>
            </div>
          ) : (
            <>
              <div className="messages-thread-scroll" ref={threadScrollRef}>
                {loadingThread && messages.length === 0 ? (
                  <p className="messages-muted">Loading messages…</p>
                ) : messages.length === 0 ? (
                  <p className="messages-muted">
                    No messages yet — say hello to start the conversation.
                  </p>
                ) : (
                  threadItems.map((item) => {
                    if (item.kind === 'day') {
                      return (
                        <div key={item.id} className="messages-day-sep">
                          <span className="messages-day-sep-line" aria-hidden />
                          <span className="messages-day-sep-label">
                            {item.label}
                          </span>
                          <span className="messages-day-sep-line" aria-hidden />
                        </div>
                      );
                    }
                    const msg = item.message;
                    const isMine =
                      msg.type !== 'system' &&
                      !!currentUserId &&
                      msg.senderUserId === currentUserId;
                    const isSystem = msg.type === 'system';
                    const name = isSystem
                      ? 'RentYourRide'
                      : isMine
                        ? 'You'
                        : selected?.counterpart.fullName || 'User';
                    const avatarUrl = isMine
                      ? user?.avatarUrl
                      : selected?.counterpart.avatarUrl;
                    return (
                      <article
                        key={msg.id}
                        className={`messages-bubble-row${isSystem ? ' is-system' : ''}${isMine ? ' is-mine' : ''}`}
                      >
                        {!isMine ? (
                          <Avatar name={name} url={avatarUrl} size={70} />
                        ) : (
                          <span className="msg-avatar-spacer" aria-hidden />
                        )}
                        <div className="messages-bubble-body">
                          <header className="messages-bubble-meta">
                            <span className="messages-bubble-name">{name}</span>
                            <time
                              className="messages-bubble-time"
                              dateTime={new Date(msg.createdAt).toISOString()}
                            >
                              {formatMessageTime(msg.createdAt)}
                            </time>
                          </header>
                          <p className="messages-bubble-text">{msg.text}</p>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>

              <form className="messages-composer" onSubmit={onSend}>
                <input
                  className="messages-composer-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Enter your message"
                  maxLength={2000}
                  disabled={sending}
                  aria-label="Message"
                />
                <button
                  type="submit"
                  className="messages-send"
                  disabled={sending || !draft.trim()}
                >
                  {sending ? '…' : 'Send'}
                </button>
              </form>
            </>
          )}
        </section>
        </div>
      </div>

      {error ? <p className="messages-error">{error}</p> : null}
    </div>
  );
}
