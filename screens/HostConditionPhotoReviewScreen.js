import React, { useCallback, useState } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
import { useGuestBookings } from '../context/GuestBookingsContext';
import { useBookingUpdate } from '../hooks/useBookingUpdate';

const { width: screenWidth } = Dimensions.get('window');
const scale = uiScale;

const MAX_PHOTOS = 25;
const ADDITIONAL_LABEL = 'Additional';

function normalizePhoto(p, index) {
  if (typeof p === 'string') return { uri: p, label: ADDITIONAL_LABEL, step: index };
  return {
    uri: p.uri,
    label: p.label || ADDITIONAL_LABEL,
    step: p.step ?? index,
  };
}

export default function HostConditionPhotoReviewScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { applyBookingUpdate } = useBookingUpdate();
  const { bookingId, photos: routePhotos = [], checkoutFlow: checkoutFlowParam } = route.params || {};
  const checkoutFlow = checkoutFlowParam === true;
  const [photos, setPhotos] = useState(() => routePhotos.map((p, i) => normalizePhoto(p, i)));

  const openCamera = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) return;
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
      setPhotos((prev) => {
        if (prev.length >= MAX_PHOTOS) return prev;
        return [...prev, { uri: result.assets[0].uri, label: ADDITIONAL_LABEL, step: prev.length }];
      });
    }
  }, [photos.length]);

  const openLibrary = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required to choose photos.');
      return;
    }
    const remainingSlots = Math.max(1, MAX_PHOTOS - photos.length);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
    });
    if (!result.canceled && result.assets?.length) {
      setPhotos((prev) => {
        const cap = MAX_PHOTOS - prev.length;
        if (cap <= 0) return prev;
        const toAdd = result.assets.slice(0, cap).map((a, j) => ({
          uri: a.uri,
          label: ADDITIONAL_LABEL,
          step: prev.length + j,
        }));
        return [...prev, ...toAdd];
      });
    }
  }, [photos.length]);

  const showAddPhotoOptions = useCallback(() => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Maximum photos', `You can add up to ${MAX_PHOTOS} photos for this check-in.`);
      return;
    }
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
        { text: 'Take Photo', onPress: () => openCamera() },
        { text: 'Choose from Library', onPress: () => openLibrary() },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [photos.length, openCamera, openLibrary]);

  const onComplete = useCallback(async () => {
    if (bookingId && photos.length) {
      const ok = await applyBookingUpdate(
        bookingId,
        checkoutFlow ? { hostCheckoutConditionPhotos: photos } : { hostCheckInConditionPhotos: photos },
        { errorTitle: 'Could not upload photos' },
      );
      if (!ok) return;
    }
    navigation.pop(3);
  }, [bookingId, photos, navigation, applyBookingUpdate, checkoutFlow]);

  const onBack = useCallback(() => {
    navigation.pop(2);
  }, [navigation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path
              d="M31 8L17 24L31 40"
              stroke={COLORS.MANGO_TWO}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Review photos
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollInner, { paddingBottom: insets.bottom + 24 * scale }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Check each shot before finishing. Add more photos if you need extra angles or damage documentation.
        </Text>

        <View style={styles.grid}>
          {photos.map((p, i) => (
            <View key={`${p.uri}-${i}`} style={styles.cell}>
              <Image source={{ uri: p.uri }} style={styles.thumb} resizeMode="cover" />
              <Text style={styles.label} numberOfLines={2}>
                {(p.label || `Photo ${i + 1}`).toUpperCase()}
              </Text>
            </View>
          ))}
        </View>

        {photos.length < MAX_PHOTOS ? (
          <TouchableOpacity style={styles.addMoreRow} onPress={showAddPhotoOptions} activeOpacity={0.75}>
            <Image source={require('../assets/photoCamera.png')} style={styles.cameraIcon} resizeMode="contain" />
            <Text style={styles.addMoreText}>Add more photos</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.doneBtn} activeOpacity={0.88} onPress={onComplete}>
          <Text style={styles.doneBtnText}>Complete</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const GAP = 8 * scale;
const cellW = (screenWidth - 40 * scale - GAP) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8 * scale,
    paddingVertical: 10 * scale,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  backBtn: {
    padding: 8 * scale,
    width: 44,
  },
  headerSpacer: {
    width: 44,
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: 'rgb(74, 74, 74)',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 20 * scale,
    paddingTop: 16 * scale,
  },
  subtitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    lineHeight: 19 * scale,
    color: 'rgb(140, 140, 140)',
    marginBottom: 20 * scale,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cell: {
    width: cellW,
    marginBottom: 14 * scale,
  },
  thumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8 * scale,
    backgroundColor: '#f0f0f0',
  },
  label: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 10 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    marginTop: 6 * scale,
    letterSpacing: 0.4,
  },
  addMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14 * scale,
    marginTop: 4 * scale,
    marginBottom: 8 * scale,
  },
  cameraIcon: {
    width: 28 * scale,
    height: 28 * scale,
    marginRight: 10 * scale,
  },
  addMoreText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
  },
  doneBtn: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25 * scale,
    paddingVertical: 16 * scale,
    alignItems: 'center',
    marginTop: 12 * scale,
  },
  doneBtnText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: '#fff',
  },
});
