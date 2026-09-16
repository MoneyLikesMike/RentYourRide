import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useAuth } from '../context/AuthContext';
import { useMessaging } from '../context/MessagingContext';
import * as messagingApi from '../services/messagingApi';
import { isRemoteBookingId } from '../utils/bookingId';
import { mapMessagingError } from '../utils/openBookingChat';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;

const POLL_INTERVAL_MS = 6000;

function BackIcon() {
  return (
    <Svg width={22 * scale} height={22 * scale} viewBox="0 0 48 48" fill="none">
      <Path
        d="M31 8L17 24L31 40"
        stroke={COLORS.MANGO_TWO}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SendIcon({ disabled }) {
  return (
    <Svg width={22 * scale} height={22 * scale} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 2L11 13"
        stroke={disabled ? 'rgba(255,255,255,0.5)' : '#fff'}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 2L15 22L11 13L2 9L22 2Z"
        stroke={disabled ? 'rgba(255,255,255,0.5)' : '#fff'}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function formatTime(ts) {
  const d = new Date(ts);
  const hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const h12 = ((hours + 11) % 12) + 1;
  return `${h12}:${mins} ${suffix}`;
}

function dayLabel(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Insert day separators as pseudo-messages between real messages. */
function withDaySeparators(messages) {
  if (!messages?.length) return [];
  const out = [];
  let lastDay = '';
  for (const msg of messages) {
    const label = dayLabel(msg.createdAt);
    if (label !== lastDay) {
      out.push({ type: 'day-separator', id: `sep-${msg.id}`, label, createdAt: msg.createdAt });
      lastDay = label;
    }
    out.push(msg);
  }
  return out;
}

export default function ChatThreadScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { markRead, applySentMessage, refresh } = useMessaging();

  const paramConversationId = route.params?.conversationId;
  const paramBookingId = route.params?.bookingId;
  const paramCounterpartName = route.params?.counterpartName || 'Message';

  const [conversationId, setConversationId] = useState(paramConversationId || null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(null);
  const listRef = useRef(null);
  const pollTimerRef = useRef(null);
  const messageCountRef = useRef(0);
  const shouldStickToBottomRef = useRef(true);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (paramBookingId && !isRemoteBookingId(paramBookingId)) {
        throw new Error(mapMessagingError(null, paramBookingId));
      }
      if (paramConversationId && !isRemoteBookingId(paramConversationId)) {
        throw new Error('Invalid conversation. Go back and open the thread from Messages.');
      }
      let convId = paramConversationId;
      let conv = null;
      if (!convId && paramBookingId) {
        conv = await messagingApi.findOrCreateForBooking(paramBookingId);
        convId = conv?.id;
        setConversationId(convId);
      } else if (convId) {
        conv = await messagingApi.getConversation(convId);
      }
      if (!convId) throw new Error('Could not open conversation');
      setConversation(conv);
      const page = await messagingApi.listMessages(convId, { take: 50 });
      const nextMessages = page.messages || [];
      setMessages(nextMessages);
      messageCountRef.current = nextMessages.length;
      shouldStickToBottomRef.current = true;
      setHasMore(!!page.hasMore);
      await messagingApi.markConversationRead(convId).catch(() => {});
      markRead(convId);
    } catch (e) {
      setError(mapMessagingError(e, paramBookingId));
    } finally {
      setLoading(false);
    }
  }, [paramConversationId, paramBookingId, markRead]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Poll for new messages while thread is open
  useEffect(() => {
    if (!conversationId) return undefined;
    pollTimerRef.current = setInterval(async () => {
      try {
        const page = await messagingApi.listMessages(conversationId, { take: 50 });
        setMessages((prev) => {
          const prevIds = new Set(prev.map((m) => m.id));
          const merged = [...prev];
          let changed = false;
          for (const m of page.messages) {
            if (!prevIds.has(m.id)) {
              merged.push(m);
              changed = true;
            }
          }
          if (!changed) return prev;
          merged.sort((a, b) => a.createdAt - b.createdAt);
          messageCountRef.current = merged.length;
          shouldStickToBottomRef.current = true;
          return merged;
        });
        setHasMore((prev) => {
          const next = !!page.hasMore;
          return prev === next ? prev : next;
        });
        messagingApi.markConversationRead(conversationId).catch(() => {});
      } catch {
        /* keep last known state */
      }
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [conversationId]);

  const loadOlder = useCallback(async () => {
    if (!conversationId || !hasMore || messages.length === 0) return;
    const before = messages[0]?.createdAt;
    try {
      const page = await messagingApi.listMessages(conversationId, {
        take: 50,
        before,
      });
      if (!page.messages?.length) return;
      setMessages((prev) => [...page.messages, ...prev]);
      setHasMore(!!page.hasMore);
    } catch {
      /* ignore */
    }
  }, [conversationId, hasMore, messages]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending || !conversationId) return;
    setSending(true);
    // Optimistic append
    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      id: tempId,
      conversationId,
      senderUserId: user?.id ?? null,
      type: 'text',
      text,
      createdAt: Date.now(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    messageCountRef.current += 1;
    shouldStickToBottomRef.current = true;
    setDraft('');
    try {
      const saved = await messagingApi.sendMessage(conversationId, text);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...saved, pending: false } : m)),
      );
      applySentMessage(conversationId, saved);
      refresh();
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(text);
      Alert.alert('Could not send', e?.message || 'Try again.');
    } finally {
      setSending(false);
    }
  }, [draft, sending, conversationId, user?.id, applySentMessage, refresh]);

  const decorated = useMemo(() => withDaySeparators(messages), [messages]);

  const renderItem = useCallback(
    ({ item }) => {
      if (item.type === 'day-separator') {
        return (
          <View style={styles.daySeparator}>
            <View style={styles.dayLine} />
            <Text style={styles.dayLabel}>{item.label}</Text>
            <View style={styles.dayLine} />
          </View>
        );
      }
      if (item.type === 'system') {
        return (
          <View style={styles.systemRow}>
            <Text style={styles.systemText}>{item.text}</Text>
          </View>
        );
      }
      const isMine = item.senderUserId === user?.id;
      return (
        <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
          <View
            style={[
              styles.bubble,
              isMine ? styles.bubbleMine : styles.bubbleTheirs,
              item.pending && styles.bubblePending,
            ]}
          >
            <Text style={isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>{item.text}</Text>
            <Text
              style={isMine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs}
            >
              {item.pending ? 'sending…' : formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
      );
    },
    [user?.id],
  );

  const listing = conversation?.bookingSnapshot;
  const counterpartName = conversation?.counterpart?.fullName || paramCounterpartName;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={12}
        >
          <BackIcon />
        </TouchableOpacity>
        <View style={styles.headerBody}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {counterpartName}
          </Text>
          {listing?.listingTitle ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {listing.listingTitle}
            </Text>
          ) : null}
        </View>
        {conversation?.counterpart?.avatarUrl ? (
          <Image source={{ uri: conversation.counterpart.avatarUrl }} style={styles.headerAvatar} />
        ) : (
          <View style={styles.headerAvatarSpacer} />
        )}
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={COLORS.GREENY_BLUE_TWO} />
        </View>
      ) : error ? (
        <View style={styles.loaderWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={bootstrap} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={decorated}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.05}
          onScrollBeginDrag={() => {
            /* iOS chat convention: scroll up loads older */
          }}
          onEndReached={loadOlder}
          onContentSizeChange={() => {
            if (!shouldStickToBottomRef.current) return;
            listRef.current?.scrollToEnd({ animated: false });
            shouldStickToBottomRef.current = false;
          }}
          ListEmptyComponent={
            <View style={styles.emptyThread}>
              <Text style={styles.emptyThreadText}>
                No messages yet. Say hi to get the conversation started.
              </Text>
            </View>
          }
        />
      )}

      <View style={[styles.composer, { paddingBottom: 8 + insets.bottom }]}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Message…"
          placeholderTextColor="rgb(171,171,171)"
          multiline
          maxLength={2000}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!draft.trim() || sending}
          activeOpacity={0.85}
        >
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <SendIcon disabled={!draft.trim()} />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12 * scale,
    paddingBottom: 12 * scale,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  backBtn: {
    padding: 6,
    marginRight: 4,
  },
  headerBody: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16 * scale,
    color: 'rgb(14,38,43)',
  },
  headerSubtitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    marginTop: 2,
  },
  headerAvatar: {
    width: 36 * scale,
    height: 36 * scale,
    borderRadius: 18 * scale,
    marginLeft: 8,
  },
  headerAvatarSpacer: {
    width: 36 * scale,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: '#c14a4a',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: {
    color: '#fff',
    fontFamily: FONTS.NUNITO_SEMIBOLD,
  },
  listContent: {
    paddingHorizontal: 12 * scale,
    paddingVertical: 16 * scale,
  },
  emptyThread: {
    padding: 40,
    alignItems: 'center',
  },
  emptyThreadText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: 'rgb(150,150,150)',
    textAlign: 'center',
  },
  daySeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12 * scale,
  },
  dayLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  dayLabel: {
    marginHorizontal: 10,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: 'rgb(150,150,150)',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  systemRow: {
    alignSelf: 'center',
    backgroundColor: 'rgba(76,182,177,0.10)',
    paddingHorizontal: 14 * scale,
    paddingVertical: 8 * scale,
    borderRadius: 14 * scale,
    marginVertical: 8 * scale,
    maxWidth: '85%',
  },
  systemText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: COLORS.GREENY_BLUE,
    textAlign: 'center',
  },
  bubbleRow: {
    marginVertical: 4 * scale,
  },
  bubbleRowMine: {
    alignItems: 'flex-end',
  },
  bubbleRowTheirs: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14 * scale,
    paddingVertical: 10 * scale,
    borderRadius: 18 * scale,
  },
  bubbleMine: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderBottomRightRadius: 4 * scale,
  },
  bubbleTheirs: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4 * scale,
  },
  bubblePending: {
    opacity: 0.65,
  },
  bubbleTextMine: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: '#fff',
    lineHeight: 20 * scale,
  },
  bubbleTextTheirs: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: 'rgb(14,38,43)',
    lineHeight: 20 * scale,
  },
  bubbleTimeMine: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 10 * scale,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeTheirs: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 10 * scale,
    color: 'rgba(0,0,0,0.45)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12 * scale,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40 * scale,
    borderRadius: 20 * scale,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 14 * scale,
    paddingTop: Platform.OS === 'ios' ? 10 : 6,
    paddingBottom: Platform.OS === 'ios' ? 10 : 6,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: 'rgb(14,38,43)',
    backgroundColor: '#fafafa',
  },
  sendBtn: {
    marginLeft: 8,
    width: 44 * scale,
    height: 44 * scale,
    borderRadius: 22 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(76,182,177,0.5)',
  },
});
