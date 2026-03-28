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
const scale = screenWidth / 375; // Base width for scaling

const CARD_LABELS = [
  'ADVANCE NOTICE',
  'DAILY KILOMETRE ALLOWANCE',
  'SHORTEST POSSIBLE TRIP',
  'LONGEST POSSIBLE TRIP',
];

const CARD_DESCRIPTIONS = [
  "Set how far in advance you would like guests to book your vehicle. We will block trips that don't give you enough notice.",
  "Set the maximum distance guests can drive per day. This helps protect your vehicle and manage wear over each booking.",
  "Set the minimum number of days a guest can book your vehicle for. Trips shorter than this won't be available.",
  "Set the maximum number of days a guest can book your vehicle for. Trips longer than this won't be available.",
];

const AvailabilityLandingScreen = ({ navigation }) => {
  const [selectedCard, setSelectedCard] = useState(null);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleCardPress = (index) => {
    setSelectedCard((prev) => (prev === index ? null : index));
  };

  const handleLetsSetItUp = () => {
    navigation.navigate('AvailabilitySetupScreen');
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Back Button */}
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
              <Path d="M31 8L17 24L31 40" stroke="#FFB131" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>
            Lets set the availability and restrictions for your ride
          </Text>
          
          <Text style={styles.headerDescription}>
            Set your availability and restrictions to suit your schedule
          </Text>
        </View>

        {/* Button Grid */}
        <View style={styles.buttonGrid}>
          {/* First Row */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.featureButton}
              onPress={() => handleCardPress(0)}
            >
              <View style={styles.featureButtonInner}>
                <Image
                  source={require('../assets/icons/hourglass.png')}
                  style={styles.featureIcon}
                  resizeMode="contain"
                />
                <Text style={styles.featureButtonText}>{CARD_LABELS[0]}</Text>
                {selectedCard === 0 && <View style={styles.cardBorderOverlay} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.featureButton}
              onPress={() => handleCardPress(1)}
            >
              <View style={styles.featureButtonInner}>
                <Image
                  source={require('../assets/icons/gauges.png')}
                  style={styles.featureIcon}
                  resizeMode="contain"
                />
                <Text style={styles.featureButtonText}>{CARD_LABELS[1]}</Text>
                {selectedCard === 1 && <View style={styles.cardBorderOverlay} />}
              </View>
            </TouchableOpacity>
          </View>

          {/* Second Row */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.featureButton}
              onPress={() => handleCardPress(2)}
            >
              <View style={styles.featureButtonInner}>
                <Image
                  source={require('../assets/icons/shorttrip.png')}
                  style={styles.featureIcon}
                  resizeMode="contain"
                />
                <Text style={styles.featureButtonText}>{CARD_LABELS[2]}</Text>
                {selectedCard === 2 && <View style={styles.cardBorderOverlay} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.featureButton}
              onPress={() => handleCardPress(3)}
            >
              <View style={styles.featureButtonInner}>
                <Image
                  source={require('../assets/icons/longtrip.png')}
                  style={styles.featureIcon}
                  resizeMode="contain"
                />
                <Text style={styles.featureButtonText}>{CARD_LABELS[3]}</Text>
                {selectedCard === 3 && <View style={styles.cardBorderOverlay} />}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Card description (shown when a card is selected) */}
        {selectedCard !== null && (
          <View style={styles.cardDescriptionFrame}>
            <Text style={styles.cardDescriptionText}>{CARD_DESCRIPTIONS[selectedCard]}</Text>
          </View>
        )}

        {/* Bottom Button */}
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
    height: 48 * scale,
    lineHeight: 24 * scale,
  },
  headerDescription: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: 'rgb(171, 171, 171)',
    textAlign: 'center',
    letterSpacing: -0.2,
    width: 302 * scale,
    height: 138 * scale,
    lineHeight: 23 * scale,
    marginTop: 20 * scale,
  },
  buttonGrid: {
    paddingHorizontal: 20 * scale,
    marginTop: -110,
    marginBottom: 40 * scale,
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    width: 320 * scale,
    minHeight: 101 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: -45,
    marginBottom: 24 * scale,
  },
  cardDescriptionText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(171, 171, 171)',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  bottomButtonContainer: {
    alignItems: 'center',
    paddingHorizontal: 20 * scale,
    marginTop: 20 * scale,
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

export default AvailabilityLandingScreen;
