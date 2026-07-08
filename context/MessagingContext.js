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

export function MessagingProvider({ children }) {
  const { isAuthenticated, isReady } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !isReady) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    try {
      const rows = await messagingApi.listConversations();
      if (!Array.isArray(rows)) return;
      setConversations(rows);
      const total = rows.reduce((sum, c) => sum + (Number(c.unreadCount) || 0), 0);
      setUnreadTotal(total);
    } catch (e) {
      // Non-fatal — leave last known state visible
      console.warn('[Messaging] refresh failed', e?.message || e);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [isAuthenticated, isReady]);

  // Initial + polling refresh
  useEffect(() => {
    if (!isAuthenticated || !isReady) {
      setConversations([]);
      setUnreadTotal(0);
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
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
        );
        setUnreadTotal((prev) => {
          const conv = conversations.find((c) => c.id === conversationId);
          const wasUnread = conv ? conv.unreadCount || 0 : 0;
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
      loading,
      refresh,
      openConversationForBooking,
      markRead,
      applySentMessage,
    }),
    [
      conversations,
      unreadTotal,
      loading,
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
