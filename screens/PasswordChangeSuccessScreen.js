import React from 'react';
import { uiScale } from '../utils/uiScale';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = uiScale;

export default function PasswordChangeSuccessScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../assets/icons/car-lock-icon.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <View style={styles.successTextContainer}>
          <View style={styles.passwordHighlight} />
          <Text style={styles.successText}><Text style={styles.passwordText}>Password</Text> change successful</Text>
        </View>
      </View>
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.okButton} onPress={() => navigation.goBack()}>
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
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 22,
    color: 'rgb(14,38,43)',
    textAlign: 'center',
    width: 253,
    height: 73,
    zIndex: 1,
  },
  passwordHighlight: {
    position: 'absolute',
    left: 20,
    top: 16,
    width: 73,
    height: 13,
    backgroundColor: 'rgba(255, 177, 49, 0.3)',
    borderRadius: 5,
    zIndex: 0,
  },
  passwordHighlightText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 22,
    color: 'rgb(14,38,43)',
    textAlign: 'center',
    width: 73,
    height: 13,
    lineHeight: 22,
  },
  passwordText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 22,
    color: 'rgb(14,38,43)',
    zIndex: 1,
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
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: 'rgb(247,247,247)',
    letterSpacing: 0.2,
    textAlign: 'center',
    width: 170,
    height: 22,
  },
}); 