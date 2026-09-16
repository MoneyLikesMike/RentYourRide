import React, { useMemo, useState, useCallback, useRef } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useGuestBookings } from '../context/GuestBookingsContext';
import { useBookingUpdate } from '../hooks/useBookingUpdate';
import { useListings } from '../context/ListingsContext';
import { formatTripDateTime } from '../utils/guestBookingFormat';
import { HOST_RENTAL_ACKNOWLEDGMENT_TERMS } from '../constants/hostRentalAcknowledgmentTerms';
import PictureDocumentationPlaceholderGrid from '../components/PictureDocumentationPlaceholderGrid';

const { width: screenWidth } = Dimensions.get('window');
const scale = uiScale;

const EXTRA_DISPLAY_ORDER = ['clean', 'kms', 'fuel', 'delivery'];
const TERMS_BOX_MAX_HEIGHT = 200 * scale;
const TERMS_SCROLL_END_THRESHOLD = 28;

function vinFromListingFields(obj) {
  if (!obj || typeof obj !== 'object') return '';
  const vd = obj.vehicleData;
  const v = obj.vin ?? (vd && typeof vd === 'object' ? vd.vin ?? vd.VIN : null);
  if (v == null) return '';
  const s = String(v).trim();
  return s || '';
}

function platePartsFromListingFields(obj) {
  if (!obj || typeof obj !== 'object') return { plate: '', prov: '' };
  const plate = obj.licensePlate != null ? String(obj.licensePlate).trim() : '';
  const prov = obj.licenseProvince != null ? String(obj.licenseProvince).trim() : '';
  return { plate, prov };
}

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

export default function HostRentalAgreementSignScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { bookingId, checkoutFlow } = route.params || {};
  const isCheckoutFlow = checkoutFlow === true;
  const { getBookingById } = useGuestBookings();
  const { applyBookingUpdate } = useBookingUpdate();
  const { listings } = useListings();

  const [reviewedSummary, setReviewedSummary] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [termsReachedEnd, setTermsReachedEnd] = useState(false);
  const termsViewportHRef = useRef(0);

  const booking = useMemo(() => (bookingId ? getBookingById(bookingId) : null), [bookingId, getBookingById]);

  const ls = booking?.listingSnapshot || {};
  const p = booking?.pricing || {};
  const extras = Array.isArray(booking?.extras) ? booking.extras : [];

  const catalogListing = useMemo(() => {
    const norm = (s) => (s == null || s === '' ? '' : String(s).trim().toLowerCase());
    if (ls?.id != null && ls.id !== '') {
      const sid = String(ls.id);
      const byId = listings.find((l) => String(l.id) === sid);
      if (byId) return byId;
    }
    const t = norm(ls.title);
    const p = norm(ls.pickupAddress);
    if (t && p) {
      const byAddr = listings.find((l) => norm(l.title) === t && norm(l.pickupAddress) === p);
      if (byAddr) return byAddr;
    }
    return null;
  }, [listings, ls?.id, ls?.title, ls?.pickupAddress]);

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

  const guestName = booking?.guestName || 'Guest';
  const hostName = ls.hostName || 'Host';

  const vehicleTitle = useMemo(() => {
    const parts = [ls.year, ls.make, ls.model].filter(Boolean);
    if (parts.length) return parts.join(' ');
    const vd = catalogListing?.vehicleData;
    const fromCatalog = [vd?.year, vd?.make, vd?.model].filter(Boolean);
    if (fromCatalog.length) return fromCatalog.join(' ');
    return ls.title || catalogListing?.title || '—';
  }, [ls.year, ls.make, ls.model, ls.title, catalogListing?.title, catalogListing?.vehicleData]);

  const vinDisplay = useMemo(() => {
    const v = vinFromListingFields(ls) || vinFromListingFields(catalogListing);
    return v || '—';
  }, [ls, catalogListing]);

  const plateDisplay = useMemo(() => {
    const a = platePartsFromListingFields(ls);
    const b = platePartsFromListingFields(catalogListing);
    const plate = a.plate || b.plate;
    const prov = a.prov || b.prov;
    if (plate && prov) return `${plate} · ${prov}`;
    return plate || prov || '—';
  }, [ls, catalogListing]);

  const startFmt = useMemo(
    () => formatTripDateTime(booking?.bookingDates?.start, booking?.bookingDates?.startTime),
    [booking?.bookingDates?.start, booking?.bookingDates?.startTime]
  );
  const endFmt = useMemo(
    () => formatTripDateTime(booking?.bookingDates?.end, booking?.bookingDates?.endTime),
    [booking?.bookingDates?.end, booking?.bookingDates?.endTime]
  );

  const pickupAddr = booking?.pickupAddress || ls.pickupAddress || '—';
  const dropoffAddr = booking?.dropoffAddress || booking?.pickupAddress || ls.pickupAddress || '—';

  const kmIncluded = p.kmIncludedLabel || '—';
  const pricePerDay = Number(p.pricePerDay ?? ls.pricePerDay ?? 0);
  const tripDays = p.tripDays ?? 1;
  const damageNotes = isCheckoutFlow
    ? (booking?.hostCheckoutDamageNotes || booking?.hostRentalAgreementDamageNotes || '').trim() || 'None noted'
    : (booking?.hostCheckInDamageNotes || booking?.hostRentalAgreementDamageNotes || '').trim() || 'None noted';

  const hostSignPhotos = useMemo(() => {
    if (isCheckoutFlow) {
      return Array.isArray(booking?.hostCheckoutConditionPhotos) ? booking.hostCheckoutConditionPhotos : [];
    }
    return Array.isArray(booking?.hostCheckInConditionPhotos) ? booking.hostCheckInConditionPhotos : [];
  }, [booking?.hostCheckInConditionPhotos, booking?.hostCheckoutConditionPhotos, isCheckoutFlow]);

  const canSign = termsReachedEnd && reviewedSummary && signerName.trim().length > 1;

  const onTermsScroll = useCallback((e) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const vh = layoutMeasurement.height;
    const ch = contentSize.height;
    if (ch <= vh + 8) {
      setTermsReachedEnd(true);
      return;
    }
    if (contentOffset.y + vh >= ch - TERMS_SCROLL_END_THRESHOLD) {
      setTermsReachedEnd(true);
    }
  }, []);

  const onTermsContentSizeChange = useCallback((_w, contentHeight) => {
    const vh = termsViewportHRef.current > 0 ? termsViewportHRef.current : TERMS_BOX_MAX_HEIGHT;
    if (contentHeight > 0 && contentHeight <= vh + 8) {
      setTermsReachedEnd(true);
    }
  }, []);

  const onTermsScrollViewLayout = useCallback((e) => {
    termsViewportHRef.current = e.nativeEvent.layout.height;
  }, []);

  const onSignComplete = useCallback(async () => {
    if (!canSign || !booking?.id) {
      Alert.alert(
        'Required',
        !termsReachedEnd
          ? 'Please scroll through the terms, confirm the checkbox, and enter your full name.'
          : 'Please confirm the summary and enter your full name to sign.'
      );
      return;
    }
    if (isCheckoutFlow) {
      const ok = await applyBookingUpdate(
        booking.id,
        {
          hostCheckoutRentalAgreementSignedAt: Date.now(),
          hostCheckoutRentalAgreementSignerName: signerName.trim(),
        },
        { errorTitle: 'Could not sign agreement' },
      );
      if (ok) {
        navigation.navigate('HostCheckoutTripCompleteScreen', { bookingId: booking.id });
      }
      return;
    }
    const ok = await applyBookingUpdate(
      booking.id,
      {
        hostCheckedInAt: Date.now(),
        hostRentalAgreementCompletedAt: Date.now(),
        hostRentalAgreementSignedAt: Date.now(),
        hostRentalAgreementSignerName: signerName.trim(),
      },
      { errorTitle: 'Could not sign agreement' },
    );
    if (ok) {
      navigation.navigate('HostCheckInReminderScreen', { bookingId: booking.id });
    }
  }, [canSign, booking?.id, signerName, navigation, applyBookingUpdate, termsReachedEnd, isCheckoutFlow]);

  if (!booking) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24, paddingHorizontal: 20 * scale }]}>
        <Text style={styles.missing}>Booking not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkBtn}>
          <Text style={styles.linkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          VERIFY & SIGN
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 * scale }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          {isCheckoutFlow
            ? 'Review this summary of your rental agreement check-out as the host. When you sign, your check-out is recorded.'
            : 'Review this summary of your rental agreement check-in as the host. When you sign, your check-in is recorded.'}
        </Text>

        <Text style={styles.blockSectionTitle}>PARTIES</Text>
        <View style={styles.rowPair}>
          <Text style={styles.labelLeft}>GUEST</Text>
          <Text style={styles.valueRight}>{guestName}</Text>
        </View>
        <View style={styles.hairline} />
        <View style={styles.rowPair}>
          <Text style={styles.labelLeft}>HOST</Text>
          <Text style={styles.valueRight}>{hostName}</Text>
        </View>
        <View style={styles.hairline} />

        <Text style={styles.blockSectionTitle}>TRIP</Text>
        <View style={styles.rowPair}>
          <Text style={styles.labelLeft}>VEHICLE</Text>
          <Text style={[styles.valueRight, styles.valueRightShrink]} numberOfLines={3}>
            {vehicleTitle}
          </Text>
        </View>
        <View style={styles.hairline} />
        <View style={styles.rowPair}>
          <Text style={styles.labelLeft}>VIN</Text>
          <Text style={styles.valueRightMuted} numberOfLines={2}>
            {vinDisplay}
          </Text>
        </View>
        <View style={styles.hairline} />
        <View style={styles.rowPair}>
          <Text style={styles.labelLeft}>PLATE</Text>
          <Text style={styles.valueRightMuted} numberOfLines={2}>
            {plateDisplay}
          </Text>
        </View>
        <View style={styles.hairline} />

        <View style={styles.twoCol}>
          <View style={styles.colHalf}>
            <Text style={styles.subLabel}>TRIP START</Text>
            <Text style={styles.subDate}>{startFmt.dateLine || '—'}</Text>
            <Text style={styles.subTime}>{startFmt.timeLine || ''}</Text>
          </View>
          <View style={styles.colHalf}>
            <Text style={styles.subLabel}>TRIP END</Text>
            <Text style={styles.subDate}>{endFmt.dateLine || '—'}</Text>
            <Text style={styles.subTime}>{endFmt.timeLine || ''}</Text>
          </View>
        </View>
        <View style={styles.hairline} />

        <View style={styles.twoCol}>
          <View style={styles.colHalf}>
            <Text style={styles.sectionTitleDark}>PICK UP LOCATION</Text>
            <Text style={styles.blockText}>{pickupAddr}</Text>
          </View>
          <View style={styles.colHalf}>
            <Text style={styles.sectionTitleDark}>DROP OFF LOCATION</Text>
            <Text style={styles.blockText}>{dropoffAddr}</Text>
          </View>
        </View>
        <View style={styles.hairline} />

        <Text style={styles.blockSectionTitle}>TRIP DETAILS</Text>
        <View style={styles.tripSummarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Kilometres included in this trip</Text>
            <Text style={styles.summaryValue}>{kmIncluded}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Price per day</Text>
            <Text style={styles.summaryValue}>${pricePerDay.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Number of days</Text>
            <Text style={styles.summaryValue}>{tripDays}</Text>
          </View>

          {sortedExtras.length > 0 ? (
            <>
              <View style={styles.rowDivider} />
              <Text style={styles.selectedExtrasHeader}>SELECTED EXTRAS</Text>
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
            </>
          ) : (
            <Text style={styles.extrasEmpty}>No extras on this trip</Text>
          )}
        </View>

        <View style={styles.sectionDivider} />

        <Text style={styles.blockSectionTitle}>PICTURE DOCUMENTATION</Text>
        <Text style={styles.pictureSub}>Take pictures of the car from all angles</Text>
        <PictureDocumentationPlaceholderGrid photos={hostSignPhotos} />

        <View style={styles.sectionDivider} />

        <Text style={styles.blockSectionTitle}>DAMAGE NOTES</Text>
        <Text style={styles.damageNotesBody}>{damageNotes}</Text>

        <View style={styles.sectionDivider} />

        <Text style={styles.blockSectionTitle}>HOST ACKNOWLEDGMENT & TERMS</Text>
        <View style={styles.termsCard}>
          <ScrollView
            style={styles.termsScroll}
            contentContainerStyle={styles.termsScrollInner}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            onScroll={onTermsScroll}
            scrollEventThrottle={16}
            onContentSizeChange={onTermsContentSizeChange}
            onLayout={onTermsScrollViewLayout}
          >
            <Text style={styles.termsBody}>{HOST_RENTAL_ACKNOWLEDGMENT_TERMS}</Text>
          </ScrollView>
        </View>
        {!termsReachedEnd ? (
          <Text style={styles.termsScrollHint}>Scroll through the terms above to continue.</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.checkRow, !termsReachedEnd && styles.checkRowLocked]}
          onPress={() => {
            if (!termsReachedEnd) {
              Alert.alert('Terms', 'Please scroll to the bottom of the terms box first.');
              return;
            }
            setReviewedSummary((v) => !v);
          }}
          activeOpacity={0.85}
        >
          <View style={[styles.checkBox, reviewedSummary && styles.checkBoxOn]}>
            {reviewedSummary ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
          <Text style={[styles.checkLabel, !termsReachedEnd && styles.checkLabelMuted]}>
            I have read this summary and the host acknowledgment and terms above, and I confirm they
            accurately reflect my rental agreement {isCheckoutFlow ? 'check-out' : 'check-in'}.
          </Text>
        </TouchableOpacity>

        <Text style={styles.signatureLabel}>Full name (electronic signature)</Text>
        <TextInput
          style={[styles.signatureInput, !termsReachedEnd && styles.signatureInputLocked]}
          value={signerName}
          onChangeText={setSignerName}
          placeholder={termsReachedEnd ? 'Type your full legal name' : 'Scroll terms above first'}
          placeholderTextColor="rgb(171, 171, 171)"
          autoCapitalize="words"
          autoCorrect={false}
          editable={termsReachedEnd}
        />

        <TouchableOpacity
          style={[styles.signBtn, !canSign && styles.signBtnDisabled]}
          onPress={onSignComplete}
          disabled={!canSign}
          activeOpacity={0.88}
        >
          <Text style={styles.signBtnText}>
            {isCheckoutFlow ? 'Sign & complete check-out' : 'Sign & complete check-in'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    color: 'rgb(100, 100, 100)',
    letterSpacing: 0.2,
    flex: 1,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20 * scale,
    paddingTop: 8,
  },
  lead: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    lineHeight: 21 * scale,
    color: 'rgb(100, 100, 100)',
    marginBottom: 16 * scale,
  },
  blockSectionTitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: 'rgb(100, 100, 100)',
    letterSpacing: 0.8,
    marginBottom: 10 * scale,
    marginTop: 8 * scale,
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
  valueRightShrink: {
    flexShrink: 1,
  },
  valueRightMuted: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: '#8E8E8E',
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
  tripSummarySection: {
    marginTop: 4 * scale,
    marginBottom: 4 * scale,
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
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(151, 151, 151, 0.22)',
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
  extrasEmpty: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: 'rgb(171, 171, 171)',
    marginTop: 4 * scale,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    marginVertical: 20 * scale,
  },
  pictureSub: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: 'rgb(171, 171, 171)',
    marginBottom: 12 * scale,
    textAlign: 'center',
  },
  damageNotesBody: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    lineHeight: 20 * scale,
    color: 'rgb(14, 38, 43)',
  },
  termsCard: {
    backgroundColor: 'rgb(248, 248, 248)',
    borderRadius: 10 * scale,
    paddingHorizontal: 12 * scale,
    paddingVertical: 10 * scale,
    marginBottom: 4 * scale,
    overflow: 'hidden',
  },
  termsScroll: {
    maxHeight: TERMS_BOX_MAX_HEIGHT,
  },
  termsScrollInner: {
    paddingBottom: 6 * scale,
  },
  termsBody: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    lineHeight: 19 * scale,
    color: 'rgb(14, 38, 43)',
  },
  termsScrollHint: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    marginBottom: 12 * scale,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8 * scale,
    marginBottom: 16 * scale,
  },
  checkRowLocked: {
    opacity: 0.45,
  },
  checkBox: {
    width: 22 * scale,
    height: 22 * scale,
    borderWidth: 2,
    borderColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 4 * scale,
    marginRight: 10 * scale,
    marginTop: 2 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
  },
  checkMark: {
    color: '#fff',
    fontSize: 12 * scale,
    fontWeight: 'bold',
  },
  checkLabel: {
    flex: 1,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    lineHeight: 20 * scale,
    color: COLORS.GREENY_BLUE_TWO,
  },
  checkLabelMuted: {
    opacity: 0.48,
  },
  signatureLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: 'rgb(100, 100, 100)',
    marginBottom: 8 * scale,
  },
  signatureInput: {
    borderWidth: 1,
    borderColor: 'rgb(220, 220, 220)',
    borderRadius: 10 * scale,
    paddingHorizontal: 14 * scale,
    paddingVertical: 12 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: 'rgb(14, 38, 43)',
    marginBottom: 24 * scale,
  },
  signatureInputLocked: {
    backgroundColor: 'rgb(250, 250, 250)',
    opacity: 0.85,
  },
  signBtn: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25 * scale,
    paddingVertical: 16 * scale,
    alignItems: 'center',
  },
  signBtnDisabled: {
    opacity: 0.45,
  },
  signBtnText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: '#fff',
    letterSpacing: 0.3,
  },
  missing: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: 'rgb(120, 120, 120)',
  },
  linkBtn: {
    marginTop: 16 * scale,
  },
  linkText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: COLORS.GREENY_BLUE_TWO,
  },
});
