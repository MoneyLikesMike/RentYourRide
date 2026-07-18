import React, { useMemo } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useGuestBookings } from '../context/GuestBookingsContext';
import { useListings } from '../context/ListingsContext';
import { formatTripDateTime } from '../utils/guestBookingFormat';
import { GUEST_RENTAL_ACKNOWLEDGMENT_TERMS } from '../constants/guestRentalAcknowledgmentTerms';
import { HOST_RENTAL_ACKNOWLEDGMENT_TERMS } from '../constants/hostRentalAcknowledgmentTerms';
import PictureDocumentationPlaceholderGrid from '../components/PictureDocumentationPlaceholderGrid';

const { width: screenWidth } = Dimensions.get('window');
const scale = uiScale;

const EXTRA_DISPLAY_ORDER = ['clean', 'kms', 'fuel', 'delivery'];

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

function formatSignedDateTime(ts) {
  if (ts == null || !Number.isFinite(Number(ts))) return null;
  const d = new Date(Number(ts));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function noteOrNone(s) {
  const t = (s || '').trim();
  return t || 'None noted';
}

function SignatureBlock({ roleLabel, signerName, signedAt }) {
  const when = formatSignedDateTime(signedAt);
  return (
    <View style={styles.sigBlock}>
      <Text style={styles.sigBlockRole}>{roleLabel}</Text>
      <Text style={styles.sigBlockName}>{signerName?.trim() || '—'}</Text>
      <Text style={styles.sigBlockWhen}>{when ? `Signed ${when}` : 'Not on file'}</Text>
    </View>
  );
}

export default function CompletedRentalAgreementScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { bookingId, perspective } = route.params || {};
  const isGuestPerspective = perspective === 'guest';
  const { getBookingById } = useGuestBookings();
  const { listings } = useListings();

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
    const addr = norm(ls.pickupAddress);
    if (t && addr) {
      const byAddr = listings.find((l) => norm(l.title) === t && norm(l.pickupAddress) === addr);
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
  const tripFee = p.tripFee != null ? Number(p.tripFee) : null;
  const grandTotal = p.grandTotal != null ? Number(p.grandTotal) : null;

  const guestCheckInNotes = noteOrNone(
    booking?.guestCheckInDamageNotes || booking?.rentalAgreementDamageNotes
  );
  const hostCheckInNotes = noteOrNone(booking?.hostCheckInDamageNotes || booking?.hostRentalAgreementDamageNotes);
  const guestCheckoutNotes = noteOrNone(booking?.guestCheckoutDamageNotes);
  const hostCheckoutNotes = noteOrNone(booking?.hostCheckoutDamageNotes);

  const photosGuestCheckIn = useMemo(
    () => (Array.isArray(booking?.checkInConditionPhotos) ? booking.checkInConditionPhotos : []),
    [booking?.checkInConditionPhotos]
  );
  const photosHostCheckIn = useMemo(
    () => (Array.isArray(booking?.hostCheckInConditionPhotos) ? booking.hostCheckInConditionPhotos : []),
    [booking?.hostCheckInConditionPhotos]
  );
  const photosGuestCheckout = useMemo(
    () => (Array.isArray(booking?.guestCheckoutConditionPhotos) ? booking.guestCheckoutConditionPhotos : []),
    [booking?.guestCheckoutConditionPhotos]
  );
  const photosHostCheckout = useMemo(
    () => (Array.isArray(booking?.hostCheckoutConditionPhotos) ? booking.hostCheckoutConditionPhotos : []),
    [booking?.hostCheckoutConditionPhotos]
  );

  const hasRecord =
    booking &&
    (isGuestPerspective
      ? booking.guestCheckoutRentalAgreementSignedAt != null
      : booking.hostCheckoutRentalAgreementSignedAt != null);

  if (!booking || !hasRecord) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24, paddingHorizontal: 20 * scale }]}>
        <Text style={styles.missing}>Rental agreement not found or not completed.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkBtn}>
          <Text style={styles.linkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke={COLORS.MANGO_TWO} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={2}>
          RENTAL AGREEMENT RECORD
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 * scale }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Full record for this trip: check-in and check-out signatures, damage notes, condition photos, pricing summary, and
          acknowledgment terms.
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
          <Text style={[styles.valueRight, styles.valueRightShrink]} numberOfLines={4}>
            {vehicleTitle}
          </Text>
        </View>
        <View style={styles.hairline} />
        <View style={styles.rowPair}>
          <Text style={styles.labelLeft}>VIN</Text>
          <Text style={styles.valueRightMuted} numberOfLines={3}>
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
          {tripFee != null && Number.isFinite(tripFee) ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Trip fee</Text>
              <Text style={styles.summaryValue}>${tripFee.toFixed(2)}</Text>
            </View>
          ) : null}
          {grandTotal != null && Number.isFinite(grandTotal) ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelStrong}>Total charged</Text>
              <Text style={styles.summaryValueStrong}>${grandTotal.toFixed(2)}</Text>
            </View>
          ) : null}

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

        <Text style={styles.phaseHeading}>CHECK-IN</Text>
        <Text style={styles.phaseSub}>Signatures</Text>
        <SignatureBlock
          roleLabel="Guest (check-in)"
          signerName={booking?.rentalAgreementSignerName}
          signedAt={booking?.rentalAgreementSignedAt}
        />
        <SignatureBlock
          roleLabel="Host (check-in)"
          signerName={booking?.hostRentalAgreementSignerName}
          signedAt={booking?.hostRentalAgreementSignedAt}
        />

        <Text style={[styles.phaseSub, styles.phaseSubSpaced]}>Damage notes</Text>
        <Text style={styles.damagePartyLabel}>Guest</Text>
        <Text style={styles.damageNotesBody}>{guestCheckInNotes}</Text>
        <Text style={styles.damagePartyLabel}>Host</Text>
        <Text style={styles.damageNotesBody}>{hostCheckInNotes}</Text>

        <Text style={[styles.phaseSub, styles.phaseSubSpaced]}>Condition photos</Text>
        <Text style={styles.photoPartyLabel}>Guest</Text>
        <PictureDocumentationPlaceholderGrid photos={photosGuestCheckIn} />
        <Text style={styles.photoPartyLabel}>Host</Text>
        <PictureDocumentationPlaceholderGrid photos={photosHostCheckIn} />

        <View style={styles.sectionDivider} />

        <Text style={styles.phaseHeading}>CHECK-OUT</Text>
        <Text style={styles.phaseSub}>Signatures</Text>
        <SignatureBlock
          roleLabel="Guest (check-out)"
          signerName={booking?.guestCheckoutRentalAgreementSignerName}
          signedAt={booking?.guestCheckoutRentalAgreementSignedAt}
        />
        <SignatureBlock
          roleLabel="Host (check-out)"
          signerName={booking?.hostCheckoutRentalAgreementSignerName}
          signedAt={booking?.hostCheckoutRentalAgreementSignedAt}
        />

        <Text style={[styles.phaseSub, styles.phaseSubSpaced]}>Damage notes</Text>
        <Text style={styles.damagePartyLabel}>Guest</Text>
        <Text style={styles.damageNotesBody}>{guestCheckoutNotes}</Text>
        <Text style={styles.damagePartyLabel}>Host</Text>
        <Text style={styles.damageNotesBody}>{hostCheckoutNotes}</Text>

        <Text style={[styles.phaseSub, styles.phaseSubSpaced]}>Condition photos</Text>
        <Text style={styles.photoPartyLabel}>Guest</Text>
        <PictureDocumentationPlaceholderGrid photos={photosGuestCheckout} />
        <Text style={styles.photoPartyLabel}>Host</Text>
        <PictureDocumentationPlaceholderGrid photos={photosHostCheckout} />

        <View style={styles.sectionDivider} />

        <Text style={styles.blockSectionTitle}>ACKNOWLEDGMENT TERMS (GUEST)</Text>
        <View style={styles.termsCard}>
          <Text style={styles.termsBody}>{GUEST_RENTAL_ACKNOWLEDGMENT_TERMS}</Text>
        </View>

        <Text style={styles.blockSectionTitle}>ACKNOWLEDGMENT TERMS (HOST)</Text>
        <View style={styles.termsCard}>
          <Text style={styles.termsBody}>{HOST_RENTAL_ACKNOWLEDGMENT_TERMS}</Text>
        </View>
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
    fontSize: 13 * scale,
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
  phaseHeading: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.5,
    marginBottom: 6 * scale,
  },
  phaseSub: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: 'rgb(100, 100, 100)',
    letterSpacing: 0.3,
    marginBottom: 10 * scale,
  },
  phaseSubSpaced: {
    marginTop: 16 * scale,
  },
  sigBlock: {
    backgroundColor: 'rgba(248, 248, 248, 1)',
    borderRadius: 10 * scale,
    padding: 12 * scale,
    marginBottom: 10 * scale,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8E8',
  },
  sigBlockRole: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 10 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.6,
    marginBottom: 4 * scale,
  },
  sigBlockName: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: 'rgb(14, 38, 43)',
  },
  sigBlockWhen: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: 'rgb(120, 120, 120)',
    marginTop: 4 * scale,
  },
  damagePartyLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    marginBottom: 6 * scale,
    marginTop: 8 * scale,
  },
  photoPartyLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: 'rgb(14, 38, 43)',
    marginBottom: 8 * scale,
    marginTop: 12 * scale,
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
  summaryLabelStrong: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 13 * scale,
    color: 'rgb(14, 38, 43)',
    flex: 1,
    marginRight: 8 * scale,
  },
  summaryValue: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: '#8E8E8E',
  },
  summaryValueStrong: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 14 * scale,
    color: COLORS.GREENY_BLUE_TWO,
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
    paddingVertical: 12 * scale,
    marginBottom: 16 * scale,
  },
  termsBody: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    lineHeight: 19 * scale,
    color: 'rgb(14, 38, 43)',
  },
  missing: {
    textAlign: 'center',
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    color: '#888',
  },
  linkBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    color: COLORS.GREENY_BLUE_TWO,
  },
});
