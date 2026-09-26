import React from 'react';
import { uiScale } from '../utils/uiScale';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getListingDisplayRating, listingHasGuestReviews } from '../utils/listingRating';
import {
  formatListingSpecsLine,
  formatListingTrustLine,
  formatCardDateRange,
  formatDistanceKm,
  getListingTripSubtotal,
  getListingDistanceFromOrigin,
  isNewHostListing,
} from '../utils/listingCardMeta';
import { listingCoverUri } from '../utils/listingPhotos';

const scale = uiScale;

export function ListingPriceText({ pricePerDay }) {
  const amount = `$${Number(pricePerDay) || 0}`;
  return (
    <Text style={styles.cardPrice}>
      <Text style={styles.cardPriceAmount}>{amount}</Text>
      <Text style={styles.cardPriceCurrency}> CAD</Text>
      <Text style={styles.cardPriceUnit}> / day</Text>
    </Text>
  );
}

export function ListingStarRating({ rating, size = 12 }) {
  const full = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Svg key={i} width={size} height={size} viewBox="0 0 24 24" style={styles.star}>
          <Path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={i <= full ? '#FFC107' : 'none'}
            stroke={i <= full ? '#FFC107' : '#E0E0E0'}
            strokeWidth={1.5}
          />
        </Svg>
      ))}
    </View>
  );
}

/**
 * Marketplace listing card.
 * Pass bookingDates + searchOrigin on search results for trip total, dates, and distance.
 */
export default function ListingCard({
  listing,
  onPress,
  isFavorited = false,
  onToggleFavorite,
  showInstantBadge = true,
  forSwipeRow = false,
  bookingDates = null,
  searchOrigin = null,
  distanceKm: distanceKmProp = null,
}) {
  const heartInteractive = typeof onToggleFavorite === 'function';
  const specs = formatListingSpecsLine(listing);
  const trustLine = formatListingTrustLine(listing);
  const newHost = isNewHostListing(listing);
  const tripSubtotal = getListingTripSubtotal(listing, bookingDates);
  const dateRange = formatCardDateRange(bookingDates);
  const distance =
    distanceKmProp != null
      ? distanceKmProp
      : getListingDistanceFromOrigin(listing, searchOrigin);
  const distanceLabel = formatDistanceKm(distance);
  const footerParts = [dateRange, distanceLabel ? `${distanceLabel} away` : null].filter(Boolean);
  const coverUri = listingCoverUri(listing?.photos);

  return (
    <TouchableOpacity
      style={[styles.card, forSwipeRow ? styles.cardInSwipeRow : styles.cardDefaultRadius]}
      activeOpacity={0.9}
      onPress={onPress}
      delayPressIn={forSwipeRow ? 120 : heartInteractive ? 0 : 70}
    >
      <View style={styles.cardImageWrap}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.cardPlaceholderText}>No photo</Text>
          </View>
        )}
        {showInstantBadge && listing.instantBooking ? (
          <View style={styles.instantBadge}>
            <Image source={require('../assets/instantBookingIcon.png')} style={styles.instantBadgeImage} resizeMode="contain" />
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.heartButton}
          onPress={(e) => {
            if (heartInteractive) {
              e?.stopPropagation?.();
              onToggleFavorite(listing);
            }
          }}
          activeOpacity={heartInteractive ? 0.85 : 1}
          disabled={!heartInteractive}
        >
          <Svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill={isFavorited ? '#FF3B30' : 'none'}
            stroke={isFavorited ? '#FF3B30' : '#fff'}
            strokeWidth={2}
          >
            <Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </Svg>
        </TouchableOpacity>
      </View>
      <View style={styles.cardBody}>
        <View
          style={{
            position: 'relative',
            width: '100%',
            paddingRight: 120,
          }}
        >
          <Text style={styles.cardTitle}>{listing.title || 'Vehicle'}</Text>
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              alignItems: 'flex-end',
            }}
          >
            <Text style={styles.cardPrice} numberOfLines={1}>
              <Text style={styles.cardPriceAmount}>${Number(listing.pricePerDay) || 0}</Text>
              <Text style={styles.cardPriceCurrency}> CAD</Text>
              <Text style={styles.cardPriceUnit}> / day</Text>
            </Text>
            {tripSubtotal != null ? (
              <Text style={styles.tripTotal} numberOfLines={1}>
                ${tripSubtotal} trip
              </Text>
            ) : null}
          </View>
        </View>
        {specs ? <Text style={styles.cardSpecs}>{specs}</Text> : null}

        {newHost ? (
          <Text style={styles.newHostText}>New host</Text>
        ) : trustLine ? (
          <Text style={styles.trustLine}>{trustLine}</Text>
        ) : listingHasGuestReviews(listing) ? (
          <View style={styles.cardMeta}>
            <ListingStarRating rating={getListingDisplayRating(listing)} size={12} />
          </View>
        ) : null}

        {footerParts.length > 0 ? (
          <Text style={styles.footerLine}>{footerParts.join(' · ')}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  cardDefaultRadius: {
    borderRadius: 12,
  },
  cardInSwipeRow: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  cardImageWrap: {
    position: 'relative',
    width: '100%',
    height: 180 * scale,
    backgroundColor: '#f0f0f0',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPlaceholderText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: '#9B9B9B',
  },
  instantBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instantBadgeImage: {
    width: 32,
    height: 32,
  },
  heartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  cardBody: {
    padding: 14 * scale,
  },
  titlePriceRow: {
    position: 'relative',
    width: '100%',
  },
  cardTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16,
    color: 'rgb(80,80,80)',
    textAlign: 'left',
    marginBottom: 4,
  },
  cardSpecs: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: 'rgb(142,142,142)',
    marginBottom: 8,
    textAlign: 'left',
    paddingRight: 100,
  },
  newHostText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 13,
    color: COLORS.MANGO_TWO,
    marginBottom: 8,
  },
  trustLine: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: 'rgb(80,80,80)',
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  star: {
    marginRight: 2,
  },
  priceBlock: {
    position: 'absolute',
    top: 0,
    right: 0,
    alignItems: 'flex-end',
  },
  cardPrice: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    letterSpacing: -0.5,
    textAlign: 'right',
  },
  cardPriceAmount: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(56,141,137)',
    letterSpacing: -0.5,
  },
  cardPriceCurrency: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: COLORS.MANGO_TWO,
    letterSpacing: -0.5,
  },
  cardPriceUnit: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: 'rgb(142,142,142)',
    letterSpacing: -0.3,
  },
  tripTotal: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: 'rgb(56,141,137)',
    marginTop: 2,
    textAlign: 'right',
  },
  footerLine: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: 'rgb(142,142,142)',
    marginTop: 6,
  },
});
