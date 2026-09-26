import React, { useRef, useState, useCallback } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { Video, ResizeMode } from 'expo-av';
import { FONTS } from '../constants/fonts';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const scale = uiScale;
const THUMB_SIZE = 56 * scale;
const THUMB_GAP = 8 * scale;

function normalizeGalleryItem(item) {
  if (typeof item === 'string') {
    const isVideo = /\.(mp4|mov|m4v|webm)(\?|$)/i.test(item);
    return { uri: item, type: isVideo ? 'video' : 'image' };
  }
  if (!item || typeof item !== 'object') return null;
  const uri = item.uri || item.url || '';
  if (!uri) return null;
  const type =
    item.type === 'video' || /\.(mp4|mov|m4v|webm)(\?|$)/i.test(uri) ? 'video' : 'image';
  return { uri, type };
}

export default function ListingPhotoGalleryScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const photos = (Array.isArray(route.params?.photos) ? route.params.photos : [])
    .map(normalizeGalleryItem)
    .filter(Boolean);
  const title = route.params?.title || '';
  const initialIndex = Math.min(
    Math.max(Number(route.params?.initialIndex) || 0, 0),
    Math.max(photos.length - 1, 0),
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const mainRef = useRef(null);
  const thumbsRef = useRef(null);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const next = viewableItems?.[0]?.index;
    if (typeof next !== 'number') return;
    setActiveIndex(next);
    thumbsRef.current?.scrollToIndex?.({ index: next, animated: true, viewPosition: 0.5 });
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  const goToIndex = useCallback((index) => {
    if (index < 0 || index >= photos.length) return;
    mainRef.current?.scrollToIndex?.({ index, animated: true });
    setActiveIndex(index);
    thumbsRef.current?.scrollToIndex?.({ index, animated: true, viewPosition: 0.5 });
  }, [photos.length]);

  if (!photos.length) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <CloseIcon />
        </TouchableOpacity>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No photos</Text>
        </View>
      </View>
    );
  }

  const active = photos[activeIndex];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.closeBtn, { top: insets.top + 8 }]}
        onPress={() => navigation.goBack()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Close photos"
      >
        <CloseIcon />
      </TouchableOpacity>

      <FlatList
        ref={mainRef}
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
        onScrollToIndexFailed={({ index }) => {
          requestAnimationFrame(() => {
            mainRef.current?.scrollToOffset?.({ offset: screenWidth * index, animated: false });
          });
        }}
        keyExtractor={(item, index) => `${item.uri}-${index}`}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => (
          <View style={styles.mainSlide}>
            {item.type === 'video' ? (
              <Video
                source={{ uri: item.uri }}
                style={styles.mainVideo}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={index === activeIndex}
                isLooping
                isMuted
                useNativeControls
              />
            ) : (
              <Image source={{ uri: item.uri }} style={styles.mainImage} resizeMode="contain" />
            )}
          </View>
        )}
      />

      {photos.length > 1 ? (
        <>
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnPrev, { top: screenHeight * 0.42 }]}
            onPress={() => goToIndex((activeIndex - 1 + photos.length) % photos.length)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Previous photo"
          >
            <Chevron direction="left" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnNext, { top: screenHeight * 0.42 }]}
            onPress={() => goToIndex((activeIndex + 1) % photos.length)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Next photo"
          >
            <Chevron direction="right" />
          </TouchableOpacity>
        </>
      ) : null}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {photos.length > 1 ? (
          <Text style={styles.countText}>
            {activeIndex + 1} / {photos.length}
            {active?.type === 'video' ? ' · Video' : ''}
          </Text>
        ) : null}
        {title ? <Text style={styles.titleText} numberOfLines={1}>{title}</Text> : null}
        {photos.length > 1 ? (
          <FlatList
            ref={thumbsRef}
            data={photos}
            horizontal
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, index) => ({
              length: THUMB_SIZE + THUMB_GAP,
              offset: (THUMB_SIZE + THUMB_GAP) * index,
              index,
            })}
            onScrollToIndexFailed={() => {}}
            contentContainerStyle={styles.thumbsContent}
            keyExtractor={(item, index) => `thumb-${item.uri}-${index}`}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                onPress={() => goToIndex(index)}
                activeOpacity={0.85}
                style={[styles.thumbBtn, index === activeIndex && styles.thumbBtnActive]}
                accessibilityRole="button"
                accessibilityLabel={item.type === 'video' ? `Video ${index + 1}` : `Photo ${index + 1}`}
              >
                {item.type === 'video' ? (
                  <View style={[styles.thumbImage, styles.thumbVideo]}>
                    <Video
                      source={{ uri: item.uri }}
                      style={StyleSheet.absoluteFill}
                      resizeMode={ResizeMode.COVER}
                      shouldPlay={false}
                      isMuted
                    />
                    <View style={styles.thumbPlayDot} />
                  </View>
                ) : (
                  <Image source={{ uri: item.uri }} style={styles.thumbImage} resizeMode="cover" />
                )}
              </TouchableOpacity>
            )}
          />
        ) : null}
      </View>
    </View>
  );
}

function CloseIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6l12 12M18 6L6 18"
        stroke="#fff"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function Chevron({ direction }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d={direction === 'left' ? 'M15 5 8 12l7 7' : 'M9 5l7 7-7 7'}
        stroke="#fff"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainSlide: {
    width: screenWidth,
    height: screenHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainImage: {
    width: screenWidth,
    height: screenHeight * 0.72,
  },
  mainVideo: {
    width: screenWidth,
    height: screenHeight * 0.72,
    backgroundColor: '#000',
  },
  navBtn: {
    position: 'absolute',
    zIndex: 5,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnPrev: {
    left: 12,
  },
  navBtnNext: {
    right: 12,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  countText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  titleText: {
    fontFamily: FONTS.NUNITO,
    fontSize: 12 * scale,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  thumbsContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: THUMB_GAP,
  },
  thumbBtn: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: THUMB_GAP,
  },
  thumbBtnActive: {
    borderColor: '#fff',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbVideo: {
    backgroundColor: '#222',
  },
  thumbPlayDot: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#fff',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: FONTS.NUNITO,
    fontSize: 15,
    color: '#fff',
  },
});
