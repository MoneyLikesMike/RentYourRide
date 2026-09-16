import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import * as messagingApi from '../services/messagingApi';

const MessagingContext = createContext(null);

const REFRESH_INTERVAL_MS = 20000;

function conversationsEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (left.id !== right.id) return false;
    if ((left.unreadCount || 0) !== (right.unreadCount || 0)) return false;
    if (left.updatedAt !== right.updatedAt) return false;
    const leftLast = left.lastMessage;
    const rightLast = right.lastMessage;
    if (leftLast?.text !== rightLast?.text) return false;
    if (leftLast?.createdAt !== rightLast?.createdAt) return false;
    if (leftLast?.senderUserId !== rightLast?.senderUserId) return false;
  }
  return true;
}

export function MessagingProvider({ children }) {
  const { isAuthenticated, isReady } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(false);
  const inFlightRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !isReady) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const isInitialLoad = !hasLoadedRef.current;
    if (isInitialLoad) setInitialLoading(true);
    try {
      const rows = await messagingApi.listConversations();
      if (!Array.isArray(rows)) return;
      hasLoadedRef.current = true;
      setConversations((prev) => (conversationsEqual(prev, rows) ? prev : rows));
      const total = rows.reduce((sum, c) => sum + (Number(c.unreadCount) || 0), 0);
      setUnreadTotal((prev) => (prev === total ? prev : total));
    } catch (e) {
      // Non-fatal — leave last known state visible
      console.warn('[Messaging] refresh failed', e?.message || e);
    } finally {
      if (isInitialLoad) setInitialLoading(false);
      inFlightRef.current = false;
    }
  }, [isAuthenticated, isReady]);

  // Initial + polling refresh
  useEffect(() => {
    if (!isAuthenticated || !isReady) {
      setConversations([]);
      setUnreadTotal(0);
      hasLoadedRef.current = false;
      return undefined;
    }
    refresh();
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isAuthenticated, isReady, refresh]);

  // Refresh when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const openConversationForBooking = useCallback(
    async (bookingId) => {
      if (!bookingId) return null;
      try {
        const conv = await messagingApi.findOrCreateForBooking(bookingId);
        // Refresh in the background; caller can navigate immediately
        refresh();
        return conv;
      } catch (e) {
        console.warn('[Messaging] open conversation failed', e?.message || e);
        return null;
      }
    },
    [refresh],
  );

  const markRead = useCallback(
    async (conversationId) => {
      try {
        await messagingApi.markConversationRead(conversationId);
        setConversations((prev) => {
          const target = prev.find((c) => c.id === conversationId);
          if (!target || !target.unreadCount) return prev;
          return prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c));
        });
        setUnreadTotal((prev) => {
          const conv = conversations.find((c) => c.id === conversationId);
          const wasUnread = conv ? conv.unreadCount || 0 : 0;
          if (!wasUnread) return prev;
          return Math.max(0, prev - wasUnread);
        });
      } catch (e) {
        console.warn('[Messaging] markRead failed', e?.message || e);
      }
    },
    [conversations],
  );

  const applySentMessage = useCallback((conversationId, message) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: {
                text: message.text,
                createdAt: message.createdAt,
                senderUserId: message.senderUserId,
                type: message.type,
              },
              updatedAt: message.createdAt,
            }
          : c,
      ),
    );
  }, []);

  const value = useMemo(
    () => ({
      conversations,
      unreadTotal,
      initialLoading,
      refresh,
      openConversationForBooking,
      markRead,
      applySentMessage,
    }),
    [
      conversations,
      unreadTotal,
      initialLoading,
      refresh,
      openConversationForBooking,
      markRead,
      applySentMessage,
    ],
  );

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessaging() {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error('useMessaging must be used within MessagingProvider');
  return ctx;
}
