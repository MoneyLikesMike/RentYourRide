import React from 'react';
import { uiScale } from '../utils/uiScale';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const { width: screenWidth } = Dimensions.get('window');
const scale = uiScale;

export function ListingPriceText({ pricePerDay }) {
  const amount = `$${Number(pricePerDay) || 0}`;
  return (
    <Text style={styles.cardPrice}>
      <Text style={styles.cardPriceAmount}>{amount}</Text>
      <Text style={styles.cardPriceCurrency}> CAD</Text>
    </Text>
  );
}

export function ListingStarRating({ rating = 4, size = 12 }) {
  const full = Math.floor(Number(rating) || 0);
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
 * Same card layout as SearchResultsScreen — search / manage listings.
 */
export default function ListingCard({
  listing,
  onPress,
  isFavorited = false,
  onToggleFavorite,
  showInstantBadge = true,
  /** When true (e.g. swipeable row), square right edge so action strip meets flush — rounded card corners otherwise leave grey wedges. */
  forSwipeRow = false,
}) {
  const heartInteractive = typeof onToggleFavorite === 'function';

  return (
    <TouchableOpacity
      style={[styles.card, forSwipeRow ? styles.cardInSwipeRow : styles.cardDefaultRadius]}
      activeOpacity={0.9}
      onPress={onPress}
      delayPressIn={forSwipeRow ? 120 : heartInteractive ? 0 : 70}
    >
      <View style={styles.cardImageWrap}>
        {listing.photos && listing.photos[0]?.uri ? (
          <Image source={{ uri: listing.photos[0].uri }} style={styles.cardImage} resizeMode="cover" />
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
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {listing.title || 'Vehicle'}
          </Text>
          <ListingPriceText pricePerDay={listing.pricePerDay} />
        </View>
        <Text style={styles.cardType}>{(listing.vehicleType || 'SEDAN').toUpperCase()}</Text>
        <View style={styles.cardMeta}>
          <ListingStarRating rating={listing.rating ?? 4} size={12} />
          <Text style={styles.tripsText}>{listing.trips ?? 0} trips</Text>
        </View>
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
  /** Left corners match row; right edge square against swipe actions (parent swipeWrap still clips outer radius). */
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16,
    color: 'rgb(80,80,80)',
    flex: 1,
    marginRight: 8,
    textAlign: 'left',
  },
  cardPrice: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 17,
    letterSpacing: -0.7,
    textAlign: 'center',
  },
  cardPriceAmount: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 17,
    color: 'rgb(56,141,137)',
    letterSpacing: -0.7,
  },
  cardPriceCurrency: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 17,
    color: COLORS.MANGO_TWO,
    letterSpacing: -0.7,
  },
  cardType: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 10,
    color: 'rgb(176,176,176)',
    marginBottom: 8,
    textAlign: 'left',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  star: {
    marginRight: 2,
  },
  tripsText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: 'rgb(142,142,142)',
  },
});
