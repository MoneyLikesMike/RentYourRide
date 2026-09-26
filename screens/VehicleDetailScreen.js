import React, { useState, useRef, useMemo, useEffect } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  Platform,
  Alert,
  Share,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import MapView, { Circle } from 'react-native-maps';
import { Svg, Path } from 'react-native-svg';
import { MAP_PROVIDER } from '../utils/mapProvider';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useListings } from '../context/ListingsContext';
import { useFavorites } from '../context/FavoritesContext';
import { getListing } from '../services/listingsApi';
import { isRemoteListingId } from '../utils/listingId';
import { ensureIdentityVerified } from '../utils/verificationGates';
import {
  bookingOverlapsListingBlocks,
  resolveListingCalendarData,
} from '../utils/listingAvailability';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { listingPhotoUrls, isListingVideo, listingPhotoUri } from '../utils/listingPhotos';
import { Video, ResizeMode } from 'expo-av';
import {
  formatVehicleDetailDateLine,
  resolveBookingDates,
} from '../utils/bookingDatesDefaults';
import {
  formatListingTripLabel,
  getListingDisplayRating,
  listingHasGuestReviews,
} from '../utils/listingRating';
import { navigateToUserProfile } from '../utils/navigateRootStack';
import { formatApproximatePickup } from '../utils/approximateLocation';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const scale = uiScale;
const CARD_SIZE = (screenWidth - 40 * scale - 2 * 12 * scale) / 3;
const HERO_HEIGHT = Math.round(screenHeight * 0.46);
// Content band matches checkout sticky CTA; colors still extend into the home-indicator.
const BOTTOM_BAR_HEIGHT = 56;
const STICKY_HEADER_CONTENT = 48 * scale;

const CAR_FEATURES_DISPLAY = [
  { key: 'navigation', label: 'NAVIGATION', icon: require('../assets/icons/gps.png') },
  { key: 'remoteStart', label: 'REMOTE START', icon: require('../assets/icons/controller.png') },
  { key: 'backUpCamera', label: 'BACK UP CAMERA', icon: require('../assets/icons/record.png') },
  { key: 'audioInput', label: 'AUDIO INPUT', icon: require('../assets/icons/audioJack.png') },
  { key: 'usb', label: 'USB', icon: require('../assets/icons/usb.png') },
  { key: 'bluetooth', label: 'BLUETOOTH', icon: require('../assets/icons/bluetooth.png') },
  { key: 'petFriendly', label: 'PET FRIENDLY', icon: require('../assets/icons/medal1.png') },
  { key: 'convertible', label: 'CONVERTIBLE', icon: require('../assets/icons/cabriolet.png') },
  { key: 'sunroof', label: 'SUNROOF', icon: require('../assets/icons/sunroof.png') },
  { key: 'heatedSeats', label: 'HEATED SEATS', icon: require('../assets/icons/heat.png') },
  { key: 'snowTires', label: 'SNOW TIRES', icon: require('../assets/icons/tire.png') },
  { key: 'allWheelDrive', label: 'ALL-WHEEL DRIVE', icon: require('../assets/icons/chassis.png') },
];

function BackChevron({ color = '#fff', size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path
        d="M31 8L17 24L31 40"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShareIcon({ color = '#fff', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3v11M8 7l4-4 4 4"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HeartIcon({ filled, color = COLORS.YELLOWISH_ORANGE, size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s-6.7-4.35-9.33-7.5C.5 10.85 1.1 7.2 3.9 5.55 5.7 4.5 8 4.85 9.5 6.4L12 9l2.5-2.6c1.5-1.55 3.8-1.9 5.6-.85 2.8 1.65 3.4 5.3 1.23 7.95C18.7 16.65 12 21 12 21z"
        fill={filled ? color : 'transparent'}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function VehicleDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { listings, mergeRemoteListings } = useListings();
  const { isFavorited, toggleFavorite } = useFavorites();
  const routeListing = route.params?.listing || {};
  const [fetchedListing, setFetchedListing] = useState(null);
  const [stickyActive, setStickyActive] = useState(false);
  const [heroInView, setHeroInView] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const listing = useMemo(() => {
    const id = routeListing?.id;
    if (id == null || id === '') return fetchedListing || routeListing;
    const live = listings.find((l) => String(l.id) === String(id));
    return { ...routeListing, ...(live || {}), ...(fetchedListing || {}) };
  }, [routeListing, listings, fetchedListing]);
  const listingIdentityKey = useMemo(
    () =>
      listing?.id != null && listing.id !== ''
        ? String(listing.id)
        : `${listing?.title || ''}|${listing?.pickupAddress || ''}|${String(listing?.pricePerDay ?? '')}`,
    [listing?.id, listing?.title, listing?.pickupAddress, listing?.pricePerDay],
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    setActiveImageIndex(0);
    setDescriptionExpanded(false);
    setStickyActive(false);
    setHeroInView(true);
    scrollY.setValue(0);
    flatListRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, [listingIdentityKey, scrollY]);

  useEffect(() => {
    const id = routeListing?.id;
    setFetchedListing(null);
    if (!isRemoteListingId(id)) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const row = await getListing(String(id));
        if (!cancelled && row) {
          setFetchedListing(row);
          mergeRemoteListings([row]);
        }
      } catch (_) {
        /* keep route listing */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeListing?.id, mergeRemoteListings]);

  const title = listing.title || 'Vehicle';
  const photos = Array.isArray(listing.photos) && listing.photos.length > 0 ? listing.photos : [];
  const photoUrls = useMemo(() => listingPhotoUrls(photos), [photos]);
  const pricePerDay = Number(listing.pricePerDay) || 89;
  const city = listing.city || 'Winnipeg';
  const pickupDisplay = formatApproximatePickup({
    city,
    pickupAddress: listing.pickupAddress,
  });
  const instantBooking = listing.instantBooking === true;
  const hostName = listing.hostName || 'Moe Jackson';
  const hostPhotoUri = useMemo(
    () => resolveMediaUrl(listing.hostPhotoUri),
    [listing.hostPhotoUri],
  );
  const favorited =
    listing?.id != null && listing.id !== '' ? isFavorited(listing.id) : false;

  const openHostProfile = () => {
    if (!listing.hostUserId && !hostName) return;
    navigateToUserProfile(navigation, {
      profileUser: {
        userId: listing.hostUserId || null,
        displayName: hostName,
        photoUri: hostPhotoUri || listing.hostPhotoUri || null,
        joinedYear: listing.hostJoinedYear ?? null,
        aboutBio: listing.hostBio || '',
      },
      highlightListings: [listing],
    });
  };
  const guestReviews = Array.isArray(listing.guestReviews) ? listing.guestReviews : [];
  const displayRating = getListingDisplayRating(listing);
  const hostStarsFilled =
    displayRating != null ? Math.min(5, Math.max(0, Math.round(displayRating))) : 0;

  const mapLatitude = typeof listing?.latitude === 'number' ? listing.latitude : 49.8951;
  const mapLongitude = typeof listing?.longitude === 'number' ? listing.longitude : -97.1384;
  const initialMapRegion = {
    latitude: mapLatitude,
    longitude: mapLongitude,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  const bookingDates = useMemo(
    () => resolveBookingDates(route.params?.bookingDates),
    [route.params?.bookingDates],
  );

  const bookingCalendarData = useMemo(
    () => resolveListingCalendarData(listing),
    [listing?.calendarData, listing?.blockedRanges, listing?.availability],
  );

  const tripConstraints = useMemo(() => {
    const extras = listing?.extras && typeof listing.extras === 'object' ? listing.extras : {};
    return {
      min: listing?.shortestTrip || extras.shortestTrip || '',
      max: listing?.longestTrip || extras.longestTrip || '',
    };
  }, [listing?.shortestTrip, listing?.longestTrip, listing?.extras]);

  const refreshListingCalendarData = async (fallback = bookingCalendarData) => {
    if (!isRemoteListingId(listing?.id)) return fallback;
    try {
      const fresh = await getListing(String(listing.id));
      if (!fresh) return fallback;
      setFetchedListing(fresh);
      mergeRemoteListings([fresh]);
      return resolveListingCalendarData(fresh) || fallback;
    } catch (_) {
      return fallback;
    }
  };

  const openBookingCalendar = async ({ skipVerify = false } = {}) => {
    if (
      !skipVerify &&
      !(await ensureIdentityVerified(navigation, { alertTitle: 'Verify your account to book' }))
    ) {
      return;
    }
    const calendarData = await refreshListingCalendarData(bookingCalendarData);
    navigation.navigate('CalendarScreen', {
      mode: 'booking',
      returnTo: 'VehicleDetailScreen',
      listing,
      bookingSessionKey: Date.now(),
      savedCalendarData: calendarData,
      minTripConstraint: tripConstraints.min,
      maxTripConstraint: tripConstraints.max,
    });
  };

  const proceedToCheckout = async () => {
    if (!(await ensureIdentityVerified(navigation, { alertTitle: 'Verify your account to book' }))) {
      return;
    }
    const calendarData = await refreshListingCalendarData(bookingCalendarData);
    if (bookingOverlapsListingBlocks(bookingDates, calendarData || listing)) {
      Alert.alert(
        'Dates unavailable',
        'Those dates are blocked by the host. Please choose different dates.',
        [{ text: 'OK', onPress: () => openBookingCalendar({ skipVerify: true }) }],
      );
      return;
    }
    navigation.navigate('BookingCheckoutScreen', { listing, bookingDates });
  };

  const shareListing = async () => {
    const id = listing?.id != null && listing.id !== '' ? String(listing.id) : '';
    const url = id
      ? `https://app.rentyourride.ca/find-your-car/${encodeURIComponent(id)}`
      : 'https://app.rentyourride.ca/find-your-car';
    try {
      await Share.share({
        message: `Check out ${title} on RentYourRide\n${url}`,
        url,
        title,
      });
    } catch (_) {
      /* user cancelled */
    }
  };

  const toggleFav = () => {
    if (listing?.id == null || listing.id === '') return;
    toggleFavorite(listing);
  };

  const startDate = formatVehicleDetailDateLine(bookingDates.start, bookingDates.startTime);
  const endDate = formatVehicleDetailDateLine(bookingDates.end, bookingDates.endTime);
  const descriptionShort = listing.description?.trim()
    ? listing.description.trim()
    : "This isn't your typical Mercedes. With a hand built 6.2L V8 pushing 507 horsepower this Mercedes is built for speed. The engine is mated to a 7 speed multiclutch transmission that allows for lightning quick shifts. This...";
  const descriptionFull =
    descriptionShort +
    ' The interior is finished in premium leather with carbon fiber accents. A perfect blend of luxury and performance for the discerning driver.';
  const selectedFeatureSet = new Set(Array.isArray(listing.carFeatures) ? listing.carFeatures : []);
  const displayFeatures = selectedFeatureSet.size
    ? CAR_FEATURES_DISPLAY.filter((f) => selectedFeatureSet.has(f.key))
    : CAR_FEATURES_DISPLAY;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length) setActiveImageIndex(viewableItems[0].index ?? 0);
  }).current;
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const openPhotoGallery = (index = activeImageIndex) => {
    if (!photos.length) return;
    navigation.navigate('ListingPhotoGalleryScreen', {
      photos: photos.map((p) => ({
        uri: listingPhotoUri(p),
        type: isListingVideo(p) ? 'video' : 'image',
      })),
      initialIndex: Math.min(Math.max(index, 0), photos.length - 1),
      title,
    });
  };

  const stickyThreshold = HERO_HEIGHT - insets.top - 24;
  const stickyOpacity = scrollY.interpolate({
    inputRange: [stickyThreshold - 40, stickyThreshold],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const heroChromeOpacity = scrollY.interpolate({
    inputRange: [stickyThreshold - 40, stickyThreshold],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const stickyHeaderHeight = insets.top + STICKY_HEADER_CONTENT;
  const checkoutBarHeight = BOTTOM_BAR_HEIGHT + insets.bottom;
  const bottomPad = checkoutBarHeight + 20;

  const renderChromeButtons = (onLight) => {
    const iconColor = onLight ? COLORS.YELLOWISH_ORANGE : '#fff';
    const btnStyle = onLight ? styles.chromeBtnLight : styles.chromeBtn;
    return (
      <>
        <TouchableOpacity
          style={btnStyle}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <BackChevron color={iconColor} />
        </TouchableOpacity>
        <View style={styles.chromeRight}>
          <TouchableOpacity
            style={btnStyle}
            onPress={shareListing}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Share"
          >
            <ShareIcon color={iconColor} />
          </TouchableOpacity>
          {listing?.id != null && listing.id !== '' ? (
            <TouchableOpacity
              style={btnStyle}
              onPress={toggleFav}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={favorited ? 'Remove favourite' : 'Add favourite'}
            >
              <HeartIcon filled={favorited} color={COLORS.YELLOWISH_ORANGE} />
            </TouchableOpacity>
          ) : null}
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
          listener: (e) => {
            const y = e.nativeEvent.contentOffset.y;
            const next = y >= stickyThreshold - 8;
            setStickyActive((prev) => (prev === next ? prev : next));
            // Pause muted autoplay once the hero has mostly scrolled off-screen.
            const inView = y < HERO_HEIGHT * 0.55;
            setHeroInView((prev) => (prev === inView ? prev : inView));
          },
        })}
      >
        <View style={[styles.hero, { height: HERO_HEIGHT }]}>
          {photos.length > 0 ? (
            <FlatList
              key={listingIdentityKey}
              ref={flatListRef}
              data={photos}
              horizontal
              pagingEnabled
              style={styles.heroList}
              showsHorizontalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              extraData={`${activeImageIndex}:${heroInView && isFocused ? 1 : 0}`}
              keyExtractor={(item, i) => (item.uri || item.url || i).toString()}
              renderItem={({ item, index }) => {
                const uri = photoUrls[index] || item.uri || item.url;
                const video = isListingVideo(item);
                const autoplay = video && index === activeImageIndex && heroInView && isFocused;
                return (
                  <TouchableOpacity
                    activeOpacity={0.95}
                    onPress={() => openPhotoGallery(index)}
                    style={[styles.heroSlide, { width: screenWidth, height: HERO_HEIGHT }]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      video
                        ? `View video ${index + 1} of ${photos.length}`
                        : `View photo ${index + 1} of ${photos.length}`
                    }
                  >
                    {video ? (
                      <View style={styles.heroImage}>
                        <Video
                          source={{ uri }}
                          style={StyleSheet.absoluteFill}
                          resizeMode={ResizeMode.COVER}
                          shouldPlay={autoplay}
                          isLooping
                          isMuted
                          useNativeControls={false}
                        />
                      </View>
                    ) : (
                      <Image source={{ uri }} style={styles.heroImage} resizeMode="cover" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          ) : (
            <View style={[styles.heroPlaceholder, { height: HERO_HEIGHT }]}>
              <Text style={styles.heroPlaceholderText}>No photos</Text>
            </View>
          )}
          {photos.length > 0 ? (
            <View style={styles.photoCounter}>
              <Text style={styles.photoCounterText}>
                {activeImageIndex + 1} of {photos.length}
              </Text>
            </View>
          ) : null}
          <Animated.View
            pointerEvents={stickyActive ? 'none' : 'box-none'}
            style={[
              styles.heroChrome,
              { paddingTop: insets.top + 8, opacity: heroChromeOpacity },
            ]}
          >
            {renderChromeButtons(false)}
          </Animated.View>
        </View>

        <View style={styles.body}>
          <Text style={styles.pageTitle}>{title}</Text>

          <TouchableOpacity style={styles.hostRow} onPress={openHostProfile} activeOpacity={0.85}>
            {hostPhotoUri ? (
              <Image source={{ uri: hostPhotoUri }} style={styles.hostAvatar} resizeMode="cover" />
            ) : (
              <View style={styles.hostAvatar} />
            )}
            <View style={styles.hostInfo}>
              <View style={styles.hostNameRow}>
                <Text style={styles.hostName}>{hostName}</Text>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={styles.hostNameArrow}>
                  <Path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="#9B9B9B" />
                </Svg>
              </View>
              <Text style={styles.hostLabel}>HOST</Text>
            </View>
            <View style={styles.hostMeta}>
              {listingHasGuestReviews(listing) ? (
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Svg key={i} width={14} height={14} viewBox="0 0 24 24">
                      <Path
                        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                        fill={i <= hostStarsFilled ? COLORS.YELLOWISH_ORANGE : '#E0E0E0'}
                      />
                    </Svg>
                  ))}
                </View>
              ) : (
                <Text style={styles.hostNewBadge}>New</Text>
              )}
              <Text style={styles.hostTrips}>{formatListingTripLabel(listing)}</Text>
            </View>
          </TouchableOpacity>

          {guestReviews.length > 0 ? (
            <View style={styles.guestReviewsSection}>
              <Text style={styles.guestReviewsHeader}>GUEST REVIEWS</Text>
              {[...guestReviews].reverse().map((rev) => (
                <View key={rev.bookingId} style={styles.guestReviewCard}>
                  <View style={styles.guestReviewTop}>
                    <Text style={styles.guestReviewName}>{rev.guestName || 'Guest'}</Text>
                    <View style={styles.starRowSmall}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Svg key={i} width={12} height={12} viewBox="0 0 24 24">
                          <Path
                            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                            fill={
                              i <= Math.round(Number(rev.rating) || 0)
                                ? COLORS.YELLOWISH_ORANGE
                                : '#E0E0E0'
                            }
                          />
                        </Svg>
                      ))}
                    </View>
                  </View>
                  {rev.publicText ? (
                    <Text style={styles.guestReviewBody}>{rev.publicText}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          {instantBooking ? (
            <View style={styles.instantBookingBadge}>
              <Image
                source={require('../assets/instantBookingIcon.png')}
                style={styles.instantBookingIcon}
                resizeMode="contain"
              />
              <Text style={styles.instantBookingText}>INSTANT BOOKING AVAILABLE</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.chooseDateBtn}
            activeOpacity={0.85}
            onPress={openBookingCalendar}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"
                fill={COLORS.GREENY_BLUE_TWO}
              />
            </Svg>
            <Text style={styles.chooseDateText}>CHOOSE RENTAL DATE</Text>
            <Image
              source={require('../assets/icons/arrow-button.png')}
              style={styles.chooseDateArrow}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <View style={styles.rentalDatesContainer}>
            <View style={styles.rentalDateHalf}>
              <Text style={styles.dateBoxLabel}>Start</Text>
              <Text
                style={styles.dateBoxValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {startDate}
              </Text>
            </View>
            <View style={styles.rentalDatesDivider} />
            <View style={styles.rentalDateHalf}>
              <Text style={styles.dateBoxLabel}>End</Text>
              <Text
                style={styles.dateBoxValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {endDate}
              </Text>
            </View>
          </View>

          <View style={styles.pickupBox}>
            <Text style={styles.pickupLabel}>Pickup & drop off location</Text>
            <Text style={styles.pickupValue}>{pickupDisplay}</Text>
          </View>

          <Text style={styles.restrictionsHeader}>RESTRICTIONS</Text>
          <View style={styles.restrictionsRow}>
            <Text style={styles.restrictionsLabel}>Shortest Possible Trip</Text>
            <Text style={styles.restrictionsValue}>{listing.shortestTrip || '1 day'}</Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.restrictionsRow}>
            <Text style={styles.restrictionsLabel}>Longest Possible Trip</Text>
            <Text style={styles.restrictionsValue}>{listing.longestTrip || '1 month'}</Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.restrictionsRow}>
            <Text style={styles.restrictionsLabel}>Kilometres included</Text>
            <Text style={styles.restrictionsValue}>{listing.dailyKm || '200 km/day'}</Text>
          </View>
          <View style={styles.sectionDivider} />

          <Text style={styles.pricingHeader}>PRICING</Text>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Kilometres Overage Fee*</Text>
            <Text style={styles.restrictionsValue}>
              $ {(Number(listing.kmOverageFee) || 0.25).toFixed(2)}/KM
            </Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Delivery Price</Text>
            <Text style={styles.restrictionsValue}>$ {listing.deliveryPrice ?? 0}</Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Weekly Discount</Text>
            <Text style={styles.restrictionsValue}>{listing.weeklyDiscount || '0%'}</Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Monthly Discount</Text>
            <Text style={styles.restrictionsValue}>{listing.monthlyDiscount || '0%'}</Text>
          </View>

          <Text style={styles.carFeaturesHeader}>CAR FEATURES</Text>
          <View style={styles.featureGrid}>
            {displayFeatures.map((f) => (
              <View key={f.key} style={styles.featureTile}>
                <Image
                  source={f.icon}
                  style={{ width: 70, height: 70, marginBottom: 8 * scale }}
                  resizeMode="contain"
                />
                <Text style={styles.featureTileText}>{f.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.descriptionHeader}>Description</Text>
          <View style={styles.sectionMidDivider} />
          <Text style={styles.descriptionText}>
            {descriptionExpanded ? descriptionFull : descriptionShort}
          </Text>
          <TouchableOpacity
            onPress={() => setDescriptionExpanded(!descriptionExpanded)}
            style={styles.viewMoreWrap}
          >
            <Text style={styles.viewMoreText}>
              {descriptionExpanded ? 'VIEW LESS' : 'VIEW MORE'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.pickupHeaderAboveMap}>Pickup & drop off location</Text>
          <View style={styles.sectionMidDivider} />
          <MapView
            key={listingIdentityKey}
            provider={MAP_PROVIDER}
            style={styles.mapPlaceholder}
            initialRegion={initialMapRegion}
            showsUserLocation={false}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <Circle
              center={{ latitude: mapLatitude, longitude: mapLongitude }}
              radius={350}
              strokeColor={COLORS.GREENY_BLUE_TWO}
              fillColor="rgba(76, 182, 177, 0.18)"
              strokeWidth={2}
            />
          </MapView>
        </View>
      </Animated.ScrollView>

      <Animated.View
        pointerEvents={stickyActive ? 'box-none' : 'none'}
        style={[
          styles.stickyHeader,
          {
            height: stickyHeaderHeight,
            paddingTop: insets.top,
            opacity: stickyOpacity,
          },
        ]}
      >
        <View style={styles.stickyHeaderInner}>{renderChromeButtons(true)}</View>
        <View style={styles.stickyTitleWrap} pointerEvents="none">
          <Text style={styles.stickyTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </Animated.View>

      <TouchableOpacity
        style={[styles.checkoutBar, { height: checkoutBarHeight }]}
        activeOpacity={0.85}
        onPress={proceedToCheckout}
        accessibilityRole="button"
        accessibilityLabel="Proceed to checkout"
      >
        <View style={[styles.checkoutBtn, { height: checkoutBarHeight }]}>
          <Text style={styles.checkoutBtnText}>CONTINUE</Text>
          <View
            style={[
              styles.checkoutArrowTip,
              {
                borderTopWidth: checkoutBarHeight / 2,
                borderBottomWidth: checkoutBarHeight / 2,
              },
            ]}
          />
        </View>
        <View style={[styles.priceBadge, { height: checkoutBarHeight }]}>
          <Text style={styles.priceBadgeText}>
            <Text style={styles.priceBadgeMain}>CAD ${pricePerDay}/</Text>
            <Text style={styles.priceBadgeDay}>DAY</Text>
          </Text>
        </View>
      </TouchableOpacity>
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
  scrollContent: {
    paddingBottom: 28,
  },
  hero: {
    width: screenWidth,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  heroList: {
    width: screenWidth,
  },
  heroSlide: {
    backgroundColor: '#1a1a1a',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlayWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlayBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlayTriangle: {
    width: 0,
    height: 0,
    marginLeft: 4,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 16,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#fff',
  },
  heroPlaceholder: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  heroPlaceholderText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: '#9B9B9B',
  },
  photoCounter: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoCounterText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: '#fff',
  },
  heroChrome: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
  },
  chromeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chromeBtnLight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chromeRight: {
    flexDirection: 'row',
    gap: 8,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
    zIndex: 40,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  stickyHeaderInner: {
    height: STICKY_HEADER_CONTENT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  stickyTitleWrap: {
    ...StyleSheet.absoluteFillObject,
    top: undefined,
    bottom: 0,
    height: STICKY_HEADER_CONTENT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 96,
  },
  stickyTitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: 'rgb(80,80,80)',
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: 20 * scale,
    paddingTop: 16,
  },
  pageTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 22,
    color: 'rgb(80,80,80)',
    marginBottom: 8,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  hostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  hostInfo: {
    flex: 1,
  },
  hostNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  hostName: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: '#000',
  },
  hostNameArrow: {
    marginLeft: 4,
  },
  hostLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#9B9B9B',
    letterSpacing: 0.2,
  },
  hostMeta: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 4,
  },
  hostNewBadge: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 12,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  hostTrips: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: '#9B9B9B',
  },
  guestReviewsSection: {
    marginTop: 8 * scale,
    paddingBottom: 8 * scale,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  guestReviewsHeader: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: '#000',
    opacity: 0.65,
    letterSpacing: 0.2,
    marginBottom: 12 * scale,
  },
  guestReviewCard: {
    marginBottom: 14 * scale,
    paddingBottom: 12 * scale,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  guestReviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6 * scale,
  },
  guestReviewName: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: '#333',
  },
  starRowSmall: {
    flexDirection: 'row',
    gap: 2,
  },
  guestReviewBody: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: '#666',
    lineHeight: 18 * scale,
  },
  instantBookingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 247, 231, 0.413)',
    marginTop: 16,
    alignSelf: 'stretch',
    gap: 6,
  },
  instantBookingIcon: {
    width: 24,
    height: 24,
  },
  instantBookingText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: COLORS.YELLOWISH_ORANGE,
    letterSpacing: 0.2,
  },
  chooseDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 46,
    borderRadius: 3,
    backgroundColor: 'rgb(245, 255, 254)',
    borderWidth: 1.1,
    borderColor: COLORS.GREENY_BLUE_TWO,
    marginTop: 16,
    alignSelf: 'stretch',
    gap: 6,
  },
  chooseDateText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: 'rgb(69, 168, 163)',
    letterSpacing: 0.2,
  },
  chooseDateArrow: {
    width: 6,
    height: 9,
  },
  rentalDatesContainer: {
    flexDirection: 'row',
    width: '100%',
    minHeight: 59,
    backgroundColor: 'rgb(242, 242, 242)',
    borderRadius: 7,
    marginTop: 20,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  rentalDateHalf: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: 0,
  },
  rentalDatesDivider: {
    width: 1,
    backgroundColor: 'rgba(151, 151, 151, 0.21)',
  },
  sectionDivider: {
    alignSelf: 'stretch',
    width: '100%',
    height: 2,
    borderTopWidth: 1,
    borderTopColor: COLORS.GREENY_BLUE_TWO,
    marginTop: 10,
    marginBottom: 10,
  },
  rowDivider: {
    alignSelf: 'stretch',
    width: '100%',
    height: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgb(151, 151, 151)',
    opacity: 0.35,
  },
  sectionMidDivider: {
    alignSelf: 'stretch',
    width: '100%',
    height: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgb(151, 151, 151)',
    opacity: 0.35,
    marginTop: 8,
    marginBottom: 8,
  },
  dateBoxLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: COLORS.GREENY_BLUE_TWO,
    marginBottom: 4,
  },
  dateBoxValue: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: 'rgb(102, 102, 102)',
    flexShrink: 1,
  },
  pickupBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 16,
  },
  pickupLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: COLORS.GREENY_BLUE_TWO,
    marginBottom: 6,
  },
  pickupValue: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: 'rgb(80, 80, 80)',
    lineHeight: 20,
  },
  restrictionsHeader: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#000',
    opacity: 0.7,
    marginTop: 24,
    marginBottom: 8,
  },
  pricingHeader: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#000',
    opacity: 0.7,
    marginTop: 0,
    marginBottom: 8,
  },
  restrictionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  restrictionsLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: COLORS.GREENY_BLUE_TWO,
    flex: 1,
    paddingRight: 12,
  },
  restrictionsValue: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: '#9B9B9B',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  pricingLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: COLORS.GREENY_BLUE_TWO,
    flex: 1,
    paddingRight: 12,
  },
  carFeaturesHeader: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#000',
    opacity: 0.7,
    marginTop: 20,
    marginBottom: 6,
  },
  descriptionHeader: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: COLORS.GREENY_BLUE_TWO,
    marginTop: 20,
    marginBottom: 0,
  },
  pickupHeaderAboveMap: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: COLORS.GREENY_BLUE_TWO,
    marginTop: 20,
    marginBottom: 0,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8 * scale,
  },
  featureTile: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    backgroundColor: '#FFFFFF',
    borderRadius: 8 * scale,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12 * scale,
  },
  featureTileText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 9 * scale,
    color: '#4A4A4A',
    textAlign: 'center',
    letterSpacing: 0.2,
    paddingHorizontal: 4,
  },
  descriptionText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: 'rgb(100, 97, 97)',
    lineHeight: 20,
  },
  viewMoreWrap: {
    marginTop: 8,
    alignSelf: 'center',
  },
  viewMoreText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: COLORS.YELLOWISH_ORANGE,
    letterSpacing: 0.2,
  },
  mapPlaceholder: {
    width: screenWidth,
    height: 200,
    backgroundColor: '#E8F4F4',
    overflow: 'hidden',
    marginBottom: 12,
    marginHorizontal: -20 * scale,
  },
  checkoutBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 50,
    elevation: 50,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  checkoutBtn: {
    width: 168,
    backgroundColor: COLORS.YELLOWISH_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    // Optical center of the arrow shape (chevron overhangs to the right).
    paddingRight: 22,
    position: 'relative',
    zIndex: 2,
  },
  checkoutBtnText: {
    fontFamily: 'GothamRounded-Book',
    fontSize: 17,
    color: '#fff',
    letterSpacing: 0.9,
    textAlign: 'center',
    lineHeight: 20,
  },
  checkoutArrowTip: {
    position: 'absolute',
    right: -30,
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 30,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: COLORS.YELLOWISH_ORANGE,
  },
  priceBadge: {
    flex: 1,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  priceBadgeText: {
    textAlign: 'center',
  },
  priceBadgeMain: {
    fontFamily: 'GothamRounded-Book',
    fontSize: 21,
    color: '#fff',
    letterSpacing: -0.2,
  },
  priceBadgeDay: {
    fontFamily: 'GothamRounded-Book',
    fontSize: 12,
    color: '#fff',
    letterSpacing: -0.1,
  },
});
