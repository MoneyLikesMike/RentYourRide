import React, { useState, useCallback, useRef } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useListings } from '../context/ListingsContext';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375;
const MAX_PHOTOS = 10;

const COVER_BADGE_COLOR = '#3AAFA9';
const ORANGE = '#FFB131';

const PhotoManagementScreen = ({ navigation, route }) => {
  const { setDraftListing, editingListingId, draft } = useListings();
  const insets = useSafeAreaInsets();
  const mapPhoto = (p) =>
    typeof p === 'string' ? { uri: p } : { uri: p.uri, step: p.step, label: p.label };
  const initialPhotos = (route.params?.photos ?? []).map(mapPhoto);
  const [photos, setPhotos] = useState(initialPhotos);

  const draftRef = useRef(draft);
  draftRef.current = draft;

  useFocusEffect(
    useCallback(() => {
      if (!editingListingId) return;
      const list = draftRef.current?.photos;
      if (!Array.isArray(list) || list.length === 0) return;
      setPhotos(list.map(mapPhoto));
    }, [editingListingId])
  );

  const handleBack = () => {
    navigation.goBack();
  };

  const setAsCover = useCallback((index) => {
    if (index <= 0) return;
    setPhotos((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    });
  }, []);

  const deletePhoto = useCallback((index) => {
    Alert.alert('Remove photo', 'Remove this photo from your listing?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setPhotos((prev) => prev.filter((_, i) => i !== index)) },
    ]);
  }, []);

  const showAddPhotoOptions = useCallback(() => {
    if (photos.length >= MAX_PHOTOS) return;
    const options = ['Take Photo', 'Choose from Library', 'Cancel'];
    const cancelIndex = 2;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex },
        async (buttonIndex) => {
          if (buttonIndex === 0) await openCamera();
          if (buttonIndex === 1) await openLibrary();
        }
      );
    } else {
      Alert.alert('Add photo', undefined, [
        { text: 'Take Photo', onPress: openCamera },
        { text: 'Choose from Library', onPress: openLibrary },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [photos.length]);

  const openCamera = async () => {
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
      const remaining = MAX_PHOTOS - photos.length;
      const toAdd = result.assets.slice(0, remaining).map((a) => ({ uri: a.uri }));
      setPhotos((prev) => [...prev, ...toAdd]);
    }
  };

  const openLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required to choose photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (!result.canceled && result.assets?.length) {
      const remaining = MAX_PHOTOS - photos.length;
      const toAdd = result.assets.slice(0, remaining).map((a) => ({ uri: a.uri }));
      setPhotos((prev) => [...prev, ...toAdd]);
    }
  };

  const handleContinue = () => {
    setDraftListing({ photos });
    if (editingListingId) {
      navigation.navigate('EditYourRideScreen');
    } else {
      navigation.navigate('HostStandardsScreen');
    }
  };

  const coverPhoto = photos[0];
  const gridPhotos = photos.slice(1);
  const canAddMore = photos.length < MAX_PHOTOS;
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
          <Image source={{ uri: photo.uri }} style={styles.gridImage} resizeMode="cover" />
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
            <Text style={styles.maxPhotosText}>YOU CAN ADD A MAXIMUM OF 10 PHOTOS</Text>
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
            <Image source={{ uri: coverPhoto.uri }} style={styles.coverImage} resizeMode="cover" />
            <View style={styles.coverBadge}>
              <Text style={styles.coverBadgeText}>THIS IS YOUR COVER PHOTO</Text>
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
            Drag and drop to change the order your photos appear in your listing
          </Text>
        </View>

        {canAddMore && (
          <TouchableOpacity style={styles.addMoreRow} onPress={showAddPhotoOptions} activeOpacity={0.7}>
            <Image source={require('../assets/photoCamera.png')} style={styles.cameraIcon} resizeMode="contain" />
            <Text style={styles.addMoreText}>Add more photos</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.8}>
          <Text style={styles.continueButtonText}>{editingListingId ? 'SAVE' : 'CONTINUE'}</Text>
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
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: '#9B9B9B',
  },
  gridRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginTop: 12,
    gap: 12,
  },
  gridCol: {
    flex: 1,
    gap: 12,
  },
  gridItem: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f5f5f5',
  },
  gridItemTextCell: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridDelete: {
    position: 'absolute',
  },
  maxPhotosTextInGrid: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  maxPhotosText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: '#4A4A4A',
    textAlign: 'center',
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    marginHorizontal: 16,
  },
  instructionIcon: {
    width: 22,
    height: 22,
    marginRight: 10,
  },
  instructionText: {
    flex: 1,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: '#9B9B9B',
  },
  addMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    alignSelf: 'center',
  },
  cameraIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  addMoreText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: COLORS.YELLOWISH_ORANGE,
    letterSpacing: 0.2,
    width: 135,
    height: 22,
    lineHeight: 22,
    textAlign: 'center',
  },
  continueButton: {
    marginTop: 40,
    marginHorizontal: 20 * scale,
    height: 50 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16 * scale,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

export default PhotoManagementScreen;
