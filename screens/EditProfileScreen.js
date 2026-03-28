import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useUserProfile } from '../context/UserProfileContext';

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
  const { photoUri, aboutBio, saveProfileDetails } = useUserProfile();
  const [localBio, setLocalBio] = useState(aboutBio || '');
  const [localPhoto, setLocalPhoto] = useState(photoUri);

  useFocusEffect(
    useCallback(() => {
      setLocalBio(aboutBio || '');
      setLocalPhoto(photoUri);
    }, [aboutBio, photoUri])
  );

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setLocalPhoto(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    await saveProfileDetails(localPhoto ?? null, localBio);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn} hitSlop={14}>
          <CloseIcon />
        </TouchableOpacity>
        <View style={styles.headerTitleFrame}>
          <Text style={styles.headerTitle}>EDIT PROFILE</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
              onPress={pickImage}
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

        <View style={styles.aboutTitleFrame}>
          <Text style={styles.aboutLabel}>ABOUT</Text>
        </View>
        <TextInput
          style={styles.aboutInput}
          multiline
          placeholder="About"
          placeholderTextColor="rgb(171, 171, 171)"
          value={localBio}
          onChangeText={setLocalBio}
          textAlignVertical="top"
        />
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: TAB_BAR_HEIGHT + 24 + insets.bottom },
        ]}
      >
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>SAVE</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  footer: {
    paddingHorizontal: 22 * scale,
    paddingTop: 12 * scale,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  saveBtn: {
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
