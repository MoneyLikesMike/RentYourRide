import React, { useMemo, useState } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Alert,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { SERVICE_FEE_DISCLOSURE_TEXT } from '../constants/serviceFeeDisclosure';
import { useGuestBookings } from '../context/GuestBookingsContext';
import { formatTripDateTime } from '../utils/guestBookingFormat';
import { computeHostServiceFee, getHostNetEarnings } from '../utils/hostBookingEarnings';
import { listingFromBookingSnapshot } from '../utils/bookingListing';
import { navigateToUserProfile, navigateToVehicleDetail } from '../utils/navigateRootStack';
import { openBookingChat } from '../utils/openBookingChat';

const { width: screenWidth } = Dimensions.get('window');
const scale = uiScale;

const EXTRA_DISPLAY_ORDER = ['clean', 'kms', 'fuel', 'delivery'];

const CANCELLATION_POLICY_URL = 'https://rentyourride.com/terms';

function getExtraIconSource(key) {
  switch (key) {
    case 'clean':
      return require('../assets/icons/cleanCar.png');
    case 'kms':
      return require('../assets/icons/road.png');
    case 'fuel':
      return require('../assets/icons/fuel.png');
    case 'delivery':
      return require('../assets/icons/shorttrip.png');
    default:
      return require('../assets/icons/checkmark.png');
  }
}

export default function HostBookingDetailsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { bookingId } = route.params || {};
  const { getBookingById, cancelGuestBooking, acceptGuestBooking, declineGuestBooking, respondExtension, pendingRequests } =
    useGuestBookings();
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  const booking = useMemo(() => (bookingId ? getBookingById(bookingId) : null), [bookingId, getBookingById]);

  const isPendingRequest = useMemo(
    () => !!(bookingId && pendingRequests.some((b) => b.id === bookingId)),
    [bookingId, pendingRequests]
  );

  const isExtensionPending = booking?.status === 'extension_pending';

  if (!booking) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke={COLORS.MANGO_TWO} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.missingText}>Booking not found.</Text>
      </View>
    );
  }

  const ls = booking.listingSnapshot || {};
  const p = booking.pricing || {};
  const startFmt = formatTripDateTime(booking.bookingDates?.start, booking.bookingDates?.startTime);
  const endFmt = formatTripDateTime(booking.bookingDates?.end, booking.bookingDates?.endTime);
  const extras = Array.isArray(booking.extras) ? booking.extras : [];
  const sortedExtras = useMemo(() => {
    return [...extras].sort((a, b) => {
      const ia = EXTRA_DISPLAY_ORDER.indexOf(a.key);
      const ib = EXTRA_DISPLAY_ORDER.indexOf(b.key);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [extras]);

  const tripDays = p.tripDays ?? 1;
  const pricePerDay = Number(p.pricePerDay ?? ls.pricePerDay ?? 0);
  const discountedTripSubtotal = Number(p.discountedTripSubtotal ?? 0);
  const baseTripSubtotal = Number(
    p.baseTripSubtotal != null && p.baseTripSubtotal !== '' ? p.baseTripSubtotal : discountedTripSubtotal
  );
  const tripDiscountSavings = Math.max(0, Number(p.tripDiscountSavings ?? 0));
  const extrasSum = sortedExtras.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const subtotalGuest = Number(
    p.subtotal != null && p.subtotal !== '' ? p.subtotal : discountedTripSubtotal + extrasSum
  );

  const serviceFeeHost = computeHostServiceFee(discountedTripSubtotal);
  const yourTotalEarnings = getHostNetEarnings(booking);

  const kmIncludedDisplay = p.kmIncludedLabel || '—';
  const guestName = booking.guestName || 'Guest';
  const introMessage = (booking.introMessage || '').trim();

  const openGuestProfile = () => {
    navigateToUserProfile(navigation, {
      profileUser: {
        userId: booking.guestUserId || null,
        displayName: guestName,
        photoUri: booking.guestPhotoUri || null,
      },
    });
  };

  const openVehicleDetail = () => {
    const listing = listingFromBookingSnapshot(booking);
    if (!listing) return;
    navigateToVehicleDetail(navigation, listing);
  };

  const openCancellationPolicy = () => {
    Linking.openURL(CANCELLATION_POLICY_URL).catch(() => {});
  };

  const onDeny = () => {
    Alert.alert('Deny request', 'Turn down this booking request?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Deny',
        style: 'destructive',
        onPress: async () => {
          await declineGuestBooking(booking.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const onAccept = async () => {
    await acceptGuestBooking(booking.id);
    navigation.navigate('ActiveRentalsScreen', { initialTab: 'host' });
  };

  const onApproveExtension = async () => {
    await respondExtension(booking.id, true);
    navigation.goBack();
  };

  const onDenyExtension = () => {
    Alert.alert('Decline extension', 'Turn down this trip extension?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          await respondExtension(booking.id, false);
          navigation.goBack();
        },
      },
    ]);
  };

  const confirmCancelTrip = async () => {
    setCancelModalVisible(false);
    await cancelGuestBooking(booking.id);
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke={COLORS.MANGO_TWO} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>BOOKING DETAILS</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.rowPair} onPress={openGuestProfile} activeOpacity={0.7}>
          <Text style={styles.labelLeft}>GUEST</Text>
          <Text style={styles.valueRight}>{guestName}</Text>
        </TouchableOpacity>
        <View style={styles.hairline} />
        <TouchableOpacity style={styles.rowPair} onPress={openVehicleDetail} activeOpacity={0.7}>
          <Text style={styles.labelLeft}>VEHICLE</Text>
          <Text style={styles.valueRight}>{ls.title || '—'}</Text>
        </TouchableOpacity>
        <View style={styles.hairline} />

        <View style={styles.twoCol}>
          <View style={styles.colHalf}>
            <Text style={styles.subLabel}>TRIP START</Text>
            <Text style={styles.subDate}>{startFmt.dateLine}</Text>
            <Text style={styles.subTime}>{startFmt.timeLine}</Text>
          </View>
          <View style={styles.colHalf}>
            <Text style={styles.subLabel}>TRIP END</Text>
            <Text style={styles.subDate}>{endFmt.dateLine}</Text>
            <Text style={styles.subTime}>{endFmt.timeLine}</Text>
          </View>
        </View>
        <View style={styles.hairline} />

        <View style={styles.twoCol}>
          <View style={styles.colHalf}>
            <Text style={styles.sectionTitleDark}>PICK UP LOCATION</Text>
            <Text style={styles.blockText}>{booking.pickupAddress || ls.pickupAddress || '—'}</Text>
          </View>
          <View style={styles.colHalf}>
            <Text style={styles.sectionTitleDark}>DROP OFF LOCATION</Text>
            <Text style={styles.blockText}>{booking.dropoffAddress || booking.pickupAddress || '—'}</Text>
          </View>
        </View>
        <View style={styles.hairline} />

        <View style={styles.guestMessageBlock}>
          <Text style={styles.sectionTitleDark}>GUEST MESSAGE</Text>
          <Text style={[styles.blockText, styles.guestMessageBody]}>
            {introMessage || 'No message provided.'}
          </Text>
          <TouchableOpacity
            style={styles.messageGuestBtn}
            activeOpacity={0.85}
            onPress={() => openBookingChat(navigation, bookingId)}
          >
            <Text style={styles.messageGuestBtnText}>Message guest</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.hairline} />

        <View style={styles.tripSummarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Kilometres included in this trip</Text>
            <Text style={styles.summaryValue}>{kmIncludedDisplay}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Price per day</Text>
            <Text style={styles.summaryValue}>${pricePerDay.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{tripDays} days</Text>
            <Text style={styles.summaryValue}>${baseTripSubtotal.toFixed(2)}</Text>
          </View>
          {tripDiscountSavings > 0 ? (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {p.appliesMonthlyDiscount
                    ? `Monthly discount (${p.monthlyDiscountPct ?? 0}%)`
                    : `Weekly discount (${p.weeklyDiscountPct ?? 0}%)`}
                </Text>
                <Text style={[styles.summaryValue, styles.discountValue]}>- ${tripDiscountSavings.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Trip total (after discount)</Text>
                <Text style={styles.summaryValue}>${discountedTripSubtotal.toFixed(2)}</Text>
              </View>
            </>
          ) : null}

          {sortedExtras.length > 0 ? (
            <>
              <View style={styles.rowDivider} />
              <Text style={styles.selectedExtrasHeader}>EXTRAS YOUR GUEST SELECTED</Text>
              <View style={styles.selectedExtrasList}>
                {sortedExtras.map((ex) => (
                  <View key={ex.key} style={styles.summaryRow}>
                    <View style={styles.extraRowLeft}>
                      <Image source={getExtraIconSource(ex.key)} style={styles.extraTagIcon} resizeMode="contain" />
                      <Text style={styles.extraTagTitle}>{ex.label}</Text>
                    </View>
                    <Text style={styles.summaryValue}>${Number(ex.amount).toFixed(2)}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.greenDivider} />
            </>
          ) : null}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotalGuest.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.tripFeeRowLeft}>
              <View style={styles.tripFeeLabelInline}>
                <Text style={styles.tripFeeLabelText}>Service fee (deduction)</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert('Service fee', SERVICE_FEE_DISCLOSURE_TEXT)}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  style={styles.tripFeeInfoHit}
                >
                  <View style={styles.tripFeeInfoCircle}>
                    <Text style={styles.tripFeeInfoI}>i</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={[styles.summaryValue, styles.discountValue]}>
              - ${serviceFeeHost.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>YOUR TOTAL EARNINGS</Text>
            <Text style={styles.totalValue}>${yourTotalEarnings.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        {isPendingRequest ? (
          <>
            <TouchableOpacity style={styles.rentYourRideBtn} activeOpacity={0.85} onPress={onAccept}>
              <Text style={styles.rentYourRideBtnText}>RENT YOUR RIDE</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDeny} activeOpacity={0.7}>
              <Text style={styles.denyLink}>Deny request</Text>
            </TouchableOpacity>
          </>
        ) : isExtensionPending ? (
          <>
            <TouchableOpacity style={styles.rentYourRideBtn} activeOpacity={0.85} onPress={onApproveExtension}>
              <Text style={styles.rentYourRideBtnText}>APPROVE EXTENSION</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDenyExtension} activeOpacity={0.7}>
              <Text style={styles.denyLink}>Decline extension</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.rentYourRideBtn}
              activeOpacity={0.85}
              onPress={() => openBookingChat(navigation, bookingId)}
            >
              <Text style={styles.rentYourRideBtnText}>MESSAGE GUEST</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCancelModalVisible(true)} activeOpacity={0.7}>
              <Text style={styles.denyLink}>Cancel trip</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {!isPendingRequest ? (
        <Modal
          visible={cancelModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCancelModalVisible(false)}
        >
          <View style={styles.cancelModalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setCancelModalVisible(false)} />
            <View style={styles.cancelModalCard}>
              <View style={styles.cancelModalArt}>
                <Image
                  source={require('../assets/icons/carwithxicon.png')}
                  style={styles.cancelModalHeroImage}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.cancelModalBody}>
                There may be penalties if you decide to cancel this booking. Read our{' '}
                <Text style={styles.cancelModalLink} onPress={openCancellationPolicy}>
                  cancelation policies
                </Text>
                {' and penalties'}
              </Text>

              <View style={styles.cancelModalActions}>
                <TouchableOpacity
                  style={styles.cancelModalBtnSecondary}
                  activeOpacity={0.85}
                  onPress={() => setCancelModalVisible(false)}
                >
                  <Text style={styles.cancelModalBtnSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelModalBtnPrimary}
                  activeOpacity={0.85}
                  onPress={confirmCancelTrip}
                >
                  <Text style={styles.cancelModalBtnPrimaryText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 12 * scale,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40 * scale,
    height: 40 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingHorizontal: 20 * scale,
    paddingTop: 8,
  },
  rowPair: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12 * scale,
  },
  labelLeft: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: 'rgb(6, 6, 6)',
    letterSpacing: 0.3,
    flex: 1,
  },
  valueRight: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
    flex: 1,
    textAlign: 'right',
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E0E0E0',
  },
  twoCol: {
    flexDirection: 'row',
    paddingVertical: 12 * scale,
  },
  colHalf: {
    flex: 1,
    paddingRight: 8 * scale,
  },
  subLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 10 * scale,
    color: 'rgb(6, 6, 6)',
    marginBottom: 6 * scale,
    letterSpacing: 0.3,
  },
  sectionTitleDark: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 10 * scale,
    color: 'rgb(6, 6, 6)',
    marginBottom: 6 * scale,
    letterSpacing: 0.3,
  },
  subDate: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: 'rgb(171, 171, 171)',
    marginBottom: 4 * scale,
  },
  subTime: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: 'rgb(171, 171, 171)',
  },
  blockText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: 'rgb(171, 171, 171)',
    lineHeight: 18 * scale,
  },
  guestMessageBlock: {
    paddingVertical: 12 * scale,
  },
  guestMessageBody: {
    marginBottom: 12 * scale,
  },
  messageGuestBtn: {
    height: 50 * scale,
    borderRadius: 25 * scale,
    backgroundColor: 'rgb(255, 248, 232)',
    borderWidth: 1.5,
    borderColor: COLORS.MANGO_TWO,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  messageGuestBtnText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: COLORS.YELLOWISH_ORANGE,
    letterSpacing: 0.2,
  },
  tripSummarySection: {
    marginTop: 16 * scale,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6 * scale,
  },
  summaryLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
    flex: 1,
    marginRight: 8 * scale,
  },
  summaryValue: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: '#8E8E8E',
  },
  discountValue: {
    color: COLORS.GREENY_BLUE_TWO,
  },
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(151,151,151,0.22)',
    marginVertical: 8 * scale,
  },
  selectedExtrasHeader: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
    marginTop: 2 * scale,
    marginBottom: 4 * scale,
  },
  selectedExtrasList: {
    marginTop: 4 * scale,
    marginBottom: 6 * scale,
  },
  extraRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8 * scale,
    flexShrink: 1,
  },
  extraTagIcon: {
    width: 22 * scale,
    height: 22 * scale,
    marginRight: 8 * scale,
  },
  extraTagTitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  greenDivider: {
    height: 1,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    opacity: 0.9,
    marginTop: 12 * scale,
    marginBottom: 12 * scale,
  },
  tripFeeRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripFeeLabelInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripFeeLabelText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
  },
  tripFeeInfoHit: {
    marginLeft: 4 * scale,
  },
  tripFeeInfoCircle: {
    width: 14 * scale,
    height: 14 * scale,
    borderRadius: 7 * scale,
    borderWidth: 1.25,
    borderColor: COLORS.GREENY_BLUE_TWO,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  tripFeeInfoI: {
    fontSize: 8 * scale,
    fontFamily: FONTS.NUNITO_BOLD,
    color: COLORS.GREENY_BLUE_TWO,
    marginTop: -0.5,
  },
  totalRow: {
    marginTop: 8 * scale,
  },
  totalLabel: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 14 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
    flex: 1,
    marginRight: 8 * scale,
  },
  totalValue: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16 * scale,
    color: COLORS.GREENY_BLUE_TWO,
  },
  footer: {
    paddingHorizontal: 20 * scale,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEE',
    backgroundColor: '#fff',
  },
  rentYourRideBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  rentYourRideBtnText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 17,
    color: '#fff',
    letterSpacing: 0.3,
  },
  denyLink: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: COLORS.YELLOWISH_ORANGE,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  missingText: {
    textAlign: 'center',
    marginTop: 40,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    color: '#888',
  },
  cancelModalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 24 * scale,
  },
  cancelModalCard: {
    width: '100%',
    maxWidth: 320 * scale,
    backgroundColor: '#fff',
    borderRadius: 16 * scale,
    paddingHorizontal: 22 * scale,
    paddingTop: 28 * scale,
    paddingBottom: 22 * scale,
    zIndex: 1,
  },
  cancelModalArt: {
    alignItems: 'center',
    marginBottom: 20 * scale,
  },
  cancelModalHeroImage: {
    width: 260 * scale,
    height: 200 * scale,
    alignSelf: 'center',
  },
  cancelModalBody: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    lineHeight: 22 * scale,
    color: 'rgb(171, 171, 171)',
    letterSpacing: -0.2,
    textAlign: 'center',
    marginBottom: 22 * scale,
  },
  cancelModalLink: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: -0.2,
  },
  cancelModalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12 * scale,
  },
  cancelModalBtnSecondary: {
    flex: 1,
    height: 46 * scale,
    borderRadius: 23 * scale,
    borderWidth: 1.5,
    borderColor: COLORS.MANGO_TWO,
    backgroundColor: 'rgb(255, 248, 232)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtnSecondaryText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: COLORS.YELLOWISH_ORANGE,
    letterSpacing: 0.2,
  },
  cancelModalBtnPrimary: {
    flex: 1,
    height: 46 * scale,
    borderRadius: 23 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtnPrimaryText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: '#fff',
    letterSpacing: 0.2,
  },
});
