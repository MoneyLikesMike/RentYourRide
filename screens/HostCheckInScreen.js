import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useGuestBookings } from '../context/GuestBookingsContext';
import { useUserProfile } from '../context/UserProfileContext';
import { formatCheckInTripStart } from '../utils/guestBookingFormat';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375;

export default function HostCheckInScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { bookingId } = route.params || {};
  const { getBookingById } = useGuestBookings();
  const { firstName } = useUserProfile();

  const booking = useMemo(() => (bookingId ? getBookingById(bookingId) : null), [bookingId, getBookingById]);

  const hostNameForHeading = useMemo(() => {
    if (!booking) return 'there';
    return (firstName || '').trim() || 'there';
  }, [booking, firstName]);

  const ls = booking?.listingSnapshot || {};
  const guestName = booking?.guestName?.trim() || 'Guest';
  const vehicleTitle = ls.title || 'Vehicle';
  const tripStartLine = booking ? formatCheckInTripStart(booking.bookingDates) : '';
  const isDelivery = booking?.deliveryEnabled === true;
  const pickupAddress = booking?.pickupAddress || ls.pickupAddress || '—';
  const deliveryOrPickupAddress = isDelivery
    ? booking?.dropoffAddress || pickupAddress
    : pickupAddress;
  const onLetsGo = () => {
    navigation.push('CheckInGuidelinesScreen', { bookingId: booking.id, role: 'host' });
  };

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
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
          <Path d="M31 8L17 24L31 40" stroke={COLORS.MANGO_TWO} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 * scale },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroWrap}>
          <Image
            source={require('../assets/icons/everydayRidesIcon.png')}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.headlineRow}>
          <View style={styles.readyWithHighlight}>
            <View style={styles.readyHighlightBox} />
            <Text style={styles.readyText}>Ready</Text>
          </View>
          <Text style={styles.headlineText}>{` to get started ${hostNameForHeading}?`}</Text>
        </View>

        <Text style={styles.bodyBlock}>
          <Text style={styles.bodyMuted}>
            {`${guestName}’s trip in your `}
          </Text>
          <Text style={styles.bodyStrong}>{vehicleTitle}</Text>
          <Text style={styles.bodyMuted}> begins at </Text>
          <Text style={styles.bodyStrong}>{tripStartLine || '—'}</Text>
          <Text style={styles.bodyMuted}>.</Text>
        </Text>

        <Text style={styles.pickupBlock}>
          {isDelivery ? (
            <>
              <Text style={styles.bodyMuted}>{"You're dropping off the vehicle at\n"}</Text>
              <Text style={styles.pickupAddress}>{deliveryOrPickupAddress}</Text>
            </>
          ) : (
            <>
              <Text style={styles.bodyMuted}>{`${guestName} is picking up your vehicle at\n`}</Text>
              <Text style={styles.pickupAddress}>{deliveryOrPickupAddress}</Text>
            </>
          )}
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16 * scale) }]}>
        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.88} onPress={onLetsGo}>
          <Text style={styles.primaryBtnText}>Let's go</Text>
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
  backBtn: {
    alignSelf: 'flex-start',
    paddingLeft: 18 * scale,
    paddingVertical: 8 * scale,
    marginBottom: 8 * scale,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28 * scale,
    alignItems: 'center',
    width: '100%',
  },
  heroWrap: {
    marginBottom: 24 * scale,
    alignItems: 'center',
    width: '100%',
  },
  heroImage: {
    width: 156 * scale,
    height: 156 * scale,
  },
  headlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20 * scale,
    paddingHorizontal: 8 * scale,
    width: '100%',
  },
  readyWithHighlight: {
    position: 'relative',
    justifyContent: 'center',
  },
  readyHighlightBox: {
    position: 'absolute',
    left: -10 * scale,
    top: (((28 - 13) / 2) + 8) * scale,
    width: 42 * scale,
    height: 13 * scale,
    borderRadius: 5 * scale,
    backgroundColor: 'rgba(255, 177, 49, 0.3)',
  },
  readyText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 22 * scale,
    lineHeight: Math.round(28 * scale),
    color: 'rgb(14, 38, 43)',
    zIndex: 1,
  },
  headlineText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 22 * scale,
    lineHeight: Math.round(28 * scale),
    color: 'rgb(14, 38, 43)',
  },
  bodyBlock: {
    textAlign: 'center',
    marginBottom: 18 * scale,
    paddingHorizontal: 4 * scale,
    width: '100%',
  },
  bodyMuted: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    lineHeight: Math.round(22 * scale),
    color: 'rgb(171, 171, 171)',
  },
  bodyStrong: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    lineHeight: Math.round(22 * scale),
    color: 'rgb(14, 38, 43)',
  },
  pickupBlock: {
    textAlign: 'center',
    paddingHorizontal: 4 * scale,
    width: '100%',
  },
  pickupAddress: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    lineHeight: Math.round(22 * scale),
    color: COLORS.GREENY_BLUE_TWO,
    marginTop: 4 * scale,
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
