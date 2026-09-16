import React, { useState, useMemo, useEffect } from 'react';
import { uiScale } from '../utils/uiScale';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import Svg, { Path } from 'react-native-svg';
import GuestBookingCard from '../components/GuestBookingCard';
import HostRentalRequestCard from '../components/HostRentalRequestCard';
import { useGuestBookings } from '../context/GuestBookingsContext';
import { useUserProfile } from '../context/UserProfileContext';
import { useListings } from '../context/ListingsContext';
import { useAuth } from '../context/AuthContext';
import { filterBookingsForGuest, filterBookingsForHost } from '../utils/hostBookingFilter';
import { filterActiveForPerspective } from '../utils/bookingCompletion';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;

export default function ActiveRentalsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { activeRentals } = useGuestBookings();
  const { firstName, lastName } = useUserProfile();
  const { listings } = useListings();
  const [activeTab, setActiveTab] = useState(() =>
    route.params?.initialTab === 'host' ? 'host' : 'guest'
  );
  const tabWidths = { guest: 50 * scale, host: 43 * scale };

  useEffect(() => {
    const t = route.params?.initialTab;
    if (t === 'host' || t === 'guest') setActiveTab(t);
  }, [route.params?.initialTab]);

  const guestActiveRentals = useMemo(
    () =>
      filterActiveForPerspective(
        filterBookingsForGuest(activeRentals, user?.id),
        false,
      ),
    [activeRentals, user?.id],
  );

  const hostActiveRentals = useMemo(
    () =>
      filterActiveForPerspective(
        filterBookingsForHost(activeRentals, listings, firstName, lastName, user?.id),
        true,
      ),
    [activeRentals, listings, firstName, lastName, user?.id]
  );

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          {/* Inline SVG Back Arrow */}
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke={COLORS.MANGO_TWO} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <View style={styles.headerTextFlexWrapper}>
          <Text style={styles.heading}>ACTIVE RENTALS</Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>
      {/* Tab Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity onPress={() => setActiveTab('guest')} style={styles.toggleBtn}>
          <Text style={[styles.tabText, activeTab === 'guest' ? styles.tabTextActive : styles.tabTextInactive]}>GUEST</Text>
          {activeTab === 'guest' && (
            <View style={[styles.toggleUnderline, { width: tabWidths.guest }]} />
          )}
        </TouchableOpacity>
        <View style={{ width: 60 * scale }} />
        <TouchableOpacity onPress={() => setActiveTab('host')} style={styles.toggleBtn}>
          <Text style={[styles.tabText, activeTab === 'host' ? styles.tabTextActive : styles.tabTextInactive]}>HOST</Text>
          {activeTab === 'host' && (
            <View style={[styles.toggleUnderline, { width: tabWidths.host }]} />
          )}
        </TouchableOpacity>
      </View>
      {/* Content Area */}
      <View style={styles.contentArea}>
        {activeTab === 'guest' ? (
          guestActiveRentals.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Image source={require('../assets/icons/EmptyRoad.png')} style={styles.emptyIcon} />
              <Text style={styles.emptyHeader}>You have no active rentals</Text>
              <Text style={styles.emptyParagraph}>Find the perfect vehicle for you.</Text>
              <View style={{ height: 60 }} />
              <TouchableOpacity style={[styles.rentButton, { marginTop: -120 }]} onPress={() => navigation.navigate('HomeScreen')}>
                <Text style={styles.rentButtonText}>Rent a ride</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              style={styles.guestListScroll}
              contentContainerStyle={styles.guestListContent}
              showsVerticalScrollIndicator={false}
            >
              {guestActiveRentals.map((b) => (
                <GuestBookingCard
                  key={b.id}
                  booking={b}
                  onPress={() => navigation.navigate('GuestBookingDetailsScreen', { bookingId: b.id })}
                />
              ))}
            </ScrollView>
          )
        ) : hostActiveRentals.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Image source={require('../assets/icons/EmptyRoad.png')} style={styles.emptyIcon} />
            <Text style={styles.emptyHeaderHost}>You have no active rentals</Text>
            <Text style={styles.emptyParagraphHost}>Don't worry, you'll have an active rental soon! If you haven't become a host yet, list your ride and start earning!</Text>
            <View style={{ height: 60 }} />
            <TouchableOpacity style={[styles.rentButton, { marginTop: -80 }]} onPress={() => navigation.navigate('GetPaidStack')}>
              <Text style={styles.rentButtonText}>List a ride</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.guestListScroll}
            contentContainerStyle={styles.guestListContent}
            showsVerticalScrollIndicator={false}
          >
            {hostActiveRentals.map((b) => (
              <HostRentalRequestCard
                key={b.id}
                booking={b}
                onPress={() => navigation.navigate('HostBookingDetailsScreen', { bookingId: b.id })}
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
  backIcon: {
    width: 24 * scale,
    height: 24 * scale,
    tintColor: 'rgb(100,100,100)',
  },
  heading: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
    width: 144 * scale,
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
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  guestListScroll: {
    flex: 1,
    width: '100%',
  },
  guestListContent: {
    paddingTop: 8 * scale,
    paddingBottom: 100 * scale,
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
    width: 239,
    height: 72,
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
    height: 72,
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