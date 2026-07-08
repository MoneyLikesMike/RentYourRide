import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375;
const MAX_PHOTOS = 10;

const TIP_CARDS = [
  {
    label: 'TAKE PHOTOS IN A WELL LIT AREA',
    icon: require('../assets/icons/climate.png'),
  },
  {
    label: 'CHOOSE A NICE SPOT',
    icon: require('../assets/icons/cleanCar.png'),
  },
  {
    label: 'MAKE SURE THE PHOTOS ARE IN FOCUS',
    icon: require('../assets/icons/record.png'),
  },
  {
    label: 'GET THE RIGHT ANGLES',
    icon: require('../assets/icons/tripod.png'),
  },
];

const ShowOffYourRideScreen = ({ navigation }) => {
  const [selectedCard, setSelectedCard] = useState(null);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleCardPress = (index) => {
    setSelectedCard((prev) => (prev === index ? null : index));
  };

  const handleStartPhotoShoot = () => {
    navigation.navigate('PhotoShootScreen');
  };

  const handleAddFromCameraRoll = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Photo library access is required to choose photos from your camera roll.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS,
    });

    if (result.canceled || !result.assets?.length) return;

    const photos = result.assets.slice(0, MAX_PHOTOS).map((asset) => ({ uri: asset.uri }));
    navigation.navigate('PhotoManagementScreen', { photos });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
              <Path d="M31 8L17 24L31 40" stroke="#FFB131" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
        </View>

        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>
            Show off your ride
          </Text>
          <Text style={styles.headerDescription}>
            Follow our guide to take amazing photos that will make your ride stand out.
          </Text>
        </View>

        <View style={styles.tipGrid}>
          <View style={styles.tipRow}>
            <TouchableOpacity style={styles.tipCard} onPress={() => handleCardPress(0)} activeOpacity={0.7}>
              <View style={styles.tipCardInner}>
                <Image source={TIP_CARDS[0].icon} style={styles.tipIcon} resizeMode="contain" />
                <Text style={styles.tipCardText}>{TIP_CARDS[0].label}</Text>
                {selectedCard === 0 && <View style={styles.cardBorderOverlay} />}
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tipCard} onPress={() => handleCardPress(1)} activeOpacity={0.7}>
              <View style={styles.tipCardInner}>
                <Image source={TIP_CARDS[1].icon} style={styles.tipIcon} resizeMode="contain" />
                <Text style={styles.tipCardText}>{TIP_CARDS[1].label}</Text>
                {selectedCard === 1 && <View style={styles.cardBorderOverlay} />}
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.tipRow}>
            <TouchableOpacity style={styles.tipCard} onPress={() => handleCardPress(2)} activeOpacity={0.7}>
              <View style={styles.tipCardInner}>
                <Image source={TIP_CARDS[2].icon} style={styles.tipIcon} resizeMode="contain" />
                <Text style={styles.tipCardText}>{TIP_CARDS[2].label}</Text>
                {selectedCard === 2 && <View style={styles.cardBorderOverlay} />}
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tipCard} onPress={() => handleCardPress(3)} activeOpacity={0.7}>
              <View style={styles.tipCardInner}>
                <Image source={TIP_CARDS[3].icon} style={styles.tipIcon} resizeMode="contain" />
                <Text style={styles.tipCardText}>{TIP_CARDS[3].label}</Text>
                {selectedCard === 3 && <View style={styles.cardBorderOverlay} />}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity style={styles.bottomButton} onPress={handleStartPhotoShoot}>
            <Text style={styles.bottomButtonText}>Start photo shoot</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleAddFromCameraRoll}>
            <Text style={styles.secondaryButtonText}>Add from camera roll</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 30 * scale,
  },
  headerContainer: {
    paddingTop: 50 * scale,
    paddingHorizontal: 20 * scale,
    paddingBottom: 20 * scale,
  },
  backButton: {
    padding: 10 * scale,
  },
  headerSection: {
    alignItems: 'center',
    paddingHorizontal: 20 * scale,
    marginBottom: 32 * scale,
  },
  headerTitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 18 * scale,
    color: 'rgb(14, 38, 43)',
    textAlign: 'center',
    lineHeight: 24 * scale,
  },
  headerDescription: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: 'rgb(171, 171, 171)',
    textAlign: 'center',
    letterSpacing: -0.2,
    lineHeight: 23 * scale,
    marginTop: 15 * scale,
  },
  tipGrid: {
    paddingHorizontal: 20 * scale,
    marginBottom: 24 * scale,
  },
  tipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20 * scale,
  },
  tipCard: {
    width: 147 * scale,
    height: 147 * scale,
    backgroundColor: '#FFFFFF',
    borderRadius: 13 * scale,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tipCardInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 13 * scale,
    borderWidth: 3,
    borderColor: COLORS.GREENY_BLUE_TWO,
    backgroundColor: 'transparent',
  },
  tipIcon: {
    width: 48 * scale,
    height: 48 * scale,
    marginBottom: 15 * scale,
  },
  tipCardText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 10 * scale,
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 0.2,
    opacity: 0.69,
    width: 123 * scale,
    lineHeight: 13 * scale,
  },
  bottomButtonContainer: {
    alignItems: 'center',
    paddingHorizontal: 20 * scale,
  },
  bottomButton: {
    width: 250 * scale,
    height: 50 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: 'rgb(247, 247, 247)',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    marginTop: 16 * scale,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: COLORS.MANGO_TWO,
    letterSpacing: 0.2,
  },
});

export default ShowOffYourRideScreen;
