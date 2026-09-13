import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import Svg, { Path } from 'react-native-svg';
import GuestBookingCard from '../components/GuestBookingCard';
import { useAuth } from '../context/AuthContext';
import { useUserProfile } from '../context/UserProfileContext';
import { useListings } from '../context/ListingsContext';
import { useGuestBookings } from '../context/GuestBookingsContext';
import * as bookingsApi from '../services/bookingsApi';
import { filterBookingsForGuest, filterBookingsForHost } from '../utils/hostBookingFilter';
import { isHistoryForPerspective } from '../utils/bookingCompletion';

const BASE_WIDTH = 375;
const scale = 1;

function mapBookingRow(b) {
  const life = b.lifecycle && typeof b.lifecycle === 'object' ? b.lifecycle : {};
  return {
    ...b,
    ...life,
    createdAt:
      typeof b.createdAt === 'number'
        ? b.createdAt
        : new Date(b.createdAt || Date.now()).getTime(),
  };
}

function mergeHistory(rows) {
  const map = new Map();
  for (const b of rows) {
    if (!b?.id) continue;
    map.set(String(b.id), b);
  }
  return [...map.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export default function RentalHistoryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { isAuthenticated, isReady, user } = useAuth();
  const { firstName, lastName } = useUserProfile();
  const { listings } = useListings();
  const { activeRentals } = useGuestBookings();
  const [activeTab, setActiveTab] = useState(() =>
    route.params?.initialTab === 'host' ? 'host' : 'guest',
  );
  const [guestHistory, setGuestHistory] = useState([]);
  const [hostHistory, setHostHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = route.params?.initialTab;
    if (t === 'host' || t === 'guest') setActiveTab(t);
  }, [route.params?.initialTab]);

  const loadHistory = useCallback(async () => {
    if (!isAuthenticated || !isReady) {
      setGuestHistory([]);
      setHostHistory([]);
      return;
    }
    setLoading(true);
    try {
      // Fully completed + any open bookings (so one-sided checkout can appear in history).
      const [guestCompleted, hostCompleted, guestOpen, hostOpen] = await Promise.all([
        bookingsApi.listBookings('guest', 'completed'),
        bookingsApi.listBookings('host', 'completed'),
        bookingsApi.listBookings('guest'),
        bookingsApi.listBookings('host'),
      ]);

      const guestMapped = mergeHistory(
        [...(guestCompleted || []), ...(guestOpen || []), ...(activeRentals || [])].map(
          mapBookingRow,
        ),
      );
      const hostMapped = mergeHistory(
        [...(hostCompleted || []), ...(hostOpen || []), ...(activeRentals || [])].map(
          mapBookingRow,
        ),
      );

      setGuestHistory(
        filterBookingsForGuest(guestMapped, user?.id).filter((b) =>
          isHistoryForPerspective(b, false),
        ),
      );
      setHostHistory(
        filterBookingsForHost(hostMapped, listings, firstName, lastName, user?.id).filter(
          (b) => isHistoryForPerspective(b, true),
        ),
      );
    } catch (_) {
      setGuestHistory([]);
      setHostHistory([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isReady, user?.id, listings, firstName, lastName, activeRentals]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  const tabWidths = { guest: 50 * scale, host: 43 * scale };
  const items = activeTab === 'guest' ? guestHistory : hostHistory;

  const emptyGuest = (
    <View style={styles.emptyStateContainer}>
      <Image source={require('../assets/icons/EmptyRoad.png')} style={styles.emptyIcon} />
      <Text style={styles.emptyHeader}>You have no rental history</Text>
      <Text style={styles.emptyParagraph}>Find the perfect vehicle for you.</Text>
      <View style={{ height: 60 }} />
      <TouchableOpacity
        style={[styles.rentButton, { marginTop: -120 }]}
        onPress={() => navigation.navigate('HomeScreen')}
      >
        <Text style={styles.rentButtonText}>Rent a ride</Text>
      </TouchableOpacity>
    </View>
  );

  const emptyHost = (
    <View style={styles.emptyStateContainer}>
      <Image source={require('../assets/icons/EmptyRoad.png')} style={styles.emptyIcon} />
      <Text style={styles.emptyHeaderHost}>You have no rental history</Text>
      <Text style={styles.emptyParagraphHost}>
        Don't worry, you'll have rental history soon! If you haven't become a host yet, list your ride
        and start earning!
      </Text>
      <View style={{ height: 60 }} />
      <TouchableOpacity
        style={[styles.rentButton, { marginTop: -80 }]}
        onPress={() => navigation.navigate('GetPaidStack')}
      >
        <Text style={styles.rentButtonText}>List a ride</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path
              d="M31 8L17 24L31 40"
              stroke={COLORS.MANGO_TWO}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <View style={styles.headerTextFlexWrapper}>
          <Text style={styles.heading}>RENTAL HISTORY</Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity onPress={() => setActiveTab('guest')} style={styles.toggleBtn}>
          <Text
            style={[styles.tabText, activeTab === 'guest' ? styles.tabTextActive : styles.tabTextInactive]}
          >
            GUEST
          </Text>
          {activeTab === 'guest' && (
            <View style={[styles.toggleUnderline, { width: tabWidths.guest }]} />
          )}
        </TouchableOpacity>
        <View style={{ width: 60 * scale }} />
        <TouchableOpacity onPress={() => setActiveTab('host')} style={styles.toggleBtn}>
          <Text
            style={[styles.tabText, activeTab === 'host' ? styles.tabTextActive : styles.tabTextInactive]}
          >
            HOST
          </Text>
          {activeTab === 'host' && (
            <View style={[styles.toggleUnderline, { width: tabWidths.host }]} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.contentArea}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.GREENY_BLUE_TWO} />
        ) : items.length === 0 ? (
          activeTab === 'guest' ? emptyGuest : emptyHost
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {items.map((booking) => (
              <GuestBookingCard
                key={String(booking.id)}
                booking={booking}
                onPress={() =>
                  navigation.navigate(
                    activeTab === 'host' ? 'HostBookingDetailsScreen' : 'GuestBookingDetailsScreen',
                    { bookingId: booking.id },
                  )
                }
              />
            ))}
          </ScrollView>
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
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
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
    marginBottom: 16 * scale,
    lineHeight: 24,
  },
  emptyParagraph: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(171,171,171)',
    textAlign: 'center',
    letterSpacing: -0.2,
    width: 239,
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
  },
  emptyHeaderHost: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 18,
    color: 'rgb(14,38,43)',
    textAlign: 'center',
    width: 272,
    marginBottom: 16 * scale,
    lineHeight: 24,
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
