import React, { useMemo, useState, useCallback } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  TextInput,
  Platform,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useGuestBookings } from '../context/GuestBookingsContext';
import { useBookingUpdate } from '../hooks/useBookingUpdate';
import { useListings } from '../context/ListingsContext';
import { useUserProfile } from '../context/UserProfileContext';
import { formatTripDateTime } from '../utils/guestBookingFormat';
import { averageRatingFromReviews } from '../utils/guestListingReview';

const { width: screenWidth } = Dimensions.get('window');
const scale = uiScale;

const BADGES = [
  { key: 'service', icon: require('../assets/icons/excellence.png'), label: 'Excellent\nService' },
  { key: 'vehicle', icon: require('../assets/icons/loveVehicle.png'), label: 'Cool\nvehicle' },
  { key: 'value', icon: require('../assets/icons/priceTag.png'), label: 'Great\nvalue' },
  { key: 'communication', icon: require('../assets/icons/speak.png'), label: 'Great\ncommunication' },
];

function StarRow({ value, onChange }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity
          key={n}
          style={styles.starHit}
          onPress={() => onChange(n)}
          hitSlop={8}
          activeOpacity={0.75}
        >
          <Text style={[styles.starGlyph, n <= value && styles.starGlyphFilled]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function GuestHostReviewScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { bookingId } = route.params || {};
  const { getBookingById } = useGuestBookings();
  const { applyBookingUpdate } = useBookingUpdate();
  const { listings, updateListing } = useListings();
  const { firstName, lastName, photoUri: profilePhotoUri, joinedYear: profileJoinedYear } = useUserProfile();

  const [rating, setRating] = useState(5);
  const [selectedBadges, setSelectedBadges] = useState(() => new Set());
  const [publicReview, setPublicReview] = useState('');
  const [privateNote, setPrivateNote] = useState('');

  const booking = useMemo(() => (bookingId ? getBookingById(bookingId) : null), [bookingId, getBookingById]);

  const ls = booking?.listingSnapshot || {};
  const hostName = ls.hostName || 'Host';

  const hostPhoto = useMemo(() => {
    const photos = Array.isArray(ls.photos) ? ls.photos : [];
    if (photos.length > 0 && photos[0] != null) {
      const p = photos[0];
      return typeof p === 'number' ? p : { uri: String(p) };
    }
    return require('../assets/icons/shape.png');
  }, [ls.photos]);

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

  const toggleBadge = useCallback((key) => {
    setSelectedBadges((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const goHomeGuestRentals = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: 'RentalManagerScreen' },
          { name: 'RentalHistoryScreen', params: { initialTab: 'guest' } },
        ],
      })
    );
  }, [navigation]);

  const onFinishLater = useCallback(() => {
    goHomeGuestRentals();
  }, [goHomeGuestRentals]);

  const onSubmit = useCallback(async () => {
    if (!booking?.id) return;
    const listingId = ls.id != null && ls.id !== '' ? String(ls.id) : null;
    const guestDisplay = (
      (booking.guestName || '').trim() ||
      [firstName, lastName]
        .map((s) => (s ?? '').trim())
        .filter(Boolean)
        .join(' ') ||
      'Guest'
    ).trim();

    const reviewEntry = {
      bookingId: String(booking.id),
      rating,
      publicText: publicReview.trim(),
      badgeKeys: Array.from(selectedBadges),
      guestName: guestDisplay,
      guestPhotoUri: profilePhotoUri || booking.guestPhotoUri || null,
      guestJoinedYear: profileJoinedYear != null ? profileJoinedYear : null,
      submittedAt: Date.now(),
      vehicleTitle: ls.title || 'Vehicle',
    };

    if (listingId) {
      const listing = listings.find((l) => String(l.id) === listingId);
      if (listing) {
        const prev = Array.isArray(listing.guestReviews) ? listing.guestReviews : [];
        const next = [...prev.filter((r) => r.bookingId !== reviewEntry.bookingId), reviewEntry];
        const avg = averageRatingFromReviews(next);
        updateListing(listing.id, {
          guestReviews: next,
          hostRating: avg != null ? avg : rating,
        });
      }
    }

    const ok = await applyBookingUpdate(
      booking.id,
      {
        guestHostReviewRating: rating,
        guestHostReviewBadgeKeys: Array.from(selectedBadges),
        guestHostReviewPublic: publicReview.trim(),
        guestHostReviewPrivateNote: privateNote.trim(),
        guestHostReviewSubmittedAt: Date.now(),
        reviewRole: 'guest',
        rating,
        reviewText: publicReview.trim(),
      },
      { errorTitle: 'Could not submit review' },
    );
    if (ok) goHomeGuestRentals();
  }, [
    booking?.id,
    booking.guestName,
    booking.guestPhotoUri,
    firstName,
    lastName,
    profilePhotoUri,
    profileJoinedYear,
    ls.id,
    ls.title,
    listings,
    rating,
    selectedBadges,
    publicReview,
    privateNote,
    applyBookingUpdate,
    updateListing,
    goHomeGuestRentals,
  ]);

  if (!booking) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.missing}>Booking not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollInner, { paddingBottom: insets.bottom + 28 * scale }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>REVIEW</Text>

        <View style={styles.profileBlock}>
          <Image source={hostPhoto} style={styles.avatar} resizeMode="cover" />
          <Text style={styles.hostName}>{hostName}</Text>
          <Text style={styles.hostRole}>Host</Text>
        </View>

        <View style={styles.tripCard}>
          <View style={styles.tripHalf}>
            <Text style={styles.tripLabel}>Start</Text>
            <Text style={styles.tripWhen}>{startLine}</Text>
          </View>
          <View style={styles.tripDivider} />
          <View style={styles.tripHalf}>
            <Text style={styles.tripLabel}>End</Text>
            <Text style={styles.tripWhen}>{endLine}</Text>
          </View>
        </View>

        <View style={styles.rule} />

        <Text style={[styles.sectionLabel, styles.sectionLabelAmazing]}>AMAZING</Text>
        <StarRow value={rating} onChange={setRating} />

        <View style={styles.rule} />

        <Text style={[styles.sectionLabel, styles.sectionLabelShowLove]}>SHOW SOME LOVE?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgeScroll}
          decelerationRate="fast"
        >
          {BADGES.map((b) => {
            const on = selectedBadges.has(b.key);
            return (
              <TouchableOpacity
                key={b.key}
                style={styles.badgeChip}
                onPress={() => toggleBadge(b.key)}
                activeOpacity={0.85}
              >
                <View style={styles.badgeIconOuter}>
                  <View style={[styles.badgeIconWrap, on && styles.badgeIconWrapOn]}>
                    <Image source={b.icon} style={styles.badgeIcon} resizeMode="contain" />
                  </View>
                  {on ? (
                    <View style={styles.badgeCheckBubble} pointerEvents="none">
                      <Text style={styles.badgeCheckMark}>✓</Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[styles.badgeLabel, on && styles.badgeLabelSelected]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                >
                  {b.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.ruleBelowBadges} />

        <Text style={styles.sectionLabel}>WRITE REVIEW</Text>
        <TextInput
          style={styles.textBox}
          placeholder="Let others know how your trip was"
          placeholderTextColor="rgb(171, 171, 171)"
          multiline
          value={publicReview}
          onChangeText={setPublicReview}
          textAlignVertical="top"
        />

        <View style={styles.rule} />

        <Text style={styles.sectionLabel}>LEAVE A PRIVATE NOTE</Text>
        <TextInput
          style={styles.textBox}
          placeholder="Only the host can see this"
          placeholderTextColor="rgb(171, 171, 171)"
          multiline
          value={privateNote}
          onChangeText={setPrivateNote}
          textAlignVertical="top"
        />

        <TouchableOpacity onPress={onFinishLater} style={styles.finishLaterWrap} activeOpacity={0.8}>
          <Text style={styles.finishLater}>Finish later</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitBtn} onPress={onSubmit} activeOpacity={0.88}>
          <Text style={styles.submitBtnText}>SUBMIT</Text>
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
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 22 * scale,
    paddingTop: 12 * scale,
  },
  pageTitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: 'rgb(140, 140, 140)',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 20 * scale,
  },
  profileBlock: {
    alignItems: 'center',
    marginBottom: 22 * scale,
  },
  avatar: {
    width: 88 * scale,
    height: 88 * scale,
    borderRadius: 44 * scale,
    marginBottom: 12 * scale,
    backgroundColor: '#f0f0f0',
  },
  hostName: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 18 * scale,
    color: 'rgb(14, 38, 43)',
    marginBottom: 4 * scale,
  },
  hostRole: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: 'rgb(160, 160, 160)',
  },
  tripCard: {
    flexDirection: 'row',
    width: 325 * scale,
    height: 59 * scale,
    alignSelf: 'center',
    backgroundColor: 'rgb(242, 242, 242)',
    borderRadius: 7 * scale,
    overflow: 'hidden',
    marginBottom: 4 * scale,
  },
  tripHalf: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 6 * scale,
    paddingHorizontal: 10 * scale,
  },
  tripDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgb(220, 220, 220)',
  },
  tripLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    marginBottom: 2 * scale,
  },
  tripWhen: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 10 * scale,
    lineHeight: 13 * scale,
    color: 'rgb(130, 130, 130)',
    textAlign: 'left',
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgb(224, 224, 224)',
    marginVertical: 18 * scale,
  },
  ruleBelowBadges: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgb(224, 224, 224)',
    marginTop: 10 * scale,
    marginBottom: 10 * scale,
  },
  sectionLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    lineHeight: 18 * scale,
    height: 18 * scale,
    color: 'rgb(92, 92, 92)',
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: 12 * scale,
  },
  sectionLabelAmazing: {
    width: 61 * scale,
  },
  sectionLabelShowLove: {
    width: 125 * scale,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4 * scale,
  },
  starHit: {
    marginHorizontal: 4 * scale,
  },
  starGlyph: {
    fontSize: 36 * scale,
    color: 'rgb(230, 230, 230)',
  },
  starGlyphFilled: {
    color: COLORS.MANGO,
  },
  badgeScroll: {
    paddingVertical: 8 * scale,
    paddingLeft: 12 * scale,
    paddingRight: 12 * scale,
  },
  badgeChip: {
    width: 112 * scale,
    alignItems: 'center',
    marginRight: 4 * scale,
  },
  badgeIconOuter: {
    position: 'relative',
    width: 64 * scale,
    height: 64 * scale,
    marginBottom: 12 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIconWrap: {
    width: 64 * scale,
    height: 64 * scale,
    borderRadius: 32 * scale,
    borderWidth: 2,
    borderColor: 'rgba(76, 182, 177, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  badgeCheckBubble: {
    position: 'absolute',
    bottom: -6 * scale,
    left: '50%',
    marginLeft: -11 * scale,
    width: 22 * scale,
    height: 22 * scale,
    borderRadius: 11 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 2,
  },
  badgeCheckMark: {
    color: '#fff',
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 12 * scale,
    lineHeight: 14 * scale,
    marginTop: -1,
  },
  badgeIconWrapOn: {
    borderColor: COLORS.GREENY_BLUE_TWO,
    backgroundColor: 'rgba(76, 182, 177, 0.14)',
  },
  badgeIcon: {
    width: 34 * scale,
    height: 34 * scale,
  },
  badgeLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    lineHeight: 16 * scale,
    maxHeight: 34 * scale,
    color: 'rgb(171, 171, 171)',
    letterSpacing: 0.2,
    textAlign: 'center',
    width: 110 * scale,
    paddingHorizontal: 2 * scale,
  },
  badgeLabelSelected: {
    fontFamily: FONTS.NUNITO_BOLD,
    color: 'rgb(14, 38, 43)',
  },
  textBox: {
    borderWidth: 1,
    borderColor: 'rgb(210, 210, 210)',
    borderRadius: 8 * scale,
    minHeight: 100 * scale,
    paddingHorizontal: 14 * scale,
    paddingVertical: 12 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: 'rgb(14, 38, 43)',
    textAlign: 'left',
  },
  finishLaterWrap: {
    alignItems: 'center',
    marginTop: 22 * scale,
    marginBottom: 14 * scale,
  },
  finishLater: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: COLORS.MANGO_TWO,
    letterSpacing: 0.2,
  },
  submitBtn: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 999,
    paddingVertical: 16 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: '#fff',
    letterSpacing: 1,
  },
  missing: {
    textAlign: 'center',
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    color: '#888',
  },
  linkText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    color: COLORS.GREENY_BLUE_TWO,
    textAlign: 'center',
    marginTop: 12,
  },
});
