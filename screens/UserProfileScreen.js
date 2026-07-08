import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useUserProfile } from '../context/UserProfileContext';
import { useListings } from '../context/ListingsContext';
import { useGuestBookings } from '../context/GuestBookingsContext';
import { averageRatingFromReviews } from '../utils/guestListingReview';
import { useAuth } from '../context/AuthContext';
import { navigateRootStack, navigateToVehicleDetail } from '../utils/navigateRootStack';
import ListingCard, { ListingStarRating } from '../components/ListingCard';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;
const TAB_BAR_HEIGHT = 78 * scale;
const REVIEWS_PAGE_SIZE = 5;

const ABOUT_PLACEHOLDER =
  "Tell hosts and guests about yourself and why you're a responsible, trustworthy person.";
const REVIEWS_PLACEHOLDER = 'Host or rent any car to get reviews from your guests or hosts';

function formatReviewMonthYear(ts) {
  if (ts == null || !Number.isFinite(Number(ts))) return '';
  const d = new Date(Number(ts));
  if (Number.isNaN(d.getTime())) return '';
  const month = d.toLocaleString('en-US', { month: 'long' });
  return `${month}, ${d.getFullYear()}`;
}

function PencilIcon({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
        fill={color}
      />
    </Svg>
  );
}

export default function UserProfileScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const profileUser = route.params?.profileUser;
  const highlightListings = Array.isArray(route.params?.highlightListings)
    ? route.params.highlightListings
    : null;
  const isOwnProfile =
    !profileUser ||
    (!!user?.id &&
      !!profileUser.userId &&
      String(profileUser.userId) === String(user.id));

  const { firstName, lastName, joinedYear, photoUri, aboutBio } = useUserProfile();
  const { canUseListingsHub, listings } = useListings();
  const { pendingRequests, activeRentals } = useGuestBookings();

  const [reviewsVisible, setReviewsVisible] = useState(REVIEWS_PAGE_SIZE);

  const ownedListings = useMemo(() => {
    if (!isOwnProfile) {
      return highlightListings || [];
    }
    return listings.filter((l) => l.owned !== false);
  }, [isOwnProfile, highlightListings, listings]);

  const mergedProfileReviews = useMemo(() => {
    if (!isOwnProfile) return [];
    const fromListings = ownedListings.flatMap((l) =>
      (Array.isArray(l.guestReviews) ? l.guestReviews : []).map((r) => ({
        id: `l-${r.bookingId}-${r.submittedAt}`,
        submittedAt: r.submittedAt || 0,
        vehicleTitle: (r.vehicleTitle || l.title || 'Vehicle').trim() || 'Vehicle',
        publicText: (r.publicText || '').trim(),
        rating: Number(r.rating) || 0,
        reviewerName: (r.guestName || 'Guest').trim() || 'Guest',
        reviewerPhotoUri: r.guestPhotoUri || null,
        reviewerJoinedYear: r.guestJoinedYear != null ? r.guestJoinedYear : null,
      }))
    );

    const bookingPool = [...pendingRequests, ...activeRentals];
    const fromHostReviews = bookingPool
      .filter((b) => b.hostReviewOfGuestSubmittedAt)
      .map((b) => {
        const ls = b.listingSnapshot || {};
        return {
          id: `b-${b.id}-${b.hostReviewOfGuestSubmittedAt}`,
          submittedAt: b.hostReviewOfGuestSubmittedAt,
          vehicleTitle: (ls.title || 'Vehicle').trim() || 'Vehicle',
          publicText: (b.hostReviewOfGuestPublic || '').trim(),
          rating: Number(b.hostReviewOfGuestRating) || 0,
          reviewerName: (ls.hostName || 'Host').trim() || 'Host',
          reviewerPhotoUri: ls.hostPhotoUri || null,
          reviewerJoinedYear: null,
        };
      });

    return [...fromListings, ...fromHostReviews].sort((a, b) => b.submittedAt - a.submittedAt);
  }, [ownedListings, pendingRequests, activeRentals]);

  useEffect(() => {
    setReviewsVisible(REVIEWS_PAGE_SIZE);
  }, [mergedProfileReviews.length]);

  const profileReviewCount = mergedProfileReviews.length;
  const profileAvgRating = useMemo(() => averageRatingFromReviews(mergedProfileReviews), [mergedProfileReviews]);

  const visibleReviews = useMemo(
    () => mergedProfileReviews.slice(0, reviewsVisible),
    [mergedProfileReviews, reviewsVisible]
  );
  const hasMoreReviews = mergedProfileReviews.length > reviewsVisible;

  const displayName = isOwnProfile
    ? [firstName, lastName]
        .map((s) => (s ?? '').trim())
        .filter(Boolean)
        .join(' ') || 'Guest'
    : (profileUser?.displayName || 'Guest').trim() || 'Guest';
  const profilePhotoUri = isOwnProfile ? photoUri : profileUser?.photoUri || null;
  const profileJoinedYear = isOwnProfile ? joinedYear : profileUser?.joinedYear ?? null;
  const aboutDisplay = isOwnProfile
    ? aboutBio?.trim()
      ? aboutBio.trim()
      : ABOUT_PLACEHOLDER
    : profileUser?.aboutBio?.trim() || ABOUT_PLACEHOLDER;
  const aboutIsPlaceholder = isOwnProfile ? !aboutBio?.trim() : !profileUser?.aboutBio?.trim();

  const openListing = useCallback(
    (listing) => {
      navigateToVehicleDetail(navigation, listing);
    },
    [navigation]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: TAB_BAR_HEIGHT + 24 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topNavRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
            <Svg width={24} height={24} viewBox="0 0 48 48" fill="none">
              <Path
                d="M31 8L17 24L31 40"
                stroke={COLORS.YELLOWISH_ORANGE}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>

        <View style={styles.profileSummaryRow}>
          <View style={styles.profileMain}>
            {profilePhotoUri ? (
              <Image source={{ uri: profilePhotoUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
            <View style={styles.profileTextCol}>
              <Text style={styles.displayName}>{displayName}</Text>
              {profileJoinedYear != null ? (
                <Text style={styles.joinedText}>Joined in {profileJoinedYear}</Text>
              ) : null}
            </View>
          </View>
          {isOwnProfile ? (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('EditProfileScreen')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <PencilIcon color={COLORS.GREENY_BLUE_TWO} size={22 * scale} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Image
              source={require('../assets/icons/yellowCar.png')}
              style={styles.statIcon}
              resizeMode="contain"
            />
            <Text style={styles.statLabel}>
              {ownedListings.length} {ownedListings.length === 1 ? 'RIDE' : 'RIDES'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Image
              source={require('../assets/icons/shape3.png')}
              style={styles.statIcon}
              resizeMode="contain"
            />
            <Text style={styles.statLabel}>
              {profileAvgRating != null ? `${profileAvgRating.toFixed(1)}/5` : '—/5'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Image
              source={require('../assets/icons/reviews.png')}
              style={styles.statIcon}
              resizeMode="contain"
            />
            <Text style={styles.statLabel}>
              {profileReviewCount} {profileReviewCount === 1 ? 'REVIEW' : 'REVIEWS'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.sectionRule} />
          <Text style={[styles.sectionBody, aboutIsPlaceholder && styles.sectionBodyPlaceholder]}>{aboutDisplay}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rides</Text>
          <View style={styles.sectionRule} />
          {ownedListings.length > 0 ? (
            <View style={styles.ridesList}>
              {ownedListings.map((listing) => (
                <ListingCard
                  key={String(listing.id)}
                  listing={listing}
                  onPress={() => openListing(listing)}
                  showInstantBadge
                />
              ))}
            </View>
          ) : (
            <View style={styles.ridesEmptyBox}>
              <Text style={styles.ridesEmptyText}>
                {isOwnProfile ? "You don't have any rides" : 'No rides to show'}
              </Text>
              {isOwnProfile ? (
                <TouchableOpacity
                  onPress={() => {
                    if (canUseListingsHub) {
                      navigateRootStack(navigation, 'ListRideStack');
                    } else {
                      navigateRootStack(navigation, 'GetPaidStack');
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.listRideLink}>List new ride →</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          <View style={styles.sectionRule} />
          {mergedProfileReviews.length > 0 ? (
            <View>
              {visibleReviews.map((rev, index) => {
                const isLastShown = index === visibleReviews.length - 1;
                const showDividerBelow = hasMoreReviews || !isLastShown;
                return (
                <View
                  key={rev.id}
                  style={[
                    styles.profileReviewBlock,
                    showDividerBelow && styles.profileReviewBlockBorder,
                  ]}
                >
                  <Text style={styles.profileReviewDate}>{formatReviewMonthYear(rev.submittedAt)}</Text>
                  <View style={styles.profileReviewVehicleRow}>
                    <Text style={styles.profileReviewVehicleTitle} numberOfLines={2}>
                      {rev.vehicleTitle || 'Vehicle'}
                    </Text>
                    <ListingStarRating rating={rev.rating} size={Math.round(14 * scale)} />
                  </View>
                  {rev.publicText ? (
                    <Text style={styles.profileReviewBody}>{rev.publicText}</Text>
                  ) : (
                    <Text style={styles.profileReviewBodyMuted}>No written review</Text>
                  )}
                  <View style={styles.profileReviewReviewerRow}>
                    {rev.reviewerPhotoUri ? (
                      <Image source={{ uri: rev.reviewerPhotoUri }} style={styles.profileReviewAvatar} />
                    ) : (
                      <View style={styles.profileReviewAvatarPlaceholder} />
                    )}
                    <View style={styles.profileReviewReviewerText}>
                      <Text style={styles.profileReviewReviewerName}>{rev.reviewerName}</Text>
                      {rev.reviewerJoinedYear != null ? (
                        <Text style={styles.profileReviewJoined}>Joined in {rev.reviewerJoinedYear}</Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
              })}
              {hasMoreReviews ? (
                <TouchableOpacity
                  style={styles.loadMoreWrap}
                  onPress={() => setReviewsVisible((v) => v + REVIEWS_PAGE_SIZE)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.loadMoreText}>Load more reviews</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <Text style={styles.sectionBodyPlaceholder}>{REVIEWS_PLACEHOLDER}</Text>
          )}
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
  scrollContent: {
    paddingHorizontal: 20 * scale,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20 * scale,
  },
  backBtn: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 4 * scale,
  },
  profileSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28 * scale,
  },
  profileMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8 * scale,
  },
  avatar: {
    width: 64 * scale,
    height: 64 * scale,
    borderRadius: 32 * scale,
  },
  avatarPlaceholder: {
    width: 64 * scale,
    height: 64 * scale,
    borderRadius: 32 * scale,
    backgroundColor: '#D8D8D8',
  },
  profileTextCol: {
    marginLeft: 14 * scale,
    flex: 1,
    alignItems: 'flex-start',
  },
  displayName: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 21 * scale,
    lineHeight: 28 * scale,
    color: 'rgb(86, 86, 86)',
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  joinedText: {
    fontFamily: FONTS.NUNITO_LIGHT,
    fontSize: 13 * scale,
    lineHeight: 18 * scale,
    color: 'rgb(153, 153, 153)',
    textAlign: 'left',
    alignSelf: 'stretch',
    marginTop: 4 * scale,
  },
  editBtn: {
    width: 40 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20 * scale,
    marginBottom: 8 * scale,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {
    width: 26 * scale,
    height: 26 * scale,
    marginBottom: 8 * scale,
  },
  statLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: 'rgb(14, 38, 43)',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 4 * scale,
  },
  section: {
    marginTop: 24 * scale,
  },
  sectionTitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    lineHeight: 18 * scale,
    letterSpacing: 0.2,
    color: COLORS.GREENY_BLUE_TWO,
    opacity: 0.8809291294642857,
    marginBottom: 8 * scale,
  },
  sectionRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgb(224, 224, 224)',
    marginBottom: 14 * scale,
  },
  sectionBody: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    lineHeight: 22 * scale,
    color: 'rgb(14, 38, 43)',
  },
  sectionBodyPlaceholder: {
    color: 'rgb(171, 171, 171)',
  },
  ridesList: {
    gap: 16 * scale,
  },
  ridesEmptyBox: {
    borderWidth: 1,
    borderColor: 'rgb(200, 200, 200)',
    borderStyle: Platform.OS === 'ios' ? 'dashed' : 'solid',
    borderRadius: 8 * scale,
    paddingVertical: 28 * scale,
    paddingHorizontal: 16 * scale,
    alignItems: 'center',
  },
  ridesEmptyText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: 'rgb(171, 171, 171)',
    marginBottom: 12 * scale,
    textAlign: 'center',
  },
  listRideLink: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    lineHeight: 22 * scale,
    letterSpacing: 0.2,
    color: COLORS.GREENY_BLUE_TWO,
  },
  profileReviewBlock: {
    paddingBottom: 18 * scale,
    marginBottom: 18 * scale,
  },
  profileReviewBlockBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgb(230, 230, 230)',
  },
  profileReviewDate: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 14 * scale,
    lineHeight: 20 * scale,
    color: 'rgb(56, 56, 56)',
    marginBottom: 8 * scale,
  },
  profileReviewVehicleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12 * scale,
    marginBottom: 10 * scale,
  },
  profileReviewVehicleTitle: {
    flex: 1,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    lineHeight: 18 * scale,
    color: COLORS.GREENY_BLUE_TWO,
  },
  profileReviewBody: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    lineHeight: 22 * scale,
    color: 'rgb(100, 100, 100)',
    marginBottom: 14 * scale,
  },
  profileReviewBodyMuted: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    lineHeight: 22 * scale,
    color: 'rgb(171, 171, 171)',
    fontStyle: 'italic',
    marginBottom: 14 * scale,
  },
  profileReviewReviewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileReviewAvatar: {
    width: 40 * scale,
    height: 40 * scale,
    borderRadius: 20 * scale,
  },
  profileReviewAvatarPlaceholder: {
    width: 40 * scale,
    height: 40 * scale,
    borderRadius: 20 * scale,
    backgroundColor: '#E0E0E0',
  },
  profileReviewReviewerText: {
    marginLeft: 12 * scale,
    flex: 1,
    justifyContent: 'center',
  },
  profileReviewReviewerName: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    lineHeight: 20 * scale,
    color: 'rgb(56, 56, 56)',
  },
  profileReviewJoined: {
    fontFamily: FONTS.NUNITO_LIGHT,
    fontSize: 12 * scale,
    lineHeight: 16 * scale,
    color: 'rgb(153, 153, 153)',
    marginTop: 2 * scale,
  },
  loadMoreWrap: {
    alignItems: 'center',
    paddingVertical: 8 * scale,
    marginBottom: 8 * scale,
  },
  loadMoreText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: COLORS.GREENY_BLUE_TWO,
  },
});
