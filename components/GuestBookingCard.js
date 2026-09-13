import React, { useMemo } from 'react';
import { uiScale } from '../utils/uiScale';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { formatCardDateRange } from '../utils/guestBookingFormat';
import { getTripCardStatus, getTripCardPrimaryAction } from '../utils/tripCardStatus';
import { useGuestBookings } from '../context/GuestBookingsContext';

const { width: screenWidth } = Dimensions.get('window');
const scale = uiScale;

export default function GuestBookingCard({ booking, onPress }) {
  const navigation = useNavigation();
  const { updateGuestBooking, pendingRequests } = useGuestBookings();
  const isPendingHostApproval = useMemo(
    () => pendingRequests.some((b) => b.id === booking.id),
    [pendingRequests, booking.id]
  );
  const ls = booking.listingSnapshot || {};
  const hostName = ls.hostName || 'Host';
  const vehicleTitle = (ls.title || 'Vehicle').toUpperCase();
  const dateRange = formatCardDateRange(booking.bookingDates);
  const total = booking.pricing?.grandTotal ?? 0;
  const firstPhoto = Array.isArray(ls.photos) && ls.photos.length > 0 ? ls.photos[0] : null;
  const photo =
    firstPhoto == null
      ? require('../assets/icons/shape.png')
      : typeof firstPhoto === 'number'
        ? firstPhoto
        : { uri: String(firstPhoto) };

  const status = useMemo(() => getTripCardStatus(booking), [booking]);
  const primaryAction = useMemo(
    () => getTripCardPrimaryAction(status.key, { isHost: false, booking }),
    [status.key, booking]
  );

  const onCheckIn = () => {
    navigation.navigate('GuestCheckInScreen', { bookingId: booking.id });
  };

  const onCheckout = () => {
    navigation.navigate('GuestCheckoutScreen', { bookingId: booking.id });
  };

  const onExtend = () => {
    navigation.navigate('ExtendTripScreen', { bookingId: booking.id });
  };

  const runPrimaryAction = () => {
    if (primaryAction.type === 'check_in') onCheckIn();
    else if (primaryAction.type === 'checkout') onCheckout();
    else if (primaryAction.type === 'extend') onExtend();
  };

  const actionLabel =
    primaryAction.type === 'check_in'
      ? 'Check in'
      : primaryAction.type === 'checkout'
        ? 'Checkout'
        : primaryAction.type === 'extend'
          ? 'Extend trip'
          : null;

  return (
    <View style={styles.card}>
      {!isPendingHostApproval && status.label ? (
        <View style={styles.statusBadge} pointerEvents="none">
          <Text style={styles.statusBadgeText}>{status.label}</Text>
        </View>
      ) : null}

      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerMain} onPress={onPress} activeOpacity={0.88}>
            <Image source={photo} style={styles.avatar} resizeMode="cover" />
            <View style={styles.nameCol}>
              <View
                style={[styles.hostNameFrame, isPendingHostApproval && styles.hostNameFrameNoStatusInset]}
              >
                <Text style={styles.hostName} numberOfLines={1}>
                  {hostName}
                </Text>
              </View>
              <Text style={styles.wantVehicleLine} numberOfLines={3}>
                <Text style={styles.wantRent}>YOU WANT TO RENT </Text>
                <Text style={styles.vehicleTitleInner}>{vehicleTitle}</Text>
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onPress} activeOpacity={0.88}>
          <View style={styles.pillOrange}>
            <Text style={styles.pillOrangeText}>{dateRange || 'Dates pending'}</Text>
          </View>
          <View style={styles.pillTeal}>
            <View style={styles.pillTealRow}>
              <Text style={styles.pillTealLabel}>Booking cost:</Text>
              <Text style={styles.pillTealAmount}>${Number(total).toFixed(0)} CAD</Text>
            </View>
          </View>
        </TouchableOpacity>

        {!isPendingHostApproval && actionLabel ? (
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.88} onPress={runPrimaryAction}>
            <Text style={styles.actionBtnText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 331 * scale,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 12 * scale,
    marginBottom: 16 * scale,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
    overflow: 'visible',
  },
  cardContent: {
    padding: 16 * scale,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14 * scale,
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  statusBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 2,
    backgroundColor: 'rgb(255, 172, 0)',
    paddingHorizontal: 10 * scale,
    paddingVertical: 5 * scale,
    borderTopRightRadius: 12 * scale,
    borderBottomLeftRadius: 8 * scale,
    maxWidth: 140 * scale,
  },
  statusBadgeText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 10 * scale,
    color: '#fff',
    letterSpacing: 0.2,
  },
  avatar: {
    width: 52 * scale,
    height: 52 * scale,
    borderRadius: 26 * scale,
    marginRight: 12 * scale,
    backgroundColor: '#eee',
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  hostNameFrame: {
    alignSelf: 'stretch',
    minWidth: 100 * scale,
    minHeight: 20 * scale,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 2 * scale,
    paddingRight: 88 * scale,
  },
  hostNameFrameNoStatusInset: {
    paddingRight: 0,
  },
  hostName: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: 'rgb(14, 38, 43)',
    letterSpacing: 0.2,
    textAlign: 'left',
    width: '100%',
  },
  wantVehicleLine: {
    alignSelf: 'stretch',
    width: '100%',
    marginBottom: 2 * scale,
    lineHeight: Math.round(15 * scale),
  },
  wantRent: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: 'rgb(171, 171, 171)',
    letterSpacing: 0.2,
  },
  vehicleTitleInner: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
  },
  pillOrange: {
    width: 304 * scale,
    minHeight: 33 * scale,
    alignSelf: 'center',
    borderRadius: 16.5 * scale,
    backgroundColor: 'rgba(255, 248, 232, 0.95)',
    borderWidth: 1.5,
    borderColor: COLORS.MANGO_TWO,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 7 * scale,
    paddingHorizontal: 10 * scale,
    marginBottom: 8 * scale,
  },
  pillOrangeText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    lineHeight: Math.round(15 * scale),
    color: 'rgb(255, 172, 0)',
    textAlign: 'center',
    width: '100%',
    includeFontPadding: false,
  },
  pillTeal: {
    width: 304 * scale,
    minHeight: 33 * scale,
    alignSelf: 'center',
    borderRadius: 16.5 * scale,
    backgroundColor: 'rgba(138, 206, 202, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgb(138, 206, 202)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6 * scale,
    paddingHorizontal: 12 * scale,
  },
  pillTealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  pillTealLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    lineHeight: Math.round(19 * scale),
    color: 'rgb(14, 38, 43)',
    letterSpacing: 0.2,
    textAlign: 'center',
    includeFontPadding: false,
  },
  pillTealAmount: {
    marginLeft: 8 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    lineHeight: Math.round(20 * scale),
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: -0.7,
    textAlign: 'center',
    flexShrink: 0,
    includeFontPadding: false,
  },
  actionBtn: {
    marginTop: 12 * scale,
    width: 304 * scale,
    height: 38 * scale,
    borderRadius: 25 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  actionBtnText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: '#fff',
    letterSpacing: 0.2,
  },
});
