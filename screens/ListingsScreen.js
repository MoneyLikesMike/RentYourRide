import React, { useRef, useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
  PanResponder,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useListings } from '../context/ListingsContext';
import ListingCard from '../components/ListingCard';
import { navigateRootStack, navigateToVehicleDetail } from '../utils/navigateRootStack';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;
const TAB_BAR_HEIGHT = 78 * scale;
const ACTION_WIDTH = 104 * scale;
/** Extra width so action strip underlaps the card and hides grey seam / anti-aliasing. */
const ACTION_STRIP_OVERLAP = 6 * scale;
const ACTION_ICON_SIZE = 25 * scale;
/** Tab highlight: design stroke rgb(255, 199, 83), 54×2, corner radius 5 */
const TAB_HIGHLIGHT_COLOR = 'rgb(255, 199, 83)';

function CheckCircleIcon({ color = '#fff', size = ACTION_ICON_SIZE }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke={color}
        strokeWidth={2}
      />
      <Path d="M8 12l2.5 2.5L16 9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PencilIcon({ color = '#fff', size = ACTION_ICON_SIZE }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
        fill={color}
      />
    </Svg>
  );
}

function SwipeableListingRow({ children, actions }) {
  const panX = useRef(new Animated.Value(0)).current;
  const startOffset = useRef(0);
  const currentX = useRef(0);

  const snap = useCallback(
    (open) => {
      const to = open ? -ACTION_WIDTH : 0;
      Animated.spring(panX, {
        toValue: to,
        useNativeDriver: false,
        friction: 9,
      }).start(() => {
        currentX.current = to;
      });
    },
    [panX]
  );

  const close = useCallback(() => snap(false), [snap]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 0.7,
      onPanResponderGrant: () => {
        panX.stopAnimation((v) => {
          startOffset.current = typeof v === 'number' ? v : currentX.current;
        });
      },
      onPanResponderMove: (_, g) => {
        const next = Math.min(0, Math.max(-ACTION_WIDTH, startOffset.current + g.dx));
        currentX.current = next;
        panX.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const projected = currentX.current + g.vx * 40;
        const open = projected < -ACTION_WIDTH / 2;
        snap(open);
      },
    })
  ).current;

  return (
    <View style={styles.swipeWrap}>
      <View style={[styles.swipeActions, { width: ACTION_WIDTH + ACTION_STRIP_OVERLAP }]}>
        {actions({ close })}
      </View>
      <Animated.View
        style={[styles.swipeFront, { transform: [{ translateX: panX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

export default function ListingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { getMyListings, setListingActive, removeListing, canUseListingsHub, clearEditListingSession } =
    useListings();
  const [tab, setTab] = useState('active'); // 'active' | 'deactivated'
  const [deleteModal, setDeleteModal] = useState(null); // { id: string } | null
  const deleteModalCloseSwipeRef = useRef(null);
  const myListings = getMyListings();

  useFocusEffect(
    useCallback(() => {
      if (!canUseListingsHub) {
        navigateRootStack(navigation, 'GetPaidStack');
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }
    }, [canUseListingsHub, navigation])
  );

  const activeListings = useMemo(() => myListings.filter((l) => l.active !== false), [myListings]);
  const deactivatedListings = useMemo(() => myListings.filter((l) => l.active === false), [myListings]);

  const data = tab === 'active' ? activeListings : deactivatedListings;

  const goToDetail = useCallback(
    (listing) => {
      navigateToVehicleDetail(navigation, listing);
    },
    [navigation]
  );

  const goToEditFlow = useCallback(
    (listing) => {
      navigateRootStack(navigation, 'ListRideStack', {
        screen: 'EditYourRideScreen',
        params: { listingId: listing.id },
      });
    },
    [navigation]
  );

  const goListNew = useCallback(() => {
    if (!canUseListingsHub) {
      navigateRootStack(navigation, 'GetPaidStack');
      return;
    }
    clearEditListingSession();
    navigateRootStack(navigation, 'ListRideStack');
  }, [navigation, canUseListingsHub, clearEditListingSession]);

  const openDeleteModal = useCallback((listing, closeSwipe) => {
    deleteModalCloseSwipeRef.current = closeSwipe ?? null;
    setDeleteModal({ id: listing.id });
  }, []);

  const dismissDeleteModal = useCallback(() => {
    const closeSwipe = deleteModalCloseSwipeRef.current;
    deleteModalCloseSwipeRef.current = null;
    setDeleteModal(null);
    closeSwipe?.();
  }, []);

  const confirmDeleteListing = useCallback(() => {
    if (deleteModal?.id) {
      removeListing(deleteModal.id);
    }
    const closeSwipe = deleteModalCloseSwipeRef.current;
    deleteModalCloseSwipeRef.current = null;
    setDeleteModal(null);
    closeSwipe?.();
  }, [deleteModal, removeListing]);

  const renderItem = useCallback(
    ({ item }) => {
      const isActiveTab = tab === 'active';
      return (
        <SwipeableListingRow actions={({ close }) => (
          <View style={styles.actionsColumn}>
            {isActiveTab ? (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionEdit, styles.actionBtnRoundedTop]}
                  onPress={() => {
                    close();
                    goToEditFlow(item);
                  }}
                  activeOpacity={0.85}
                >
                  <PencilIcon color="#fff" />
                  <Text style={styles.actionLabel}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionDeactivate, styles.actionBtnRoundedBottom]}
                  onPress={() => {
                    setListingActive(item.id, false);
                    close();
                  }}
                  activeOpacity={0.85}
                >
                  <Image
                    source={require('../assets/icons/disabled.png')}
                    style={styles.actionDeactivateIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.actionLabel}>Deactivate</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionActivate, styles.actionBtnRoundedTop]}
                  onPress={() => {
                    setListingActive(item.id, true);
                    close();
                  }}
                  activeOpacity={0.85}
                >
                  <CheckCircleIcon color="#fff" />
                  <Text style={styles.actionLabel}>Activate</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionDelete, styles.actionBtnRoundedBottom]}
                  onPress={() => openDeleteModal(item, close)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={require('../assets/icons/trash1.png')}
                    style={styles.actionDeleteIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.actionLabel}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
        >
          <ListingCard
            listing={item}
            onPress={() => goToDetail(item)}
            showInstantBadge
            forSwipeRow
          />
        </SwipeableListingRow>
      );
    },
    [tab, goToDetail, goToEditFlow, setListingActive, openDeleteModal]
  );

  const listPadBottom = TAB_BAR_HEIGHT + 100 + insets.bottom;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path
              d="M31 8L17 24L31 40"
              stroke={COLORS.YELLOWISH_ORANGE}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>LISTINGS</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.tabRow}>
        <View style={styles.tabInner}>
          <TouchableOpacity style={styles.tabBtn} onPress={() => setTab('active')} activeOpacity={0.85}>
            <View style={styles.tabLabelColumnActive}>
              <Text style={[styles.tabText, tab === 'active' && styles.tabTextSelected]}>ACTIVE</Text>
              <View style={[styles.tabUnderlineActive, { opacity: tab === 'active' ? 1 : 0 }]} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabBtn} onPress={() => setTab('deactivated')} activeOpacity={0.85}>
            <View style={styles.tabLabelColumnDeactivated}>
              <Text style={[styles.tabText, tab === 'deactivated' && styles.tabTextSelected]}>DEACTIVATED</Text>
              <View style={[styles.tabUnderlineDeactivated, { opacity: tab === 'deactivated' ? 1 : 0 }]} />
            </View>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.fab} onPress={goListNew} activeOpacity={0.88} accessibilityLabel="List a new ride">
          <Text style={styles.fabPlus}>+</Text>
          <Image source={require('../assets/icons/greenCarFront.png')} style={styles.fabIcon} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: listPadBottom },
          data.length === 0 && styles.listEmptyGrow,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>
              {tab === 'active' ? 'No active listings' : 'No deactivated listings'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {tab === 'active' ? 'List a vehicle with the + button to see it here.' : 'Deactivated vehicles appear here.'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={deleteModal != null}
        transparent
        animationType="fade"
        onRequestClose={dismissDeleteModal}
      >
        <Pressable style={styles.deleteModalBackdrop} onPress={dismissDeleteModal}>
          <Pressable style={styles.deleteModalCard} onPress={() => {}}>
            <Text style={styles.deleteModalTitle}>Are you sure you want to delete your ride?</Text>
            <Text style={styles.deleteModalBody}>
              Your ride will be removed from Rent Your Ride. You can’t undo this action.
            </Text>
            <TouchableOpacity
              style={styles.deleteModalCancelBtn}
              onPress={dismissDeleteModal}
              activeOpacity={0.88}
            >
              <Text style={styles.deleteModalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteModalDeleteBtn}
              onPress={confirmDeleteListing}
              activeOpacity={0.88}
            >
              <Text style={styles.deleteModalDeleteText}>Delete</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECECEC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16 * scale,
    paddingBottom: 8 * scale,
    backgroundColor: '#ECECEC',
  },
  backBtn: {
    width: 40 * scale,
  },
  headerTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20 * scale,
    paddingBottom: 8 * scale,
    backgroundColor: '#ECECEC',
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 28 * scale,
  },
  tabBtn: {
    alignItems: 'center',
    minWidth: 88 * scale,
  },
  /** Label + fixed-width bar share one horizontal center. */
  tabLabelColumnActive: {
    alignSelf: 'center',
    alignItems: 'center',
  },
  /** Bar stretches to match “DEACTIVATED” text width. */
  tabLabelColumnDeactivated: {
    alignSelf: 'center',
    alignItems: 'stretch',
  },
  tabText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: 'rgb(180,180,180)',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  tabTextSelected: {
    color: 'rgb(60,60,60)',
  },
  /** Design width 54; centered with “ACTIVE” via parent alignItems: 'center'. */
  tabUnderlineActive: {
    width: 54 * scale,
    height: 2 * scale,
    borderRadius: 5 * scale,
    backgroundColor: TAB_HIGHLIGHT_COLOR,
  },
  /** Full width of “DEACTIVATED” label. */
  tabUnderlineDeactivated: {
    height: 2 * scale,
    borderRadius: 5 * scale,
    backgroundColor: TAB_HIGHLIGHT_COLOR,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 78 * scale,
    height: 42 * scale,
    borderRadius: 21.5 * scale,
    backgroundColor: '#fff',
    gap: 8 * scale,
    marginBottom: 4 * scale,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  fabPlus: {
    fontSize: 20 * scale,
    fontWeight: '600',
    color: COLORS.MANGO_TWO,
    marginTop: -2,
  },
  fabIcon: {
    width: 22 * scale,
    height: 22 * scale,
  },
  listContent: {
    paddingHorizontal: 20 * scale,
    paddingTop: 12 * scale,
  },
  listEmptyGrow: {
    flexGrow: 1,
  },
  emptyWrap: {
    paddingTop: 48 * scale,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 18 * scale,
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: '#888',
    textAlign: 'center',
  },
  swipeWrap: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
    marginBottom: 16 * scale,
    backgroundColor: 'transparent',
  },
  swipeActions: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'column',
  },
  swipeFront: {
    width: SCREEN_WIDTH - 40 * scale,
    backgroundColor: 'transparent',
  },
  actionsColumn: {
    flex: 1,
    flexDirection: 'column',
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6 * scale,
    minHeight: 52 * scale,
  },
  actionBtnRoundedTop: {
    borderTopRightRadius: 12,
  },
  actionBtnRoundedBottom: {
    borderBottomRightRadius: 12,
  },
  actionEdit: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
  },
  actionDeactivate: {
    backgroundColor: COLORS.YELLOWISH_ORANGE,
  },
  actionDeactivateIcon: {
    width: ACTION_ICON_SIZE,
    height: ACTION_ICON_SIZE,
  },
  actionDeleteIcon: {
    width: ACTION_ICON_SIZE,
    height: ACTION_ICON_SIZE,
  },
  actionActivate: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
  },
  actionDelete: {
    backgroundColor: COLORS.YELLOWISH_ORANGE,
  },
  /** Nunito-SemiBold 15 / 20, white, centered under icon. */
  actionLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    lineHeight: 20 * scale,
    color: '#fff',
    marginTop: 4 * scale,
    textAlign: 'center',
  },
  deleteModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28 * scale,
  },
  deleteModalCard: {
    width: '100%',
    maxWidth: 320 * scale,
    backgroundColor: '#fff',
    borderRadius: 16 * scale,
    paddingHorizontal: 22 * scale,
    paddingTop: 28 * scale,
    paddingBottom: 22 * scale,
    alignItems: 'stretch',
  },
  deleteModalTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 17 * scale,
    lineHeight: 24 * scale,
    color: 'rgb(32, 42, 68)',
    textAlign: 'center',
  },
  deleteModalBody: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    lineHeight: 20 * scale,
    color: 'rgb(130, 130, 130)',
    textAlign: 'center',
    marginTop: 12 * scale,
    marginBottom: 24 * scale,
  },
  deleteModalCancelBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.YELLOWISH_ORANGE,
    backgroundColor: 'rgb(255, 251, 245)',
    borderRadius: 999,
    paddingVertical: 14 * scale,
    alignItems: 'center',
    marginBottom: 12 * scale,
  },
  deleteModalCancelText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: COLORS.YELLOWISH_ORANGE,
  },
  deleteModalDeleteBtn: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 999,
    paddingVertical: 14 * scale,
    alignItems: 'center',
  },
  deleteModalDeleteText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: '#fff',
  },
});
