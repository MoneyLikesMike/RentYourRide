import React, { useState } from 'react';
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const scale = screenWidth / 375;

const CARD_LABELS = [
  'DELIVERY',
  'DAILY PRICE',
  'WEEKLY DISCOUNT',
  'MONTHLY DISCOUNT',
];

const CARD_DESCRIPTIONS = [
  'Choose whether or not you would like to deliver your vehicle. Offering to deliver your vehicle translates to more booking requests',
  'Set your daily rental rate. This is the base price guests pay per day when booking your vehicle.',
  'Offer a discount for weekly bookings. Weekly discounts can attract guests planning longer trips.',
  'Offer a discount for monthly bookings. Monthly discounts help you secure extended rentals.',
];

const PricingLandingScreen = ({ navigation }) => {
  const [selectedCard, setSelectedCard] = useState(null);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleCardPress = (index) => {
    setSelectedCard((prev) => (prev === index ? null : index));
  };

  const handleLetsSetItUp = () => {
    navigation.navigate('PricingSetupScreen');
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
            Let's set the pricing for your ride
          </Text>
          <Text style={styles.headerDescription}>
            Choose how much you make. Check out what similar vehicles are listed for and price yours aggressively. We find that aggressively priced vehicles translate to more bookings for hosts
          </Text>
        </View>

        <View style={styles.buttonGrid}>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.featureButton} onPress={() => handleCardPress(0)}>
              <View style={styles.featureButtonInner}>
                <Image source={require('../assets/icons/van.png')} style={styles.featureIcon} resizeMode="contain" />
                <Text style={styles.featureButtonText}>{CARD_LABELS[0]}</Text>
                {selectedCard === 0 && <View style={styles.cardBorderOverlay} />}
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.featureButton} onPress={() => handleCardPress(1)}>
              <View style={styles.featureButtonInner}>
                <Image source={require('../assets/icons/money.png')} style={styles.featureIcon} resizeMode="contain" />
                <Text style={styles.featureButtonText}>{CARD_LABELS[1]}</Text>
                {selectedCard === 1 && <View style={styles.cardBorderOverlay} />}
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.featureButton} onPress={() => handleCardPress(2)}>
              <View style={styles.featureButtonInner}>
                <Image source={require('../assets/icons/priceTag.png')} style={styles.featureIcon} resizeMode="contain" />
                <Text style={styles.featureButtonText}>{CARD_LABELS[2]}</Text>
                {selectedCard === 2 && <View style={styles.cardBorderOverlay} />}
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.featureButton} onPress={() => handleCardPress(3)}>
              <View style={styles.featureButtonInner}>
                <Image source={require('../assets/icons/planning.png')} style={styles.featureIcon} resizeMode="contain" />
                <Text style={styles.featureButtonText}>{CARD_LABELS[3]}</Text>
                {selectedCard === 3 && <View style={styles.cardBorderOverlay} />}
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
          <TouchableOpacity style={styles.bottomButton} onPress={handleLetsSetItUp}>
            <Text style={styles.bottomButtonText}>Let's set it up</Text>
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
    alignItems: 'flex-start',
    paddingHorizontal: 20 * scale,
    marginBottom: 40 * scale,
  },
  headerTitle: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 18 * scale,
    color: 'rgb(14, 38, 43)',
    textAlign: 'center',
    alignSelf: 'center',
    width: 286 * scale,
    height: 48 * scale,
    lineHeight: 24 * scale,
  },
  headerDescription: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: 'rgb(171, 171, 171)',
    textAlign: 'center',
    alignSelf: 'center',
    letterSpacing: -0.2,
    width: 302 * scale,
    height: 138 * scale,
    lineHeight: 23 * scale,
    marginTop: 0,
  },
  buttonGrid: {
    paddingHorizontal: 20 * scale,
    marginTop: -30,
    marginBottom: 16 * scale,
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
    opacity: 0.6942429315476191,
    width: 123 * scale,
    height: 39 * scale,
    lineHeight: 13 * scale,
  },
  cardDescriptionFrame: {
    width: '100%',
    minHeight: 101 * scale,
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
    width: 170 * scale,
    height: 22 * scale,
    lineHeight: 22 * scale,
  },
});

export default PricingLandingScreen;
