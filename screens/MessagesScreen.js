import React, { useCallback, useMemo, useState, memo } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useAuth } from '../context/AuthContext';
import { useMessaging } from '../context/MessagingContext';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;

function formatRelative(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

const ConversationRow = memo(function ConversationRow({ conversation, currentUserId, onPress }) {
  const {
    counterpart = {},
    lastMessage,
    unreadCount,
    bookingSnapshot,
  } = conversation || {};

  const preview =
    lastMessage?.type === 'system'
      ? lastMessage.text
      : lastMessage
        ? lastMessage.senderUserId === currentUserId
          ? `You: ${lastMessage.text}`
          : lastMessage.text
        : 'Start the conversation';
  const isUnread = unreadCount > 0;

  return (
    <TouchableOpacity onPress={() => onPress(conversation)} activeOpacity={0.75} style={styles.row}>
      <View style={styles.avatarWrap}>
        {counterpart.avatarUrl ? (
          <Image source={{ uri: counterpart.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitials}>{initials(counterpart.fullName)}</Text>
          </View>
        )}
        {isUnread && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowHeader}>
          <Text style={[styles.name, isUnread && styles.nameUnread]} numberOfLines={1}>
            {counterpart.fullName}
          </Text>
          <Text style={styles.time}>{formatRelative(lastMessage?.createdAt || conversation.updatedAt)}</Text>
        </View>
        {bookingSnapshot?.listingTitle ? (
          <Text style={styles.subject} numberOfLines={1}>{bookingSnapshot.listingTitle}</Text>
        ) : null}
        <Text
          style={[styles.preview, isUnread && styles.previewUnread]}
          numberOfLines={2}
        >
          {preview}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

export default function MessagesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { conversations, initialLoading, refresh } = useMessaging();
  const [pullRefreshing, setPullRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handlePullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await refresh();
    } finally {
      setPullRefreshing(false);
    }
  }, [refresh]);

  const openConversation = useCallback(
    (conv) => {
      navigation.navigate('ChatThreadScreen', {
        conversationId: conv.id,
        counterpartName: conv.counterpart?.fullName || 'Chat',
        bookingId: conv.bookingId,
      });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <ConversationRow
        conversation={item}
        currentUserId={user?.id}
        onPress={openConversation}
      />
    ),
    [user?.id, openConversation],
  );

  const empty = useMemo(
    () => (
      <View style={styles.emptyWrap}>
        <Image
          source={require('../assets/icons/EmptyRoad.png')}
          style={styles.emptyIcon}
          resizeMode="contain"
        />
        <Text style={styles.emptyHeader}>You don’t have any messages</Text>
        <Text style={styles.emptyParagraph}>
          Book a trip or accept a request — messages will appear here so you can coordinate with the other person.
        </Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={() => navigation.navigate('HomeTab')}
          activeOpacity={0.85}
        >
          <Text style={styles.emptyBtnText}>Rent a ride</Text>
        </TouchableOpacity>
      </View>
    ),
    [navigation],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>MESSAGES</Text>
      </View>

      {initialLoading && conversations.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={COLORS.GREENY_BLUE_TWO} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          contentContainerStyle={
            conversations.length === 0
              ? styles.emptyContent
              : { paddingBottom: 24 + insets.bottom }
          }
          ListEmptyComponent={empty}
          refreshControl={
            <RefreshControl
              refreshing={pullRefreshing}
              onRefresh={handlePullRefresh}
              tintColor={COLORS.GREENY_BLUE_TWO}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerRow: {
    paddingVertical: 12 * scale,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  heading: {
    textAlign: 'center',
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 14 * scale,
    paddingHorizontal: 18 * scale,
    alignItems: 'flex-start',
  },
  avatarWrap: {
    width: 52 * scale,
    height: 52 * scale,
    marginRight: 14 * scale,
    position: 'relative',
  },
  avatar: {
    width: 52 * scale,
    height: 52 * scale,
    borderRadius: 26 * scale,
    backgroundColor: '#eee',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.GREENY_BLUE_TWO,
  },
  avatarInitials: {
    fontFamily: FONTS.NUNITO_BOLD,
    color: '#fff',
    fontSize: 17 * scale,
    letterSpacing: 0.4,
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14 * scale,
    height: 14 * scale,
    borderRadius: 7 * scale,
    backgroundColor: COLORS.MANGO_TWO,
    borderWidth: 2,
    borderColor: '#fff',
  },
  rowBody: {
    flex: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2 * scale,
  },
  name: {
    flex: 1,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: 'rgb(14,38,43)',
    marginRight: 8 * scale,
  },
  nameUnread: {
    fontFamily: FONTS.NUNITO_BOLD,
  },
  time: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: 'rgb(150,150,150)',
  },
  subject: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    marginBottom: 2 * scale,
  },
  preview: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: 'rgb(120,120,120)',
    lineHeight: 18 * scale,
  },
  previewUnread: {
    color: 'rgb(14,38,43)',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginLeft: 18 * scale + 52 * scale + 14 * scale,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 32 * scale,
    marginTop: 48 * scale,
  },
  emptyIcon: {
    width: 160 * scale,
    height: 158 * scale,
    marginBottom: 24 * scale,
  },
  emptyHeader: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 18,
    color: 'rgb(14,38,43)',
    textAlign: 'center',
    marginBottom: 12 * scale,
  },
  emptyParagraph: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: 'rgb(171,171,171)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32 * scale,
  },
  emptyBtn: {
    minWidth: 193 * scale,
    height: 40 * scale,
    paddingHorizontal: 20,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtnText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.2,
  },
});
