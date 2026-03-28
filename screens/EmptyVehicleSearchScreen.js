import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Linking } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

export default function EmptyVehicleSearchScreen({ route }) {
  const [showNeedHeader, setShowNeedHeader] = useState(false);
  const city = route?.params?.location ?? 'your area';

  const handlePress = () => {
    setShowNeedHeader(true);
    Linking.openURL(`mailto:support@rentyourride.ca?subject=We%20need%20Rent%20Your%20Ride%20in%20${encodeURIComponent(city)}`);
  };

  return (
    <View style={styles.container}>
      <View style={{ height: 111 * scale }} />
      {/* Icon */}
      <View style={styles.iconWrapper}>
        <Image source={require('../assets/icons/EmptyRoad.png')} style={styles.icon} />
      </View>
      {/* Header */}
      <Text style={styles.emptyHeader}>
        {showNeedHeader ? `We need Rent Your Ride in ${city}` : 'Not available'}
      </Text>
      {/* Paragraph */}
      <Text style={styles.emptyParagraph}>
        {`We are not available in ${city} yet. Don't worry we are working on it. Let us know if you would like us to come to your city!`}
      </Text>
      {/* Button */}
      <TouchableOpacity style={styles.rentButton} onPress={handlePress}>
        <Text style={styles.rentButtonText}>We need Rent Your Ride</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    marginBottom: 32 * scale,
  },
  icon: {
    width: 176 * scale,
    height: 174 * scale,
    resizeMode: 'contain',
  },
  emptyHeader: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 18,
    color: 'rgb(14,38,43)',
    textAlign: 'center',
    width: 272 * scale,
    height: 24 * scale,
    marginBottom: 16 * scale,
  },
  emptyParagraph: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: 'rgb(171,171,171)',
    textAlign: 'center',
    letterSpacing: -0.2,
    width: 293 * scale,
    height: 72 * scale,
    marginBottom: 32 * scale,
  },
  rentButton: {
    width: 220 * scale,
    height: 38 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rentButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: 'rgb(247,247,247)',
    textAlign: 'center',
    letterSpacing: 0.2,
    width: 180 * scale,
    height: 22 * scale,
  },
}); 