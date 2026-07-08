import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  FlatList,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Circle, Marker } from 'react-native-maps';
import { Svg, Path } from 'react-native-svg';
import { MAP_PROVIDER } from '../utils/mapProvider';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useListings } from '../context/ListingsContext';
import { useFavorites } from '../context/FavoritesContext';
import { getListing } from '../services/listingsApi';
import { isRemoteListingId } from '../utils/listingId';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375;
const TAB_BAR_HEIGHT = 78 * scale;
const CARD_SIZE = (screenWidth - 40 * scale - 2 * 12 * scale) / 3;
const CAROUSEL_CARD_WIDTH = screenWidth * 0.84;
const CAROUSEL_CARD_GAP = 2;
const CAROUSEL_HEIGHT = CAROUSEL_CARD_WIDTH / 1.35;

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

export default function VehicleDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { listings, mergeRemoteListings } = useListings();
  const { isFavorited, toggleFavorite } = useFavorites();
  const routeListing = route.params?.listing || {};
  const listing = useMemo(() => {
    const id = routeListing?.id;
    if (id == null || id === '') return routeListing;
    const live = listings.find((l) => String(l.id) === String(id));
    return live ? { ...routeListing, ...live } : routeListing;
  }, [routeListing, listings]);
  /** Stable key so we reset carousel/map when opening a different vehicle on the same screen instance */
  const listingIdentityKey = useMemo(
    () =>
      listing?.id != null && listing.id !== ''
        ? String(listing.id)
        : `${listing?.title || ''}|${listing?.pickupAddress || ''}|${String(listing?.pricePerDay ?? '')}`,
    [listing?.id, listing?.title, listing?.pickupAddress, listing?.pricePerDay]
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    setActiveImageIndex(0);
    setDescriptionExpanded(false);
    flatListRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, [listingIdentityKey]);

  useEffect(() => {
    const id = routeListing?.id;
    if (!isRemoteListingId(id)) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const row = await getListing(String(id));
        if (!cancelled && row) mergeRemoteListings([row]);
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
  const pricePerDay = Number(listing.pricePerDay) || 89;
  const city = listing.city || 'Winnipeg';
  const pickupAddress = listing.pickupAddress || `${city}, MB R3N 0P2`;
  const instantBooking = listing.instantBooking === true;
  const hostName = listing.hostName || 'Moe Jackson';
  const hostTrips = listing.hostTrips ?? 52;
  const guestReviews = Array.isArray(listing.guestReviews) ? listing.guestReviews : [];
  const hostRatingRaw = Number(listing.hostRating);
  const hostRating = Number.isFinite(hostRatingRaw) ? hostRatingRaw : 5;
  const hostStarsFilled = Math.min(5, Math.max(0, Math.round(hostRating)));

  // If your listings ever include coordinates, we can center precisely.
  // For now, default to Winnipeg.
  const mapLatitude = typeof listing?.latitude === 'number' ? listing.latitude : 49.8951;
  const mapLongitude = typeof listing?.longitude === 'number' ? listing.longitude : -97.1384;
  const initialMapRegion = {
    latitude: mapLatitude,
    longitude: mapLongitude,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  };

  const bookingDates = route.params?.bookingDates;
  const hasBookingDates = bookingDates?.start != null && bookingDates?.end != null;

  const proceedToCheckout = () => {
    if (!hasBookingDates) {
      navigation.navigate('CalendarScreen', {
        mode: 'booking',
        returnTo: 'VehicleDetailScreen',
        listing,
        bookingSessionKey: Date.now(),
        savedCalendarData: listing.calendarData,
        minTripConstraint: listing.shortestTrip,
        maxTripConstraint: listing.longestTrip,
      });
      return;
    }
    navigation.navigate('BookingCheckoutScreen', { listing, bookingDates });
  };

  const startDate = bookingDates?.start
    ? `${new Date(bookingDates.start).toLocaleString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()} - ${bookingDates?.startTime || '12:00 AM'}`
    : 'JAN 20TH, 2019 - 12:00 AM';
  const endDate = bookingDates?.end
    ? `${new Date(bookingDates.end).toLocaleString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()} - ${bookingDates?.endTime || '9:00 PM'}`
    : 'JAN 26TH, 2019 - 9:00 PM';
  const descriptionShort = listing.description?.trim()
    ? listing.description.trim()
    : "This isn't your typical Mercedes. With a hand built 6.2L V8 pushing 507 horsepower this Mercedes is built for speed. The engine is mated to a 7 speed multiclutch transmission that allows for lightning quick shifts. This...";
  const descriptionFull = descriptionShort + " The interior is finished in premium leather with carbon fiber accents. A perfect blend of luxury and performance for the discerning driver.";
  const selectedFeatureSet = new Set(Array.isArray(listing.carFeatures) ? listing.carFeatures : []);
  const displayFeatures = selectedFeatureSet.size
    ? CAR_FEATURES_DISPLAY.filter((f) => selectedFeatureSet.has(f.key))
    : CAR_FEATURES_DISPLAY;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length) setActiveImageIndex(viewableItems[0].index ?? 0);
  }).current;
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke={COLORS.YELLOWISH_ORANGE} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {listing?.id != null && listing.id !== '' ? (
          <TouchableOpacity
            style={styles.favBtn}
            onPress={() => toggleFavorite(listing)}
            hitSlop={12}
          >
            <Text style={styles.favIcon}>{isFavorited(listing.id) ? '♥' : '♡'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Image carousel - card style: rounded corners, shadow, gaps, center larger, sides slightly visible */}
        <View style={[styles.carouselWrap, { height: CAROUSEL_HEIGHT }]}>
          {photos.length > 0 ? (
            <FlatList
              key={listingIdentityKey}
              ref={flatListRef}
              data={photos}
              horizontal
              style={styles.carouselList}
              showsHorizontalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              snapToOffsets={photos.map((_, i) => i * (CAROUSEL_CARD_WIDTH + CAROUSEL_CARD_GAP))}
              snapToAlignment="center"
              decelerationRate="fast"
              contentContainerStyle={{
                paddingHorizontal: (screenWidth - CAROUSEL_CARD_WIDTH) / 2,
              }}
              ItemSeparatorComponent={() => <View style={{ width: CAROUSEL_CARD_GAP }} />}
              keyExtractor={(item, i) => (item.uri || i).toString()}
              renderItem={({ item, index }) => {
                const isActive = index === activeImageIndex;
                const scale = isActive ? 1 : 0.9;
                return (
                  <View
                    style={[
                      styles.carouselSlide,
                      {
                        width: CAROUSEL_CARD_WIDTH,
                        height: CAROUSEL_HEIGHT,
                        zIndex: isActive ? 2 : 1,
                        transform: [{ scale }],
                      },
                    ]}
                  >
                    <Image source={{ uri: item.uri }} style={styles.carouselImage} resizeMode="cover" />
                  </View>
                );
              }}
            />
          ) : (
            <View style={[styles.carouselPlaceholder, { height: CAROUSEL_HEIGHT }]}>
              <Text style={styles.carouselPlaceholderText}>No photos</Text>
            </View>
          )}
        </View>

        {/* Host profile */}
        <TouchableOpacity style={styles.hostRow} onPress={() => {}} activeOpacity={0.85}>
          <View style={styles.hostAvatar} />
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
            <Text style={styles.hostTrips}>{hostTrips} trips</Text>
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
                            i <= Math.round(Number(rev.rating) || 0) ? COLORS.YELLOWISH_ORANGE : '#E0E0E0'
                          }
                        />
                      </Svg>
                    ))}
                  </View>
                </View>
                {rev.publicText ? <Text style={styles.guestReviewBody}>{rev.publicText}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Instant booking */}
        {instantBooking && (
          <View style={styles.instantBookingBadge}>
            <Image source={require('../assets/instantBookingIcon.png')} style={styles.instantBookingIcon} resizeMode="contain" />
            <Text style={styles.instantBookingText}>INSTANT BOOKING AVAILABLE</Text>
          </View>
        )}

        {/* Choose rental date */}
        <TouchableOpacity
          style={styles.chooseDateBtn}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('CalendarScreen', {
              mode: 'booking',
              returnTo: 'VehicleDetailScreen',
              listing,
              bookingSessionKey: Date.now(),
              savedCalendarData: listing.calendarData,
              minTripConstraint: listing.shortestTrip,
              maxTripConstraint: listing.longestTrip,
            })
          }
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" fill={COLORS.GREENY_BLUE_TWO} />
          </Svg>
          <Text style={styles.chooseDateText}>CHOOSE RENTAL DATE</Text>
          <Image source={require('../assets/icons/arrow-button.png')} style={styles.chooseDateArrow} resizeMode="contain" />
        </TouchableOpacity>

        {/* Rental dates */}
        <View style={styles.rentalDatesContainer}>
          <View style={styles.rentalDateHalf}>
            <Text style={styles.dateBoxLabel}>Start</Text>
            <Text style={styles.dateBoxValue}>{startDate}</Text>
          </View>
          <View style={styles.rentalDatesDivider} />
          <View style={styles.rentalDateHalf}>
            <Text style={styles.dateBoxLabel}>End</Text>
            <Text style={styles.dateBoxValue}>{endDate}</Text>
          </View>
        </View>

        {/* Pickup & drop off */}
        <View style={styles.pickupBox}>
          <Text style={styles.pickupLabel}>Pickup & drop off location</Text>
          <Text style={styles.pickupValue}>{pickupAddress}</Text>
        </View>

        {/* Restrictions */}
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
        {/* Divider between sections */}
        <View style={styles.sectionDivider} />

        {/* Pricing */}
        <Text style={styles.pricingHeader}>PRICING</Text>
        <View style={styles.pricingRow}>
          <Text style={styles.pricingLabel}>Kilometres Overage Fee*</Text>
          <Text style={styles.restrictionsValue}>$ {(Number(listing.kmOverageFee) || 0.25).toFixed(2)}/KM</Text>
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

        {/* Car features */}
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

        {/* Description */}
        <Text style={styles.descriptionHeader}>Description</Text>
        <View style={styles.sectionMidDivider} />
        <Text style={styles.descriptionText}>
          {descriptionExpanded ? descriptionFull : descriptionShort}
        </Text>
        <TouchableOpacity onPress={() => setDescriptionExpanded(!descriptionExpanded)} style={styles.viewMoreWrap}>
          <Text style={styles.viewMoreText}>{descriptionExpanded ? 'VIEW LESS' : 'VIEW MORE'}</Text>
        </TouchableOpacity>

        {/* Pickup map placeholder */}
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
          <Marker coordinate={{ latitude: mapLatitude, longitude: mapLongitude }} />
          <Circle
            center={{ latitude: mapLatitude, longitude: mapLongitude }}
            radius={250}
            strokeColor={COLORS.GREENY_BLUE_TWO}
            fillColor="rgba(76, 182, 177, 0.15)"
            strokeWidth={2}
          />
        </MapView>

        {/* Checkout CTA (scrolls with content) */}
        <TouchableOpacity
          style={styles.checkoutSection}
          activeOpacity={0.85}
          onPress={proceedToCheckout}
        >
          <View style={styles.checkoutBtn}>
            <Text style={styles.checkoutBtnText}>PROCEED TO CHECKOUT</Text>
            <View style={styles.checkoutArrowTip} />
          </View>
          <View style={styles.priceBadge}>
            <Text style={styles.priceBadgeText}>
              <Text style={styles.priceBadgeMain}>CAD ${pricePerDay}/</Text>
              <Text style={styles.priceBadgeDay}>DAY</Text>
            </Text>
          </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  backBtn: {
    padding: 4,
    width: 40,
  },
  title: {
    fontFamily: FONTS.NUNITO_MEDIUM,
    fontSize: 20,
    color: 'rgb(100, 97, 97)',
    letterSpacing: -0.1,
    width: 232,
    height: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  headerSpacer: {
    width: 40,
  },
  favBtn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favIcon: {
    fontSize: 22 * scale,
    color: COLORS.MANGO_TWO,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20 * scale,
    paddingBottom: TAB_BAR_HEIGHT + 28,
  },
  carouselWrap: {
    width: screenWidth,
    marginHorizontal: -20 * scale,
    marginTop: 12,
    marginBottom: 4,
  },
  carouselList: {
    width: screenWidth,
  },
  carouselSlide: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.14,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselPlaceholderText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: '#9B9B9B',
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 8,
    borderRadius: 4,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 0,
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
    flex: 1,
    paddingRight: 8,
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
    width: '100%',
    height: 46,
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
    width: 197,
    height: 18,
    textAlign: 'center',
    lineHeight: 18,
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
    height: 18,
    textAlign: 'center',
    lineHeight: 18,
    width: 149,
  },
  chooseDateArrow: {
    width: 6,
    height: 9,
  },
  rentalDatesContainer: {
    flexDirection: 'row',
    width: '100%',
    height: 59,
    backgroundColor: 'rgb(242, 242, 242)',
    borderRadius: 7,
    marginTop: 20,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  rentalDateHalf: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  rentalDatesDivider: {
    width: 1,
    height: 59,
    backgroundColor: 'rgba(151, 151, 151, 0.21)',
  },
  sectionDivider: {
    alignSelf: 'stretch',
    width: '100%',
    height: 2,
    opacity: 0.8560267857142857,
    borderTopWidth: 1,
    borderTopColor: COLORS.GREENY_BLUE_TWO,
    marginTop: 10,
    marginBottom: 10,
  },
  rowDivider: {
    alignSelf: 'stretch',
    width: '100%',
    height: 1,
    opacity: 0.1746186755952381,
    borderTopWidth: 1,
    borderTopColor: 'rgb(151, 151, 151)',
  },
  sectionMidDivider: {
    alignSelf: 'stretch',
    width: '100%',
    height: 1,
    opacity: 0.1746186755952381,
    borderTopWidth: 1,
    borderTopColor: 'rgb(151, 151, 151)',
    marginTop: 8,
    marginBottom: 8,
  },
  dateBoxLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: COLORS.GREENY_BLUE_TWO,
    kerning: 0.2,
    width: 31,
    height: 18,
    textAlign: 'left',
    opacity: 0.8809291294642857,
    lineHeight: 18,
    marginBottom: 4,
  },
  dateBoxValue: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 9,
    color: 'rgb(102, 102, 102)',
    kerning: 0.1,
    width: 121,
    height: 12,
    textAlign: 'left',
    lineHeight: 12,
    opacity: 0.5091145833333334,
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
    kerning: 0.2,
    opacity: 0.8809291294642857,
    textAlign: 'left',
    lineHeight: 18,
    marginBottom: 4,
  },
  pickupValue: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 9,
    color: 'rgb(102, 102, 102)',
    kerning: 0.1,
    width: 99,
    height: 12,
    textAlign: 'center',
    lineHeight: 12,
    opacity: 0.5091145833333334,
  },
  sectionTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 12,
    color: '#000',
    letterSpacing: 0.2,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitleGreen: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: COLORS.GREENY_BLUE_TWO,
    kerning: 0.2,
    textAlign: 'center',
    opacity: 0.8809291294642857,
    lineHeight: 18,
    marginTop: 20,
    marginBottom: 10,
  },
  carFeaturesSectionLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: '#4A4A4A',
    letterSpacing: 0.2,
    marginTop: 28 * scale,
    marginBottom: 8 * scale,
  },
  carFeaturesHeader: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#000',
    kerning: 0.2,
    width: 200,
    height: 15,
    textAlign: 'left',
    opacity: 0.6994977678571429,
    marginTop: 20,
    marginBottom: 6,
  },
  descriptionHeader: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: COLORS.GREENY_BLUE_TWO,
    kerning: 0.2,
    textAlign: 'left',
    opacity: 0.8809291294642857,
    lineHeight: 18,
    marginTop: 20,
    marginBottom: 0,
  },
  pickupHeaderAboveMap: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: COLORS.GREENY_BLUE_TWO,
    kerning: 0.2,
    textAlign: 'left',
    opacity: 0.8809291294642857,
    lineHeight: 18,
    marginTop: 20,
    marginBottom: 0,
  },
  restrictionsHeader: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#000',
    kerning: 0.2,
    width: 81,
    height: 15,
    textAlign: 'center',
    opacity: 0.6994977678571429,
    marginTop: 24,
    marginBottom: 8,
  },
  pricingHeader: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#000',
    kerning: 0.2,
    width: 46,
    height: 15,
    textAlign: 'center',
    opacity: 0.6994977678571429,
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
    kerning: 0.2,
    opacity: 0.8809291294642857,
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
    kerning: 0.2,
    opacity: 0.8809291294642857,
  },
  pricingValue: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: '#4A4A4A',
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
    position: 'relative',
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
    fontFamily: 'GothamRounded-Medium',
    fontSize: 11,
    color: 'rgb(100, 97, 97)',
    textAlign: 'center',
    kerning: 0.3,
    width: '100%',
    height: 75,
    lineHeight: 16,
  },
  viewMoreWrap: {
    marginTop: 8,
    alignSelf: 'center',
  },
  viewMoreText: {
    fontFamily: 'GothamRounded-Medium',
    fontSize: 9,
    color: COLORS.YELLOWISH_ORANGE,
    textAlign: 'center',
    letterSpacing: 0.2,
    width: 61,
    height: 9,
    lineHeight: 9,
  },
  mapPlaceholder: {
    width: screenWidth,
    height: 180,
    backgroundColor: '#E8F4F4',
    borderRadius: 0,
    overflow: 'hidden',
    marginTop: 0,
    marginBottom: 12,
    alignSelf: 'stretch',
    marginHorizontal: -20 * scale,
  },
  mapPlaceholderText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: COLORS.GREENY_BLUE_TWO,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20 * scale,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
    zIndex: 50,
    elevation: 50,
  },
  checkoutSection: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 0,
    paddingTop: 0,
    borderTopWidth: 0,
    marginTop: 16,
    marginBottom: 12,
    alignSelf: 'stretch',
    width: screenWidth,
    marginHorizontal: -20 * scale,
  },
  checkoutBtn: {
    width: 168,
    height: 61,
    backgroundColor: COLORS.YELLOWISH_ORANGE,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginRight: 0,
    paddingLeft: 18,
    position: 'relative',
    zIndex: 2,
  },
  checkoutBtnText: {
    fontFamily: 'GothamRounded-Book',
    fontSize: 12,
    color: '#fff',
    letterSpacing: -0.2,
    width: 170,
    textAlign: 'left',
    lineHeight: 16,
  },
  checkoutArrowTip: {
    position: 'absolute',
    right: -30,
    top: 0,
    width: 0,
    height: 0,
    borderTopWidth: 30.5,
    borderBottomWidth: 30.5,
    borderLeftWidth: 30,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: COLORS.YELLOWISH_ORANGE,
  },
  priceBadge: {
    flex: 1,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    paddingVertical: 16,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceBadgeText: {
    width: '100%',
    height: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  priceBadgeMain: {
    fontFamily: 'GothamRounded-Book',
    fontSize: 20,
    color: '#fff',
    letterSpacing: -0.1,
  },
  priceBadgeDay: {
    fontFamily: 'GothamRounded-Book',
    fontSize: 11,
    color: '#fff',
    letterSpacing: -0.1,
  },
  
});
