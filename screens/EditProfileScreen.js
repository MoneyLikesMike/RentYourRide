import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActionSheetIOS,
  Keyboard,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useUserProfile } from '../context/UserProfileContext';
import { patchMe, uploadAvatar } from '../services/usersApi';
import { resolveMediaUrl } from '../utils/mediaUrl';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;
const TAB_BAR_HEIGHT = 78 * scale;
const AVATAR_SIZE = 168 * scale;
const CAMERA_BADGE = 40 * scale;

function CloseIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6L18 18M18 6L6 18"
        stroke={COLORS.YELLOWISH_ORANGE}
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const aboutSectionY = useRef(0);
  const { photoUri, aboutBio, saveProfileDetails, refreshProfileFromApi } = useUserProfile();
  const [localBio, setLocalBio] = useState(aboutBio || '');
  const [localPhoto, setLocalPhoto] = useState(photoUri);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const keyboardVisible = keyboardHeight > 0;

  const scrollAboutIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, aboutSectionY.current - 8 * scale),
        animated: true,
      });
    });
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
      setTimeout(scrollAboutIntoView, Platform.OS === 'ios' ? 50 : 100);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollAboutIntoView]);

  useFocusEffect(
    useCallback(() => {
      setLocalBio(aboutBio || '');
      setLocalPhoto(photoUri);
    }, [aboutBio, photoUri])
  );

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setLocalPhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take a profile photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setLocalPhoto(result.assets[0].uri);
    }
  };

  const showPhotoOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Take Photo', 'Choose from Library', 'Cancel'], cancelButtonIndex: 2 },
        (buttonIndex) => {
          if (buttonIndex === 0) takePhoto();
          if (buttonIndex === 1) pickFromLibrary();
        },
      );
      return;
    }
    Alert.alert('Profile photo', undefined, [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    try {
      await patchMe({ aboutBio: localBio });
      let savedPhotoUri = localPhoto ?? null;
      const isLocalAsset =
        localPhoto &&
        (localPhoto.startsWith('file') ||
          localPhoto.startsWith('content') ||
          localPhoto.startsWith('ph'));
      if (isLocalAsset) {
        const uploaded = await uploadAvatar({
          uri: localPhoto,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        });
        savedPhotoUri = uploaded?.avatarUrl
          ? resolveMediaUrl(uploaded.avatarUrl) || localPhoto
          : localPhoto;
      } else if (localPhoto) {
        savedPhotoUri = resolveMediaUrl(localPhoto) || localPhoto;
      }
      await saveProfileDetails(savedPhotoUri, localBio);
      await refreshProfileFromApi?.();
      navigation.goBack();
    } catch (e) {
      Alert.alert('Save failed', e?.message || 'Could not update profile.');
    }
  };

  const headerHeight = insets.top + 10 + 12 * scale + 20 * scale;
  const scrollBottomPad = keyboardVisible
    ? keyboardHeight + 24
    : TAB_BAR_HEIGHT + 24 + insets.bottom;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn} hitSlop={14}>
          <CloseIcon />
        </TouchableOpacity>
        <View style={styles.headerTitleFrame}>
          <Text style={styles.headerTitle}>EDIT PROFILE</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: scrollBottomPad },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {!keyboardVisible && (
            <View style={styles.photoBlock}>
              <View style={styles.avatarOuter}>
                {localPhoto ? (
                  <Image source={{ uri: localPhoto }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarPlaceholderHint}>Add photo</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.cameraBadge}
                  onPress={showPhotoOptions}
                  activeOpacity={0.85}
                  accessibilityLabel="Change profile photo"
                >
                  <Image
                    source={require('../assets/icons/camera2.png')}
                    style={styles.cameraIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View
            style={[styles.aboutSection, keyboardVisible && styles.aboutSectionFocused]}
            onLayout={(e) => {
              aboutSectionY.current = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.aboutTitleFrame}>
              <Text style={styles.aboutLabel}>ABOUT</Text>
            </View>
            <TextInput
              style={[styles.aboutInput, keyboardVisible && styles.aboutInputFocused]}
              multiline
              placeholder="About"
              placeholderTextColor="rgb(171, 171, 171)"
              value={localBio}
              onChangeText={setLocalBio}
              onFocus={scrollAboutIntoView}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>SAVE</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 18 * scale,
    paddingBottom: 12 * scale,
  },
  closeBtn: {
    width: 44 * scale,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitleFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 20 * scale,
    minWidth: 103 * scale,
  },
  headerTitle: {
    width: 103 * scale,
    height: 20 * scale,
    textAlign: 'center',
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    letterSpacing: 0.2,
    color: 'rgb(100, 100, 100)',
    lineHeight: 20 * scale,
  },
  headerSpacer: {
    width: 44 * scale,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22 * scale,
    paddingBottom: 24 * scale,
  },
  photoBlock: {
    alignItems: 'center',
    marginTop: 12 * scale,
    marginBottom: 36 * scale,
  },
  aboutSection: {
    alignSelf: 'stretch',
  },
  aboutSectionFocused: {
    marginTop: 12 * scale,
  },
  avatarOuter: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    position: 'relative',
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderHint: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: 'rgb(171, 171, 171)',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    left: (AVATAR_SIZE - CAMERA_BADGE) / 2,
    width: CAMERA_BADGE,
    height: CAMERA_BADGE,
    borderRadius: 25.5 * scale,
    backgroundColor: COLORS.MANGO_TWO,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraIcon: {
    width: 20 * scale,
    height: 20 * scale,
    tintColor: '#fff',
  },
  aboutTitleFrame: {
    alignSelf: 'stretch',
    height: 15 * scale,
    marginBottom: 10 * scale,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  aboutLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    letterSpacing: 0.2,
    color: '#000',
    opacity: 0.6994977678571429,
    textAlign: 'left',
    lineHeight: 15 * scale,
  },
  aboutInput: {
    minHeight: 160 * scale,
    borderWidth: 1,
    borderColor: 'rgb(210, 210, 210)',
    borderRadius: 10 * scale,
    paddingHorizontal: 14 * scale,
    paddingVertical: 14 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: 'rgb(14, 38, 43)',
  },
  aboutInputFocused: {
    minHeight: 140 * scale,
  },
  saveBtn: {
    marginTop: 24 * scale,
    height: 52 * scale,
    borderRadius: 26 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16 * scale,
    letterSpacing: 1,
    color: '#fff',
  },
});
