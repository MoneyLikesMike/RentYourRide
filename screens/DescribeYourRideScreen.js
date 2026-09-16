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
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { useListings } from '../context/ListingsContext';
import { useSaveListingStep } from '../hooks/useSaveListingStep';

const { width: screenWidth } = Dimensions.get('window');
const scale = uiScale;

export const DESCRIPTION_MAX_LENGTH = 500;
export const INSTRUCTIONS_MAX_LENGTH = 500;

export const CAR_FEATURES = [
  { key: 'navigation', label: 'NAVIGATION', icon: require('../assets/icons/gps.png') },
  { key: 'remoteStart', label: 'REMOTE START', icon: require('../assets/icons/controller.png') },
  { key: 'backUpCamera', label: 'BACK UP CAMERA', icon: require('../assets/icons/record.png') },
  { key: 'audioInput', label: 'AUDIO INPUT', icon: require('../assets/icons/audioJack.png') },
  { key: 'usb', label: 'USB', icon: require('../assets/icons/usb.png') },
  { key: 'bluetooth', label: 'BLUETOOTH', icon: require('../assets/icons/bluetooth.png') },
  { key: 'petFriendly', label: 'PET FRIENDLY', icon: require('../assets/icons/medal1.png') },
  { key: 'convertible', label: 'CONVERTIBLE', icon: require('../assets/icons/cabriolet.png') },
  { key: 'sunroof', label: 'SUNROOF', icon: require('../assets/icons/sunroof.png') },
  { key: 'heatedSeats', label: 'HEATED SEATS', icon: require('../assets/icons/heat.png') },
  { key: 'snowTires', label: 'SNOW TIRES', icon: require('../assets/icons/tire.png') },
  { key: 'allWheelDrive', label: 'ALL-WHEEL DRIVE', icon: require('../assets/icons/chassis.png') },
];

const DescribeYourRideScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { editingListingId, draft } = useListings();
  const { saveStep, saving } = useSaveListingStep();
  const [description, setDescription] = useState('');
  const [checkInInstructions, setCheckInInstructions] = useState('');
  const [checkOutInstructions, setCheckOutInstructions] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState(new Set());

  const draftRef = useRef(draft);
  draftRef.current = draft;

  useFocusEffect(
    useCallback(() => {
      if (!editingListingId) return;
      const d = draftRef.current;
      if (typeof d.description === 'string') setDescription(d.description);
      if (typeof d.checkInInstructions === 'string') setCheckInInstructions(d.checkInInstructions);
      if (typeof d.checkOutInstructions === 'string') setCheckOutInstructions(d.checkOutInstructions);
      if (Array.isArray(d.carFeatures)) {
        setSelectedFeatures(new Set(d.carFeatures));
      }
    }, [editingListingId])
  );

  const toggleFeature = (key) => {
    setSelectedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDescriptionChange = (text) => {
    if (text.length <= DESCRIPTION_MAX_LENGTH) setDescription(text);
  };

  const handleCheckInChange = (text) => {
    if (text.length <= INSTRUCTIONS_MAX_LENGTH) setCheckInInstructions(text);
  };

  const handleCheckOutChange = (text) => {
    if (text.length <= INSTRUCTIONS_MAX_LENGTH) setCheckOutInstructions(text);
  };

  const handleContinue = async () => {
    const ok = await saveStep({
      description: description.trim(),
      checkInInstructions: checkInInstructions.trim(),
      checkOutInstructions: checkOutInstructions.trim(),
      carFeatures: Array.from(selectedFeatures),
    });
    if (!ok) return;
    if (editingListingId) {
      navigation.navigate('EditYourRideScreen');
    } else {
      navigation.navigate('ShowOffYourRideScreen');
    }
  };

  const renderFeatureCard = (feature) => {
    const selected = selectedFeatures.has(feature.key);
    return (
      <TouchableOpacity
        key={feature.key}
        style={[styles.featureCard, selected && styles.featureCardSelected]}
        onPress={() => toggleFeature(feature.key)}
        activeOpacity={0.7}
      >
        <Image
          source={feature.icon}
          style={[styles.featureIcon, selected && styles.featureIconSelected]}
          resizeMode="contain"
        />
        <Text style={[styles.featureLabel, selected && styles.featureLabelSelected]} numberOfLines={2}>
          {feature.label}
        </Text>
        {selected && <View style={styles.cardBorderOverlay} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
            <Path d="M31 8L17 24L31 40" stroke="#FFB131" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <View style={styles.headerTitleWrapper}>
          <Text style={styles.headerTitle}>DESCRIBE YOUR RIDE</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>VEHICLE DESCRIPTION</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Describe to guests why your ride is so special. Tell them why they should rent your ride."
          placeholderTextColor="#A9A9A9"
          value={description}
          onChangeText={handleDescriptionChange}
          maxLength={DESCRIPTION_MAX_LENGTH}
          multiline
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>
          {description.length}/{DESCRIPTION_MAX_LENGTH}
        </Text>

        <Text style={[styles.sectionLabel, styles.carFeaturesLabel]}>CAR FEATURES</Text>
        <View style={styles.featureGrid}>
          {CAR_FEATURES.map(renderFeatureCard)}
        </View>

        <Text style={[styles.sectionLabel, styles.instructionsSectionLabel]}>CHECK-IN INSTRUCTIONS</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Add instructions for guests when they pick up the vehicle (e.g. where to find the keys, parking spot, contact info)"
          placeholderTextColor="#A9A9A9"
          value={checkInInstructions}
          onChangeText={handleCheckInChange}
          maxLength={INSTRUCTIONS_MAX_LENGTH}
          multiline
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>
          {checkInInstructions.length}/{INSTRUCTIONS_MAX_LENGTH}
        </Text>

        <Text style={[styles.sectionLabel, styles.instructionsSectionLabel]}>CHECK-OUT INSTRUCTIONS</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Add instructions for guests when they drop off the vehicle (e.g. where to park, key return, fuel level)"
          placeholderTextColor="#A9A9A9"
          value={checkOutInstructions}
          onChangeText={handleCheckOutChange}
          maxLength={INSTRUCTIONS_MAX_LENGTH}
          multiline
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>
          {checkOutInstructions.length}/{INSTRUCTIONS_MAX_LENGTH}
        </Text>
      </ScrollView>

      <View style={[styles.saveButtonContainer, { paddingBottom: 24 + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.7 }]}
          onPress={handleContinue}
          activeOpacity={0.8}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{editingListingId ? 'SAVE' : 'CONTINUE'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const CARD_SIZE = (screenWidth - 40 * scale - 2 * 12 * scale) / 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20 * scale,
    marginBottom: 24 * scale,
  },
  backButton: {
    padding: 10 * scale,
  },
  headerTitleWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 43 * scale,
  },
  headerTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: '#4A4A4A',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20 * scale,
    paddingTop: 8,
  },
  sectionLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: '#4A4A4A',
    letterSpacing: 0.2,
    marginBottom: 8 * scale,
  },
  descriptionInput: {
    width: '100%',
    minHeight: 120 * scale,
    backgroundColor: 'rgba(249, 249, 249, 0.34)',
    borderRadius: 5 * scale,
    borderWidth: 1 * scale,
    borderColor: 'rgb(163, 163, 163)',
    paddingHorizontal: 12 * scale,
    paddingVertical: 12 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: '#000',
  },
  charCount: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: '#9B9B9B',
    marginTop: 6 * scale,
    alignSelf: 'flex-end',
  },
  carFeaturesLabel: {
    marginTop: 28 * scale,
  },
  instructionsSectionLabel: {
    marginTop: 28 * scale,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8 * scale,
  },
  featureCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    backgroundColor: '#FFFFFF',
    borderRadius: 8 * scale,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12 * scale,
    position: 'relative',
  },
  featureCardSelected: {
    borderColor: COLORS.GREENY_BLUE_TWO,
  },
  featureIcon: {
    width: 70,
    height: 70,
    marginBottom: 8 * scale,
  },
  featureIconSelected: {
    tintColor: COLORS.GREENY_BLUE_TWO,
  },
  featureLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 9 * scale,
    color: '#4A4A4A',
    textAlign: 'center',
    letterSpacing: 0.2,
    paddingHorizontal: 4,
  },
  featureLabelSelected: {
    color: COLORS.GREENY_BLUE_TWO,
  },
  cardBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8 * scale,
    borderWidth: 2,
    borderColor: COLORS.GREENY_BLUE_TWO,
    backgroundColor: 'transparent',
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20 * scale,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
    height: 50 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16 * scale,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

export default DescribeYourRideScreen;
