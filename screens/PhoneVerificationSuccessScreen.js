import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

export default function PhoneVerificationSuccessScreen({ onOk }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../assets/icons/PhoneVerifiedIconw:car.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <View style={styles.successTextContainer}>
          <View style={styles.yourHighlight} />
          <Text style={styles.successText}>Your phone number has been verified</Text>
        </View>
      </View>
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.okButton} onPress={onOk}>
          <Text style={styles.okButtonText}>Ok</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  icon: {
    width: 180,
    height: 180,
    marginBottom: 24,
  },
  successTextContainer: {
    position: 'relative',
    width: 253,
    height: 73,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 22,
    color: 'rgb(14,38,43)',
    textAlign: 'center',
    width: 243,
    height: 68,
    alignSelf: 'center',
    zIndex: 1,
  },
  yourHighlight: {
    position: 'absolute',
    left: -10,
    top: 19,
    width: 52,
    height: 13,
    backgroundColor: 'rgba(255, 177, 49, 0.3)',
    borderRadius: 5,
    zIndex: 0,
  },
  bottomContainer: {
    width: '100%',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 56,
  },
  okButton: {
    width: 250,
    height: 50,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okButtonText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: 'rgb(247,247,247)',
    letterSpacing: 0.2,
    textAlign: 'center',
    width: 170,
    height: 22,
  },
}); 