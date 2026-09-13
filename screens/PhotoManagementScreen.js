import React, { useState, useCallback, useRef } from 'react';
import { uiScale } from '../utils/uiScale';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  Alert,
  ActionSheetIOS,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useListings } from '../context/ListingsContext';
import { useSaveListingStep } from '../hooks/useSaveListingStep';
import {
  isListingVideo,
  normalizeListingMedia,
  listingThumbUri,
} from '../utils/listingPhotos';
import {
  MAX_LISTING_PHOTOS,
  MAX_LISTING_VIDEOS,
  listingVideoRejectReason,
} from '../constants/listingMedia';

const { width: screenWidth } = Dimensions.get('window');
const scale = uiScale;
const MAX_PHOTOS = MAX_LISTING_PHOTOS;
const MAX_VIDEOS = MAX_LISTING_VIDEOS;

const COVER_BADGE_COLOR = '#3AAFA9';
const ORANGE = '#FFB131';

function PlayBadge({ size = 28 }) {
  return (
    <View style={[styles.playBadge, { width: size, height: size, borderRadius: size / 2 }]}>
      <View
        style={[
          styles.playTriangle,
          {
            borderTopWidth: size * 0.18,
            borderBottomWidth: size * 0.18,
            borderLeftWidth: size * 0.28,
            marginLeft: size * 0.06,
          },
        ]}
      />
    </View>
  );
}

function MediaPreview({ item, style, resizeMode = 'cover' }) {
  const uri = listingThumbUri(item) || item?.uri;
  const isVideo = isListingVideo(item);
  if (isVideo) {
    return (
      <View style={[style, styles.mediaPreviewWrap]}>
        <Video
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay={false}
          isMuted
          useNativeControls={false}
        />
        <View style={styles.playBadgeCenter}>
          <PlayBadge size={36 * scale} />
        </View>
      </View>
    );
  }
  return <Image source={{ uri }} style={style} resizeMode={resizeMode} />;
}

const PhotoManagementScreen = ({ navigation, route }) => {
  const { editingListingId, draft } = useListings();
  const { saveStep, saving } = useSaveListingStep();
  const insets = useSafeAreaInsets();
  const mapPhoto = (p) => normalizeListingMedia(p) || { uri: typeof p === 'string' ? p : p?.uri };
  const initialPhotos = (route.params?.photos ?? []).map(mapPhoto).filter((p) => p?.uri);
  const [photos, setPhotos] = useState(initialPhotos);

  const draftRef = useRef(draft);
  draftRef.current = draft;

  useFocusEffect(
    useCallback(() => {
      if (!editingListingId) return;
      const list = draftRef.current?.photos;
      if (!Array.isArray(list) || list.length === 0) return;
      setPhotos(list.map(mapPhoto).filter((p) => p?.uri));
    }, [editingListingId])
  );

  const photoCount = photos.filter((p) => !isListingVideo(p)).length;
  const videoCount = photos.filter((p) => isListingVideo(p)).length;
  const canAddPhoto = photoCount < MAX_PHOTOS;
  const canAddVideo = videoCount < MAX_VIDEOS;
  const canAddMore = canAddPhoto || canAddVideo;

  const handleBack = () => {
    navigation.goBack();
  };

  const setAsCover = useCallback((index) => {
    if (index <= 0) return;
    setPhotos((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      // Videos pin to the front (Marketplace-style); cards still prefer an image cover.
      next.unshift(item);
      return next;
    });
  }, []);

  const deletePhoto = useCallback((index) => {
    const item = photos[index];
    const kind = isListingVideo(item) ? 'video' : 'photo';
    Alert.alert(`Remove ${kind}`, `Remove this ${kind} from your listing?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setPhotos((prev) => prev.filter((_, i) => i !== index)),
      },
    ]);
  }, [photos]);

  const showAddMediaOptions = useCallback(() => {
    if (!canAddMore) return;
    const options = [];
    const handlers = [];
    if (canAddPhoto) {
      options.push('Take Photo', 'Choose photos');
      handlers.push(openCamera, openLibrary);
    }
    if (canAddVideo) {
      options.push('Add video');
      handlers.push(openVideoLibrary);
    }
    options.push('Cancel');
    const cancelIndex = options.length - 1;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex },
        async (buttonIndex) => {
          const fn = handlers[buttonIndex];
          if (fn) await fn();
        }
      );
    } else {
      Alert.alert(
        'Add media',
        undefined,
        [
          ...handlers.map((fn, i) => ({ text: options[i], onPress: fn })),
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    }
  }, [canAddMore, canAddPhoto, canAddVideo, photos.length]);

  const openCamera = async () => {
    if (!canAddPhoto) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const toAdd = result.assets.slice(0, MAX_PHOTOS - photoCount).map((a) => ({
        uri: a.uri,
        type: 'image',
      }));
      setPhotos((prev) => [...prev, ...toAdd]);
    }
  };

  const openLibrary = async () => {
    if (!canAddPhoto) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required to choose photos.');
      return;
    }
    const remaining = MAX_PHOTOS - photoCount;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled && result.assets?.length) {
      const toAdd = result.assets.slice(0, remaining).map((a) => ({
        uri: a.uri,
        type: 'image',
      }));
      setPhotos((prev) => [...prev, ...toAdd]);
    }
  };

  const openVideoLibrary = async () => {
    if (!canAddVideo) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Library access is required to choose a video.');
      return;
    }
    const remaining = MAX_VIDEOS - videoCount;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
      videoMaxDuration: 60,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      const accepted = [];
      for (const a of result.assets.slice(0, remaining)) {
        const reason = listingVideoRejectReason(a);
        if (reason) {
          Alert.alert('Video not added', reason);
          continue;
        }
        accepted.push({
          uri: a.uri,
          type: 'video',
          mimeType: a.mimeType || 'video/mp4',
          ...(a.fileSize != null ? { fileSize: a.fileSize } : {}),
          ...(a.duration != null ? { duration: a.duration } : {}),
        });
      }
      if (!accepted.length) return;
      setPhotos((prev) => {
        // Pin videos first so they are not buried in the photo grid.
        const images = prev.filter((p) => !isListingVideo(p));
        const videos = [...prev.filter((p) => isListingVideo(p)), ...accepted];
        return [...videos, ...images];
      });
    }
  };

  const handleContinue = async () => {
    const ok = await saveStep({ photos }, { uploadPhotos: true });
    if (!ok) return;
    if (editingListingId) {
      navigation.navigate('EditYourRideScreen');
    } else {
      navigation.navigate('HostStandardsScreen');
    }
  };

  const coverPhoto = photos[0];
  const gridPhotos = photos.slice(1);
  const GRID_SLOTS_LEFT = [0, 2, 4, 6, 8];
  const GRID_SLOTS_RIGHT = [1, 3, 5, 7];

  const renderGridCell = (slotIndex) => {
    if (slotIndex < gridPhotos.length) {
      const photo = gridPhotos[slotIndex];
      const globalIndex = 1 + slotIndex;
      return (
        <TouchableOpacity
          key={`photo-${globalIndex}`}
          style={styles.gridItem}
          onPress={() => setAsCover(globalIndex)}
          activeOpacity={0.9}
        >
          <MediaPreview item={photo} style={styles.gridImage} />
          <TouchableOpacity
            style={[styles.deleteButton, styles.gridDelete]}
            onPress={() => deletePhoto(globalIndex)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteButtonText}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }
    if (slotIndex === gridPhotos.length && canAddMore) {
      return (
        <View key="max-photos-text" style={styles.gridItemTextCell}>
          <View style={styles.maxPhotosTextInGrid}>
            <Text style={styles.maxPhotosText}>
              UP TO {MAX_PHOTOS} PHOTOS + {MAX_VIDEOS}{' '}
              {MAX_VIDEOS === 1 ? 'VIDEO' : 'VIDEOS'}
            </Text>
          </View>
        </View>
      );
    }
    return null;
  };

  const hasContent = (slotIndex) =>
    slotIndex < gridPhotos.length || (slotIndex === gridPhotos.length && canAddMore);
  const leftSlots = GRID_SLOTS_LEFT.filter(hasContent);
  const rightSlots = GRID_SLOTS_RIGHT.filter(hasContent);

  const showGrid = coverPhoto || gridPhotos.length > 0 || canAddMore;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke={ORANGE} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>SHOW OFF YOUR RIDE</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {coverPhoto ? (
          <View style={styles.coverWrapper}>
            <MediaPreview item={coverPhoto} style={styles.coverImage} />
            <View style={styles.coverBadge}>
              <Text style={styles.coverBadgeText}>
                {isListingVideo(coverPhoto) ? 'COVER VIDEO' : 'THIS IS YOUR COVER PHOTO'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deletePhoto(0)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.deleteButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.placeholderText}>No photos yet</Text>
          </View>
        )}

        {showGrid && (
          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              {leftSlots.map(renderGridCell)}
            </View>
            <View style={styles.gridCol}>
              {rightSlots.map(renderGridCell)}
            </View>
          </View>
        )}

        <View style={styles.instructionRow}>
          <Image source={require('../assets/mapMarkerInfo.png')} style={styles.instructionIcon} resizeMode="contain" />
          <Text style={styles.instructionText}>
            Tap a photo to make it your cover. Add a short video so guests can see the ride in motion.
          </Text>
        </View>

        {canAddMore && (
          <TouchableOpacity style={styles.addMoreRow} onPress={showAddMediaOptions} activeOpacity={0.7}>
            <Image source={require('../assets/photoCamera.png')} style={styles.cameraIcon} resizeMode="contain" />
            <Text style={styles.addMoreText}>Add photos or video</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.continueButton, saving && { opacity: 0.7 }]}
          onPress={handleContinue}
          activeOpacity={0.8}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueButtonText}>{editingListingId ? 'SAVE' : 'CONTINUE'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
    width: 32,
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: '#4A4A4A',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  coverWrapper: {
    width: '100%',
    aspectRatio: 16 / 10,
    position: 'relative',
    backgroundColor: '#f5f5f5',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  mediaPreviewWrap: {
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  playBadgeCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#fff',
  },
  coverBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: COVER_BADGE_COLOR,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderTopLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  coverBadgeText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#fff',
  },
  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  gridDelete: {
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  coverPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontFamily: FONTS.NUNITO,
    fontSize: 14,
    color: '#9B9B9B',
  },
  gridRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
  },
  gridCol: {
    flex: 1,
    gap: 8,
  },
  gridItem: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridItemTextCell: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  maxPhotosTextInGrid: {
    padding: 8,
  },
  maxPhotosText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#9B9B9B',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 10,
  },
  instructionIcon: {
    width: 18,
    height: 18,
    marginTop: 2,
  },
  instructionText: {
    flex: 1,
    fontFamily: FONTS.NUNITO,
    fontSize: 13,
    color: '#9B9B9B',
    lineHeight: 18,
  },
  addMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  cameraIcon: {
    width: 22,
    height: 22,
  },
  addMoreText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: COLORS.GREENY_BLUE_TWO,
  },
  continueButton: {
    marginHorizontal: 20,
    height: 50 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  continueButtonText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16 * scale,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

export default PhotoManagementScreen;
