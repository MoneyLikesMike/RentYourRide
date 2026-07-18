import React, { useState } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const { width: screenWidth } = Dimensions.get('window');
const scale = uiScale;

const CARD_LABELS = [
  'UNLIMITED KILOMETRE ALLOWANCE',
  'PRE PAID FUEL',
  'PRE PAID CLEANING',
];

const CARD_DESCRIPTIONS = [
  'Allow guests to drive without a daily kilometre limit. This can attract renters planning longer trips.',
  'Offer a pre-paid fuel option so guests can return the vehicle with a full tank without a separate refuel stop.',
  'Offer a pre-paid cleaning option so the vehicle is returned detailed. Many guests prefer this convenience.',
];

const ExtrasLandingScreen = ({ navigation }) => {
  const [selectedCard, setSelectedCard] = useState(null);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleCardPress = (index) => {
    setSelectedCard((prev) => (prev === index ? null : index));
  };

  const handleOfferExtras = () => {
    navigation.navigate('ExtrasSetupScreen');
  };

  const handleSkip = () => {
    navigation.navigate('DescribeYourRideScreen');
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
            What extras do you want to offer?
          </Text>
          <Text style={styles.headerDescription}>
            Add extras if you want. This may help you get more booking requests
          </Text>
        </View>

        <View style={styles.buttonGrid}>
          <View style={styles.buttonRowCentered}>
            <TouchableOpacity style={styles.featureButton} onPress={() => handleCardPress(0)}>
              <View style={styles.featureButtonInner}>
                <Image source={require('../assets/icons/road.png')} style={styles.featureIcon} resizeMode="contain" />
                <Text style={styles.featureButtonText}>{CARD_LABELS[0]}</Text>
                {selectedCard === 0 && <View style={styles.cardBorderOverlay} />}
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.featureButton} onPress={() => handleCardPress(1)}>
              <View style={styles.featureButtonInner}>
                <Image source={require('../assets/icons/fuel.png')} style={styles.featureIcon} resizeMode="contain" />
                <Text style={styles.featureButtonText}>{CARD_LABELS[1]}</Text>
                {selectedCard === 1 && <View style={styles.cardBorderOverlay} />}
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.featureButton} onPress={() => handleCardPress(2)}>
              <View style={styles.featureButtonInner}>
                <Image source={require('../assets/icons/glassCleaning.png')} style={styles.featureIcon} resizeMode="contain" />
                <Text style={styles.featureButtonText}>{CARD_LABELS[2]}</Text>
                {selectedCard === 2 && <View style={styles.cardBorderOverlay} />}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {selectedCard !== null && (
          <View style={styles.cardDescriptionFrame}>
            <Text style={styles.cardDescriptionText}>{CARD_DESCRIPTIONS[selectedCard]}</Text>
          </View>
        )}

        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity style={styles.bottomButton} onPress={handleOfferExtras}>
            <Text style={styles.bottomButtonText}>Offer extras</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
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
    marginBottom: 40 * scale,
  },
  headerTitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 18 * scale,
    color: 'rgb(14, 38, 43)',
    textAlign: 'center',
    width: 286 * scale,
    lineHeight: 24 * scale,
  },
  headerDescription: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: 'rgb(171, 171, 171)',
    textAlign: 'center',
    letterSpacing: -0.2,
    width: 302 * scale,
    lineHeight: 23 * scale,
    marginTop: 15 * scale,
  },
  buttonGrid: {
    paddingHorizontal: 20 * scale,
    marginTop: -30,
    marginBottom: 16 * scale,
  },
  buttonRowCentered: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20 * scale,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20 * scale,
  },
  featureButton: {
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
  featureButtonInner: {
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
  featureIcon: {
    width: 48 * scale,
    height: 48 * scale,
    marginBottom: 15 * scale,
  },
  featureButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 10 * scale,
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 0.2,
    opacity: 0.69,
    width: 123 * scale,
    lineHeight: 13 * scale,
  },
  cardDescriptionFrame: {
    width: '100%',
    minHeight: 80 * scale,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 20 * scale,
    marginTop: -45,
    marginBottom: 4 * scale,
  },
  cardDescriptionText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(171, 171, 171)',
    letterSpacing: -0.2,
    textAlign: 'left',
  },
  bottomButtonContainer: {
    alignItems: 'center',
    paddingHorizontal: 20 * scale,
    marginTop: 0,
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
  skipButton: {
    marginTop: 16 * scale,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: COLORS.MANGO_TWO,
    letterSpacing: 0.2,
  },
});

export default ExtrasLandingScreen;
