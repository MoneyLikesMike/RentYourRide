import React from 'react';
import { uiScale } from '../utils/uiScale';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Platform } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;

export default function EmptyMessagesScreen({ navigation }) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.heading}>MESSAGES</Text>
      </View>
      <View style={{ height: 111 * scale }} />
      {/* Icon */}
      <View style={styles.iconWrapper}>
        <Image source={require('../assets/icons/EmptyRoad.png')} style={styles.icon} />
      </View>
      {/* Empty State Header */}
      <Text style={styles.emptyHeader}>You don't have any messages</Text>
      {/* Paragraph */}
      <Text style={styles.emptyParagraph}>
        Take a look at available rides or learn how you can earn money from listing your ride
      </Text>
      {/* Button */}
      <TouchableOpacity style={styles.rentButton} onPress={() => navigation.navigate('HomeScreen')}>
        <Text style={styles.rentButtonText}>Rent a ride</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    // Remove Platform-specific paddingTop and match RentalManagerScreen
    // paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 73 * scale,
    paddingBottom: 12 * scale,
    backgroundColor: '#fff',
    zIndex: 2,
  },
  heading: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15 * scale,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
    width: 142 * scale,
    height: 20 * scale,
    textAlign: 'center',
    alignSelf: 'center',
    fontWeight: 'bold',
    textTransform: 'none',
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
    width: 193 * scale,
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
    width: 82 * scale,
    height: 22 * scale,
  },
}); 