import React from 'react';
import { uiScale } from '../utils/uiScale';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const scale = uiScale;

/** Same 2×4 empty-state tiles as rental agreement (exterior, interior, fuel, gauges, license). */
export const PICTURE_DOCUMENTATION_PLACEHOLDERS = [
  require('../assets/icons/stencilFrontGreen.png'),
  require('../assets/icons/stencilSideGreen.png'),
  require('../assets/icons/stencilLeftSideGreen.png'),
  require('../assets/icons/stencilRearGreen.png'),
  require('../assets/icons/stencilInteriorGreen.png'),
  require('../assets/icons/fuel.png'),
  require('../assets/icons/gauges.png'),
  require('../assets/icons/drivingLicense1.png'),
];

function resolveUri(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') return entry;
  return entry.uri || null;
}

const MIN_SLOTS = PICTURE_DOCUMENTATION_PLACEHOLDERS.length;

export default function PictureDocumentationPlaceholderGrid({ photos }) {
  const list = Array.isArray(photos) ? photos : [];
  const slotCount = Math.max(MIN_SLOTS, list.length);

  return (
    <View style={styles.photoGrid}>
      {Array.from({ length: slotCount }).map((_, i) => {
        const uri = resolveUri(list[i]);
        const placeholderSrc =
          PICTURE_DOCUMENTATION_PLACEHOLDERS[Math.min(i, MIN_SLOTS - 1)];

        return (
          <View key={`slot-${i}-${uri || 'ph'}`} style={styles.photoCell}>
            {uri ? (
              <Image source={{ uri }} style={styles.photoCellFilled} resizeMode="cover" />
            ) : (
              <Image source={placeholderSrc} style={styles.photoCellImg} resizeMode="contain" />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 0,
    paddingHorizontal: 10 * scale,
  },
  photoCell: {
    width: (screenWidth - 60 * scale - 8 * scale) / 2,
    aspectRatio: 1,
    backgroundColor: 'rgba(76, 182, 177, 0.15)',
    borderRadius: 8 * scale,
    marginBottom: 8 * scale,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCellImg: {
    width: '58%',
    height: '58%',
    opacity: 0.35,
  },
  photoCellFilled: {
    width: '100%',
    height: '100%',
  },
});
