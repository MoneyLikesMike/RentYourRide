import React, { useMemo, useCallback } from 'react';
import { uiScale } from '../utils/uiScale';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useGuestBookings } from '../context/GuestBookingsContext';

const { width: screenWidth } = Dimensions.get('window');
const scale = uiScale;

const SHARED_INTRO =
  'Rent Your Ride wants to create the best rental experience for both hosts and guests. Here are some tips we have created to help improve your satisfaction on our platform.';

const GUEST_GUIDELINES = [
  { icon: require('../assets/icons/punctual.png'), label: 'Be punctual and arrive on time' },
  { icon: require('../assets/icons/purse.png'), label: "Don't forget any of your personal belongings" },
  { icon: require('../assets/icons/fuel.png'), label: 'Fill up your tank/ charge your battery' },
  { icon: require('../assets/icons/cleanCar.png'), label: 'Make sure the vehicle is squeaky clean' },
  { icon: require('../assets/icons/Bill.png'), label: 'Report any tickets you have received with the host' },
  { icon: require('../assets/icons/carInsurance1.png'), label: 'Similar to checking in, do a complete walk around on the vehicle' },
];

const HOST_GUIDELINES = [
  { icon: require('../assets/icons/punctual.png'), label: 'Be punctual and arrive on time' },
  { icon: require('../assets/icons/favorites.png'), label: 'Give your guest a 5 star experience' },
  { icon: require('../assets/icons/fuel.png'), label: 'Fill up your tank/ charge your battery' },
  { icon: require('../assets/icons/cleanCar.png'), label: 'Make sure the vehicle is squeaky clean' },
  { icon: require('../assets/icons/carRepair.png'), label: 'Make sure your vehicle has no mechanical issues' },
  { icon: require('../assets/icons/purse.png'), label: 'Remove any personal belongings' },
];

/**
 * Single guidelines step for both guest and host check-in. Pass `role: 'guest' | 'host'` in route params
 * so the correct copy and next screen are always used.
 */
const HOST_FUEL_ROW_INDEX = 2;

export default function CheckInGuidelinesScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { bookingId, role: roleParam } = route.params || {};
  const isHost = roleParam === 'host';
  const checkoutFlow = route.params?.checkoutFlow === true;

  const { getBookingById } = useGuestBookings();

  const booking = useMemo(() => (bookingId ? getBookingById(bookingId) : null), [bookingId, getBookingById]);

  const guidelines = useMemo(() => {
    if (!isHost) return GUEST_GUIDELINES;
    if (!checkoutFlow) return HOST_GUIDELINES;
    return HOST_GUIDELINES.map((item, index) =>
      index === HOST_FUEL_ROW_INDEX
        ? { ...item, label: 'Make sure your tank/ battery is returned full' }
        : item
    );
  }, [isHost, checkoutFlow]);

  const onContinue = useCallback(() => {
    if (!booking?.id) {
      navigation.goBack();
      return;
    }
    if (isHost) {
      navigation.navigate('HostRentalAgreementScreen', { bookingId: booking.id, checkoutFlow });
    } else {
      navigation.navigate('GuestRentalAgreementScreen', {
        bookingId: booking.id,
        checkoutFlow,
      });
    }
  }, [booking?.id, isHost, navigation, checkoutFlow]);

  if (!booking) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke={COLORS.MANGO_TWO} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.missingText}>Booking not found.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke={COLORS.MANGO_TWO} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Guidelines</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 * scale }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>{SHARED_INTRO}</Text>

        {guidelines.map((item, index) => (
          <View key={index} style={styles.row}>
            <Image source={item.icon} style={styles.rowIcon} resizeMode="contain" />
            <Text style={[styles.rowLabel, isHost && styles.rowLabelHost]}>{item.label}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16 * scale) }]}>
        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.88} onPress={onContinue}>
          <Text style={styles.primaryBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8 * scale,
    marginBottom: 8 * scale,
  },
  backBtn: {
    paddingHorizontal: 10 * scale,
    paddingVertical: 8 * scale,
    width: 44 * scale,
  },
  headerRightSpacer: {
    width: 44 * scale,
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 17 * scale,
    color: 'rgb(14, 38, 43)',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24 * scale,
    paddingTop: 8 * scale,
  },
  intro: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    lineHeight: Math.round(22 * scale),
    color: 'rgb(171, 171, 171)',
    textAlign: 'center',
    marginBottom: 28 * scale,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22 * scale,
    paddingRight: 8 * scale,
  },
  rowIcon: {
    width: 65 * scale,
    height: 50 * scale,
    marginRight: 16 * scale,
  },
  rowLabel: {
    flex: 1,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    lineHeight: Math.round(21 * scale),
    color: 'rgb(171, 171, 171)',
  },
  /** Matches host Zeplin: 15pt Nunito SemiBold, grey, kerning -0.2 */
  rowLabelHost: {
    letterSpacing: -0.2,
  },
  footer: {
    paddingHorizontal: 28 * scale,
    paddingTop: 8 * scale,
    backgroundColor: '#fff',
  },
  primaryBtn: {
    width: 250 * scale,
    height: 50 * scale,
    borderRadius: 25 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  primaryBtnText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: '#fff',
    letterSpacing: 0.2,
  },
  missingText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: 'rgb(120, 120, 120)',
    marginTop: 24 * scale,
    paddingHorizontal: 24 * scale,
  },
});
