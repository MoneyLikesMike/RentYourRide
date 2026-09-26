import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { uiScale } from '../utils/uiScale';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { formatDistanceKm } from '../utils/homeDiscovery';
import { listingCoverUri } from '../utils/listingPhotos';

const scale = uiScale;

export default function HomeStripCard({
  listing,
  onPress,
  distanceKm: distance,
  badge,
}) {
  const photoUri = listingCoverUri(listing?.photos);
  const price = Number(listing?.pricePerDay) || 0;
  const distanceLabel = formatDistanceKm(distance);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
      <View style={styles.imageWrap}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>No photo</Text>
          </View>
        )}
        {badge === 'new' ? (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>New</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {listing?.title || 'Vehicle'}
      </Text>
      <Text style={styles.price}>
        <Text style={styles.priceAmount}>${price}</Text>
        <Text style={styles.priceUnit}>/day</Text>
      </Text>
      {distanceLabel ? <Text style={styles.meta}>{distanceLabel}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 138 * scale,
    marginRight: 12 * scale,
  },
  imageWrap: {
    width: '100%',
    height: 92 * scale,
    borderRadius: 8 * scale,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 8 * scale,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: '#9B9B9B',
  },
  newBadge: {
    position: 'absolute',
    top: 8 * scale,
    left: 8 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 10 * scale,
    paddingHorizontal: 8 * scale,
    paddingVertical: 2 * scale,
  },
  newBadgeText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 10 * scale,
    color: '#fff',
  },
  title: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 13 * scale,
    color: 'rgb(80,80,80)',
    marginBottom: 2 * scale,
  },
  price: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
  },
  priceAmount: {
    color: 'rgb(56,141,137)',
  },
  priceUnit: {
    color: 'rgb(142,142,142)',
  },
  meta: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: 'rgb(142,142,142)',
    marginTop: 2 * scale,
  },
});
