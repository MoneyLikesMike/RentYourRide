import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import Svg, { Path } from 'react-native-svg';
import { useGuestBookings } from '../context/GuestBookingsContext';
import { useUserProfile } from '../context/UserProfileContext';
import { useListings } from '../context/ListingsContext';
import { useAuth } from '../context/AuthContext';
import { filterBookingsForHost } from '../utils/hostBookingFilter';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

function formatSignedAt(ts) {
  if (ts == null || !Number.isFinite(Number(ts))) return '—';
  const d = new Date(Number(ts));
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function mergeBookings(pendingRequests, activeRentals) {
  const m = new Map();
  pendingRequests.forEach((b) => m.set(b.id, b));
  activeRentals.forEach((b) => m.set(b.id, b));
  return Array.from(m.values());
}

export default function RentalAgreementsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { pendingRequests, activeRentals } = useGuestBookings();
  const { firstName, lastName } = useUserProfile();
  const { listings } = useListings();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState(() =>
    route.params?.initialTab === 'host' ? 'host' : 'guest'
  );

  useEffect(() => {
    const t = route.params?.initialTab;
    if (t === 'host' || t === 'guest') setActiveTab(t);
  }, [route.params?.initialTab]);

  const tabWidths = { guest: 50 * scale, host: 43 * scale };

  const allBookings = useMemo(
    () => mergeBookings(pendingRequests, activeRentals),
    [pendingRequests, activeRentals]
  );

  const guestCompletedAgreements = useMemo(() => {
    return allBookings
      .filter((b) => b.guestCheckoutRentalAgreementSignedAt != null)
      .sort(
        (a, b) =>
          (b.guestCheckoutRentalAgreementSignedAt || 0) - (a.guestCheckoutRentalAgreementSignedAt || 0)
      );
  }, [allBookings]);

  const hostCompletedAgreements = useMemo(() => {
    return filterBookingsForHost(allBookings, listings, firstName, lastName, user?.id)
      .filter((b) => b.hostCheckoutRentalAgreementSignedAt != null)
      .sort(
        (a, b) =>
          (b.hostCheckoutRentalAgreementSignedAt || 0) - (a.hostCheckoutRentalAgreementSignedAt || 0)
      );
  }, [allBookings, listings, firstName, lastName, user?.id]);

  const onPressGuestAgreement = useCallback(
    (bookingId) => {
      navigation.navigate('CompletedRentalAgreementScreen', { bookingId, perspective: 'guest' });
    },
    [navigation]
  );

  const onPressHostAgreement = useCallback(
    (bookingId) => {
      navigation.navigate('CompletedRentalAgreementScreen', { bookingId, perspective: 'host' });
    },
    [navigation]
  );

  const renderGuestItem = useCallback(
    ({ item }) => {
      const ls = item.listingSnapshot || {};
      const title = (ls.title || 'Vehicle').trim() || 'Vehicle';
      const signedAt = item.guestCheckoutRentalAgreementSignedAt;
      const signer = (item.guestCheckoutRentalAgreementSignerName || '').trim() || '—';
      return (
        <TouchableOpacity
          style={styles.agreementCard}
          onPress={() => onPressGuestAgreement(item.id)}
          activeOpacity={0.85}
        >
          <Text style={styles.agreementCardTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.agreementCardMeta}>Completed check-out agreement · {formatSignedAt(signedAt)}</Text>
          <Text style={styles.agreementCardSigner}>Signed: {signer}</Text>
        </TouchableOpacity>
      );
    },
    [onPressGuestAgreement]
  );

  const renderHostItem = useCallback(
    ({ item }) => {
      const ls = item.listingSnapshot || {};
      const title = (ls.title || 'Vehicle').trim() || 'Vehicle';
      const signedAt = item.hostCheckoutRentalAgreementSignedAt;
      const signer = (item.hostCheckoutRentalAgreementSignerName || '').trim() || '—';
      return (
        <TouchableOpacity
          style={styles.agreementCard}
          onPress={() => onPressHostAgreement(item.id)}
          activeOpacity={0.85}
        >
          <Text style={styles.agreementCardTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.agreementCardMeta}>Completed check-out agreement · {formatSignedAt(signedAt)}</Text>
          <Text style={styles.agreementCardSigner}>Signed: {signer}</Text>
        </TouchableOpacity>
      );
    },
    [onPressHostAgreement]
  );

  const guestEmpty = (
    <View style={styles.emptyStateContainer}>
      <Image source={require('../assets/icons/EmptyRoad.png')} style={styles.emptyIcon} />
      <Text style={styles.emptyHeader}>You have no rental agreements</Text>
      <Text style={styles.emptyParagraph}>Completed check-out agreements appear here after a trip ends.</Text>
      <View style={{ height: 60 }} />
      <TouchableOpacity style={[styles.rentButton, { marginTop: -120 }]} onPress={() => navigation.navigate('HomeScreen')}>
        <Text style={styles.rentButtonText}>Rent a ride</Text>
      </TouchableOpacity>
    </View>
  );

  const hostEmpty = (
    <View style={styles.emptyStateContainer}>
      <Image source={require('../assets/icons/EmptyRoad.png')} style={styles.emptyIcon} />
      <Text style={styles.emptyHeaderHost}>You have no rental agreements</Text>
      <Text style={styles.emptyParagraphHost}>
        When you complete check-out as a host, your signed rental agreement will show here.
      </Text>
      <View style={{ height: 60 }} />
      <TouchableOpacity style={[styles.rentButton, { marginTop: -80 }]} onPress={() => navigation.navigate('GetPaidStack')}>
        <Text style={styles.rentButtonText}>List a ride</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke={COLORS.MANGO_TWO} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <View style={styles.headerTextFlexWrapper}>
          <Text style={styles.heading}>RENTAL AGREEMENTS</Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>
      <View style={styles.toggleRow}>
        <TouchableOpacity onPress={() => setActiveTab('guest')} style={styles.toggleBtn}>
          <Text style={[styles.tabText, activeTab === 'guest' ? styles.tabTextActive : styles.tabTextInactive]}>GUEST</Text>
          {activeTab === 'guest' && <View style={[styles.toggleUnderline, { width: tabWidths.guest }]} />}
        </TouchableOpacity>
        <View style={{ width: 60 * scale }} />
        <TouchableOpacity onPress={() => setActiveTab('host')} style={styles.toggleBtn}>
          <Text style={[styles.tabText, activeTab === 'host' ? styles.tabTextActive : styles.tabTextInactive]}>HOST</Text>
          {activeTab === 'host' && <View style={[styles.toggleUnderline, { width: tabWidths.host }]} />}
        </TouchableOpacity>
      </View>
      <View style={styles.contentArea}>
        {activeTab === 'guest' ? (
          guestCompletedAgreements.length === 0 ? (
            guestEmpty
          ) : (
            <FlatList
              data={guestCompletedAgreements}
              keyExtractor={(item) => item.id}
              renderItem={renderGuestItem}
              style={styles.list}
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
              showsVerticalScrollIndicator={false}
            />
          )
        ) : hostCompletedAgreements.length === 0 ? (
          hostEmpty
        ) : (
          <FlatList
            data={hostCompletedAgreements}
            keyExtractor={(item) => item.id}
            renderItem={renderHostItem}
            style={styles.list}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 0 },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 73 * scale,
    paddingBottom: 12 * scale,
    backgroundColor: '#fff',
    zIndex: 2,
  },
  backBtn: {
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    height: 23 * scale,
    width: 39 * scale,
    padding: 8 * scale,
    zIndex: 3,
  },
  heading: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
    width: 180 * scale,
    height: 20 * scale,
    textAlign: 'center',
    alignSelf: 'center',
    fontWeight: 'bold',
    textTransform: 'none',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24 * scale,
    marginTop: 24 * scale,
  },
  toggleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    letterSpacing: 0.2,
    height: 20 * scale,
    textAlign: 'center',
  },
  tabTextActive: {
    color: 'rgb(14,38,43)',
  },
  tabTextInactive: {
    color: 'rgb(171,171,171)',
  },
  toggleUnderline: {
    height: 2 * scale,
    backgroundColor: COLORS.YELLOWISH_ORANGE,
    marginTop: 2 * scale,
    borderRadius: 1 * scale,
    alignSelf: 'center',
  },
  contentArea: {
    flex: 1,
    width: '100%',
  },
  list: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    paddingHorizontal: 20 * scale,
    paddingTop: 4 * scale,
  },
  agreementCard: {
    backgroundColor: '#fff',
    borderRadius: 12 * scale,
    borderWidth: 1,
    borderColor: 'rgb(232, 232, 232)',
    paddingHorizontal: 16 * scale,
    paddingVertical: 14 * scale,
    marginBottom: 12 * scale,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  agreementCardTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16 * scale,
    color: 'rgb(14,38,43)',
    marginBottom: 8 * scale,
  },
  agreementCardMeta: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: 'rgb(120,120,120)',
    marginBottom: 4 * scale,
  },
  agreementCardSigner: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: COLORS.GREENY_BLUE_TWO,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
    marginTop: -120,
  },
  emptyIcon: {
    width: 176 * scale,
    height: 174 * scale,
    resizeMode: 'contain',
    marginBottom: 32 * scale,
  },
  emptyHeader: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 18,
    color: 'rgb(14,38,43)',
    textAlign: 'center',
    width: 272,
    height: 48,
    marginBottom: 16 * scale,
    lineHeight: 24,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  emptyParagraph: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(171,171,171)',
    textAlign: 'center',
    letterSpacing: -0.2,
    width: 259,
    marginBottom: 32 * scale,
  },
  rentButton: {
    width: 193 * scale,
    height: 48 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rentButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: 'rgb(247,247,247)',
    textAlign: 'center',
    letterSpacing: 0.2,
    paddingHorizontal: 16 * scale,
    paddingVertical: 0,
  },
  emptyHeaderHost: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 18,
    color: 'rgb(14,38,43)',
    textAlign: 'center',
    width: 272,
    height: 48,
    marginBottom: 16 * scale,
    lineHeight: 24,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  emptyParagraphHost: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(171,171,171)',
    textAlign: 'center',
    letterSpacing: -0.2,
    width: 299,
    marginBottom: 32 * scale,
  },
  headerTextFlexWrapper: {
    flex: 1,
    marginLeft: 39,
    marginRight: 39,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightSpacer: {
    width: 39,
  },
});
