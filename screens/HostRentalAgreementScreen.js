import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useGuestBookings } from '../context/GuestBookingsContext';
import { formatTripDateTime } from '../utils/guestBookingFormat';
import PictureDocumentationPlaceholderGrid from '../components/PictureDocumentationPlaceholderGrid';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375;

const PLACEHOLDER = require('../assets/icons/shape.png');

function CheckRow({ checked, onToggle, label, labelStyle }) {
  return (
    <TouchableOpacity style={styles.checkRow} onPress={onToggle} activeOpacity={0.85}>
      <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
        {checked ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>
      <Text style={[styles.checkLabelRest, labelStyle]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HostRentalAgreementScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { bookingId, checkoutFlow } = route.params || {};
  const isCheckoutFlow = checkoutFlow === true;
  const { getBookingById, updateGuestBooking } = useGuestBookings();

  const [photoTab, setPhotoTab] = useState('host');
  const [damageNotes, setDamageNotes] = useState('');
  const [agreeInspect, setAgreeInspect] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const booking = useMemo(() => (bookingId ? getBookingById(bookingId) : null), [bookingId, getBookingById]);

  const ls = booking?.listingSnapshot || {};
  const p = booking?.pricing || {};
  const extras = Array.isArray(booking?.extras) ? booking.extras : [];

  const guestName = booking?.guestName || 'Guest';
  const hostName = ls.hostName || 'Host';
  const guestPhoto = booking?.guestPhotoUri ? { uri: String(booking.guestPhotoUri) } : PLACEHOLDER;
  const hostPhoto = ls.hostPhotoUri ? { uri: String(ls.hostPhotoUri) } : PLACEHOLDER;

  const startFmt = useMemo(
    () => formatTripDateTime(booking?.bookingDates?.start, booking?.bookingDates?.startTime),
    [booking?.bookingDates?.start, booking?.bookingDates?.startTime]
  );
  const endFmt = useMemo(
    () => formatTripDateTime(booking?.bookingDates?.end, booking?.bookingDates?.endTime),
    [booking?.bookingDates?.end, booking?.bookingDates?.endTime]
  );

  const startLine =
    startFmt.dateLine && startFmt.timeLine ? `${startFmt.dateLine} - ${startFmt.timeLine}` : '—';
  const endLine = endFmt.dateLine && endFmt.timeLine ? `${endFmt.dateLine} - ${endFmt.timeLine}` : '—';

  const kmIncluded = p.kmIncludedLabel || '—';
  const pricePerDay = Number(p.pricePerDay ?? ls.pricePerDay ?? 0);

  const guestPhotosCheckIn = useMemo(
    () => (Array.isArray(booking?.checkInConditionPhotos) ? booking.checkInConditionPhotos : []),
    [booking?.checkInConditionPhotos]
  );
  const guestPhotosCheckout = useMemo(
    () => (Array.isArray(booking?.guestCheckoutConditionPhotos) ? booking.guestCheckoutConditionPhotos : []),
    [booking?.guestCheckoutConditionPhotos]
  );
  const hostPhotosCheckIn = useMemo(
    () => (Array.isArray(booking?.hostCheckInConditionPhotos) ? booking.hostCheckInConditionPhotos : []),
    [booking?.hostCheckInConditionPhotos]
  );
  const hostPhotosCheckout = useMemo(
    () => (Array.isArray(booking?.hostCheckoutConditionPhotos) ? booking.hostCheckoutConditionPhotos : []),
    [booking?.hostCheckoutConditionPhotos]
  );

  useEffect(() => {
    if (!booking) return;
    const next = isCheckoutFlow
      ? (booking.hostCheckoutDamageNotes || '').trim()
      : (booking.hostCheckInDamageNotes || booking.hostRentalAgreementDamageNotes || '').trim();
    setDamageNotes(next);
  }, [booking?.id, isCheckoutFlow, booking?.hostCheckoutDamageNotes, booking?.hostCheckInDamageNotes, booking?.hostRentalAgreementDamageNotes]);

  const onContinue = useCallback(async () => {
    if (!agreeInspect || !agreeTerms) {
      Alert.alert('Required', 'Please confirm both conditions before continuing.');
      return;
    }
    if (!booking?.id) return;
    if (isCheckoutFlow) {
      await updateGuestBooking(booking.id, {
        hostCheckoutDamageNotes: damageNotes.trim(),
      });
    } else {
      await updateGuestBooking(booking.id, {
        hostRentalAgreementDamageNotes: damageNotes.trim(),
        hostCheckInDamageNotes: damageNotes.trim(),
      });
    }
    navigation.navigate('HostRentalAgreementSignScreen', {
      bookingId: booking.id,
      checkoutFlow: isCheckoutFlow,
    });
  }, [agreeInspect, agreeTerms, booking?.id, damageNotes, navigation, updateGuestBooking, isCheckoutFlow]);

  const onUploadPhotos = useCallback(() => {
    navigation.navigate('HostVehicleConditionPhotosScreen', {
      bookingId: booking?.id,
      checkoutFlow: isCheckoutFlow,
    });
  }, [navigation, booking?.id, isCheckoutFlow]);

  if (!booking) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20, paddingHorizontal: 16 * scale }]}>
        <TouchableOpacity style={styles.backBtnBare} onPress={() => navigation.goBack()}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke={COLORS.MANGO_TWO} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.missing}>Booking not found.</Text>
      </View>
    );
  }

  const canContinue = agreeInspect && agreeTerms;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backBtnAbsolute}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke={COLORS.MANGO_TWO} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RENTAL AGREEMENT</Text>
      </View>

      <View style={styles.phaseRow}>
        {isCheckoutFlow ? (
          <>
            <View style={styles.phaseMutedLabel} pointerEvents="none">
              <Text style={styles.phaseCheckoutText}>CHECK IN</Text>
            </View>
            <View style={[styles.phaseCheckInBox, styles.phaseSecondPhase]}>
              <Text style={styles.phaseCheckInText}>CHECK OUT</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.phaseCheckInBox}>
              <Text style={styles.phaseCheckInText}>CHECK IN</Text>
            </View>
            <View style={styles.phaseCheckoutWrap} pointerEvents="none">
              <Text style={styles.phaseCheckoutText}>CHECK OUT</Text>
            </View>
          </>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollInner, { paddingBottom: insets.bottom + 24 * scale }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.participantsRow}>
          <View style={styles.participant}>
            <Image source={guestPhoto} style={styles.avatar} resizeMode="cover" />
            <Text style={styles.participantName} numberOfLines={1}>
              {guestName}
            </Text>
            <Text style={styles.participantRole}>Guest</Text>
          </View>
          <Image source={require('../assets/icons/icCompareArrows24Px.png')} style={styles.swapIcon} resizeMode="contain" />
          <View style={styles.participant}>
            <Image source={hostPhoto} style={styles.avatar} resizeMode="cover" />
            <Text style={styles.participantName} numberOfLines={1}>
              {hostName}
            </Text>
            <Text style={styles.participantRole}>Host</Text>
          </View>
        </View>

        <View style={styles.tripTimeCard}>
          <View style={styles.tripTimeCol}>
            <Text style={styles.tripTimeLabel}>Start</Text>
            <Text style={styles.tripTimeValue}>{startLine}</Text>
          </View>
          <View style={styles.tripTimeDivider} />
          <View style={styles.tripTimeCol}>
            <Text style={styles.tripTimeLabel}>End</Text>
            <Text style={styles.tripTimeValue}>{endLine}</Text>
          </View>
        </View>

        <View style={styles.damageUploadDivider} />

        <Text style={styles.tripDetailsHeading}>TRIP DETAILS</Text>
        <View style={styles.tripDetailsSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Kilometres included in this trip</Text>
            <Text style={styles.summaryValue}>{kmIncluded}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Price per day</Text>
            <Text style={styles.summaryValue}>${pricePerDay.toFixed(2)}</Text>
          </View>
          {extras.length > 0 ? (
            <>
              <View style={styles.tripDetailsRowDivider} />
              <Text style={styles.selectedExtrasHeader}>SELECTED EXTRAS</Text>
              {extras.map((ex, i) => (
                <View key={`${ex.key}-${i}`} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{ex.label || ex.key}</Text>
                  <Text style={styles.summaryValue}>${Number(ex.amount || 0).toFixed(2)}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.extrasEmpty}>No extras on this trip</Text>
          )}
        </View>

        <View style={styles.damageUploadDivider} />

        <Text style={styles.pictureDocumentationHeading}>PICTURE DOCUMENTATION</Text>
        <Text style={[styles.sectionSub, styles.pictureDocumentationSub]}>Take pictures of the car from all angles</Text>

        <View style={styles.photoTabs}>
          <TouchableOpacity onPress={() => setPhotoTab('guest')} style={styles.photoTabBtn}>
            <Text style={[styles.photoTabText, photoTab === 'guest' && styles.photoTabTextActive]}>Guest</Text>
            {photoTab === 'guest' ? <View style={styles.photoTabUnderline} /> : null}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPhotoTab('host')} style={styles.photoTabBtn}>
            <Text style={[styles.photoTabText, photoTab === 'host' && styles.photoTabTextActive]}>Host</Text>
            {photoTab === 'host' ? <View style={styles.photoTabUnderline} /> : null}
          </TouchableOpacity>
        </View>

        <PictureDocumentationPlaceholderGrid
          photos={
            photoTab === 'guest'
              ? isCheckoutFlow
                ? guestPhotosCheckout
                : guestPhotosCheckIn
              : isCheckoutFlow
                ? hostPhotosCheckout
                : hostPhotosCheckIn
          }
        />

        <TouchableOpacity style={styles.uploadBtn} activeOpacity={0.88} onPress={onUploadPhotos}>
          <Text style={styles.uploadBtnText}>Upload photos</Text>
        </TouchableOpacity>

        <View style={styles.damageUploadDivider} />

        <Text style={styles.damageNotesHeading}>DAMAGE NOTES</Text>
        <TextInput
          style={styles.damageInput}
          placeholder="List any damage you can see on the vehicle. Be descriptive with reference to the location and size of the damage"
          placeholderTextColor="rgb(171,171,171)"
          multiline
          value={damageNotes}
          onChangeText={setDamageNotes}
          textAlignVertical="top"
        />

        <View style={styles.damageUploadDivider} />

        <Text style={styles.conditionVerificationHeading}>CONDITION VERIFICATION</Text>
        <Text style={[styles.sectionSub, styles.pictureDocumentationSub]}>
          Please ensure these conditions are met
        </Text>

        <CheckRow
          checked={agreeInspect}
          onToggle={() => setAgreeInspect((v) => !v)}
          label={
            'The vehicle has been throughly inspected and \nwashed and is in good condition for handover to the guest.'
          }
          labelStyle={styles.checkLabelCondition}
        />
        <CheckRow
          checked={agreeTerms}
          onToggle={() => setAgreeTerms((v) => !v)}
          label="I confirm both parties agree to the terms and conditions of RentYourRide"
          labelStyle={styles.checkLabelCondition}
        />

        <TouchableOpacity
          style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
          activeOpacity={0.88}
          onPress={onContinue}
          disabled={!canContinue}
        >
          <Text style={styles.continueBtnText}>CONTINUE</Text>
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
  headerRow: {
    width: '100%',
    minHeight: 44 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12 * scale,
    paddingHorizontal: 8 * scale,
    position: 'relative',
  },
  backBtnAbsolute: {
    position: 'absolute',
    left: 8 * scale,
    top: 10 * scale,
    zIndex: 2,
    paddingVertical: 8 * scale,
    paddingHorizontal: 10 * scale,
  },
  backBtnBare: {
    alignSelf: 'flex-start',
    paddingVertical: 8 * scale,
    paddingHorizontal: 10 * scale,
    marginBottom: 12 * scale,
  },
  headerTitle: {
    width: 158 * scale,
    height: 20 * scale,
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: 'rgb(100, 100, 100)',
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: Math.round(20 * scale),
    alignSelf: 'center',
  },
  phaseRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20 * scale,
    paddingHorizontal: 20 * scale,
  },
  phaseCheckInBox: {
    minWidth: 127 * scale,
    paddingHorizontal: 12 * scale,
    height: 34 * scale,
    borderRadius: 5 * scale,
    borderWidth: 2,
    borderColor: 'rgb(255, 199, 83)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phaseCheckInText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    lineHeight: Math.round(20 * scale),
    color: 'rgb(14, 38, 43)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  phaseMutedLabel: {
    minWidth: 127 * scale,
    height: 34 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12 * scale,
    opacity: 0.55,
  },
  phaseSecondPhase: {
    marginLeft: 12 * scale,
  },
  phaseCheckoutWrap: {
    marginLeft: 12 * scale,
    height: 34 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8 * scale,
    opacity: 0.55,
  },
  phaseCheckoutText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: 'rgb(171, 171, 171)',
    letterSpacing: 0.2,
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 20 * scale,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18 * scale,
  },
  participant: {
    alignItems: 'center',
    width: 120 * scale,
  },
  avatar: {
    width: 64 * scale,
    height: 64 * scale,
    borderRadius: 32 * scale,
    backgroundColor: '#eee',
    marginBottom: 8 * scale,
  },
  participantName: {
    width: 103 * scale,
    height: 20 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    lineHeight: Math.round(20 * scale),
    color: 'rgb(14, 38, 43)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  participantRole: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: 'rgb(171, 171, 171)',
    marginTop: 2 * scale,
  },
  swapIcon: {
    width: 24 * scale,
    height: 24 * scale,
    marginHorizontal: 8 * scale,
    marginBottom: 28 * scale,
  },
  tripTimeCard: {
    width: 325 * scale,
    minHeight: 59 * scale,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgb(242, 242, 242)',
    borderRadius: 7 * scale,
    paddingHorizontal: 12 * scale,
    paddingVertical: 8 * scale,
    marginBottom: 0,
    alignSelf: 'center',
  },
  tripTimeCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  tripTimeDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgb(220, 220, 220)',
    marginHorizontal: 10 * scale,
  },
  tripTimeLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 10 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    marginBottom: 2 * scale,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  tripTimeValue: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 9 * scale,
    lineHeight: Math.round(12 * scale),
    color: 'rgb(102, 102, 102)',
    letterSpacing: 0.1,
    textAlign: 'left',
    opacity: 0.509,
    flexShrink: 1,
  },
  tripDetailsHeading: {
    width: 120 * scale,
    height: 18 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    lineHeight: Math.round(18 * scale),
    color: 'rgb(92, 92, 92)',
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: 8 * scale,
    marginTop: 0,
  },
  conditionVerificationHeading: {
    width: 164 * scale,
    height: 18 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    lineHeight: Math.round(18 * scale),
    color: 'rgb(92, 92, 92)',
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: 8 * scale,
    marginTop: 0,
  },
  pictureDocumentationHeading: {
    width: 171 * scale,
    height: 18 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    lineHeight: Math.round(18 * scale),
    color: 'rgb(92, 92, 92)',
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: 8 * scale,
    marginTop: 0,
  },
  pictureDocumentationSub: {
    width: '100%',
    textAlign: 'center',
  },
  damageUploadDivider: {
    width: 325 * scale,
    height: 2,
    alignSelf: 'center',
    opacity: 0.2443033854166667,
    borderWidth: 1,
    borderColor: 'rgb(151, 151, 151)',
    marginVertical: 24 * scale,
    borderRadius: 0,
  },
  damageNotesHeading: {
    width: 103 * scale,
    height: 18 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    lineHeight: Math.round(18 * scale),
    color: 'rgb(92, 92, 92)',
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: 16 * scale,
    marginTop: 0,
  },
  sectionSub: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: 'rgb(171, 171, 171)',
    marginBottom: 14 * scale,
    lineHeight: 18 * scale,
  },
  tripDetailsSummary: {
    marginBottom: 0,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6 * scale,
  },
  summaryLabel: {
    flex: 1,
    paddingRight: 12 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
  },
  summaryValue: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: '#8E8E8E',
  },
  tripDetailsRowDivider: {
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
  extrasEmpty: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: 'rgb(169, 169, 169)',
    letterSpacing: 0.2,
    marginTop: 4 * scale,
  },
  photoTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12 * scale,
  },
  photoTabBtn: {
    paddingBottom: 6 * scale,
    paddingHorizontal: 12 * scale,
  },
  photoTabText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: 'rgb(171, 171, 171)',
  },
  photoTabTextActive: {
    color: COLORS.GREENY_BLUE_TWO,
  },
  photoTabUnderline: {
    height: 2,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    marginTop: 4 * scale,
    borderRadius: 1,
  },
  uploadBtn: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25 * scale,
    paddingVertical: 14 * scale,
    alignItems: 'center',
    marginTop: -100 * scale,
    marginBottom: 0,
  },
  uploadBtnText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: '#fff',
  },
  damageInput: {
    borderWidth: 1,
    borderColor: 'rgb(220, 220, 220)',
    borderRadius: 10 * scale,
    padding: 12 * scale,
    minHeight: 100 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: 'rgb(14, 38, 43)',
    marginBottom: 0,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14 * scale,
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
  checkLabelRest: {
    flex: 1,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: 'rgb(100, 100, 100)',
    lineHeight: 20 * scale,
  },
  checkLabelCondition: {
    flex: 1,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    lineHeight: 20 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
    textAlign: 'left',
  },
  continueBtn: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25 * scale,
    paddingVertical: 16 * scale,
    alignItems: 'center',
    marginTop: 20 * scale,
    marginBottom: 8 * scale,
  },
  continueBtnDisabled: {
    opacity: 0.45,
  },
  continueBtnText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: '#fff',
    letterSpacing: 1.2,
  },
  missing: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: 'rgb(120, 120, 120)',
    paddingHorizontal: 24 * scale,
    marginTop: 20 * scale,
  },
});
