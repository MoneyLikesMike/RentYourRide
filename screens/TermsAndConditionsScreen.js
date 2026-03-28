import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Linking } from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

const HOST_GUIDELINES_URL = 'https://rentyourride.com/host-guidelines';
const GUEST_GUIDELINES_URL = 'https://rentyourride.com/guest-guidelines';
const TERMS_URL = 'https://rentyourride.com/terms';
const PRIVACY_URL = 'https://rentyourride.com/privacy';

export default function TermsAndConditionsScreen({ navigation }) {
  return (
    <View style={styles.container}>
      {/* Car Icon */}
      <Image
        source={require('../assets/icons/everydayRidesIcon.png')}
        style={styles.icon}
        resizeMode="contain"
      />
      {/* Title */}
      <View style={styles.titleContainer}>
        <View style={{ width: '100%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.titleHighlight} />
            <Text style={[styles.titleBefore, { flexShrink: 0 }]}>Before</Text>
            <Text style={[styles.titleRest, { flexShrink: 0 }]}> you join our</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 53 * scale, position: 'relative' }}>
            <View style={styles.comHighlight} />
            <Text style={styles.titleRest}>com</Text>
            <Text style={styles.titleRest}>munity</Text>
          </View>
        </View>
      </View>
      {/* First Paragraph */}
      <Text style={[styles.paragraph, styles.firstParagraph]}>
        Whether you're planning to be a host or traveller please commit to respecting and including everyone in the Rent Your Ride community. Please follow our{' '}
        <Text style={styles.link} onPress={() => Linking.openURL(HOST_GUIDELINES_URL)}>Host Guidelines</Text>
        <Text style={styles.paragraph}>, and </Text>
        <Text style={styles.link} onPress={() => Linking.openURL(GUEST_GUIDELINES_URL)}>Guest Guidelines</Text>
        .
      </Text>
      {/* Second Paragraph */}
      <Text style={[styles.paragraph, { marginBottom: 90 * scale }] }>
        By tapping I accept, I also accept Rent Your Ride's{' '}
        <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>Terms of Service</Text>
        <Text style={styles.paragraph}>, </Text>
        <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>
        .
      </Text>
      {/* Bottom Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel sign up</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={() => navigation.navigate('NotificationOnboardingScreen')}>
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 134 * scale,
    paddingHorizontal: 16 * scale,
  },
  icon: {
    width: 156 * scale,
    height: 156 * scale,
    marginBottom: 30 * scale,
  },
  titleContainer: {
    position: 'relative',
    width: 206 * scale,
    height: 60 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 38 * scale,
  },
  titleHighlight: {
    position: 'absolute',
    left: -15 * scale,
    top: 17 * scale,
    width: 53 * scale,
    height: 13 * scale,
    backgroundColor: 'rgba(255,177,49,0.3)',
    borderRadius: 5 * scale,
    zIndex: 0,
  },
  titleBefore: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 22 * scale,
    color: 'rgb(14,38,43)',
    zIndex: 1,
  },
  titleRest: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 22 * scale,
    color: 'rgb(14,38,43)',
    zIndex: 1,
  },
  title: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 22 * scale,
    color: 'rgb(14,38,43)',
    textAlign: 'center',
    width: 206 * scale,
    height: 60 * scale,
    marginBottom: 38 * scale,
  },
  paragraph: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15 * scale,
    color: 'rgb(171,171,171)',
    letterSpacing: -0.2,
    textAlign: 'left',
    width: 278 * scale,
    marginBottom: 12 * scale,
  },
  firstParagraph: {
    marginBottom: 32 * scale, // 12 + 20 = 32pt between first and second paragraph
  },
  link: {
    color: COLORS.GREENY_BLUE_TWO,
    textDecorationLine: 'none',
  },
  buttonRow: {
    position: 'relative',
    width: '100%',
    height: 90 * scale, // enough height for both buttons
  },
  cancelBtn: {
    width: 110 * scale,
    height: 50 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    position: 'absolute',
    left: 37 * scale,
    bottom: 44 * scale,
  },
  cancelText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16 * scale,
    color: COLORS.YELLOWISH_ORANGE,
    letterSpacing: 0.2,
    textAlign: 'center',
    height: 50 * scale,
    lineHeight: 50 * scale,
    textAlignVertical: 'center',
  },
  acceptBtn: {
    width: 139 * scale,
    height: 50 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 37 * scale + 110 * scale + 54 * scale - 5 * scale, // move 5pt to the left
    bottom: 40 * scale,
  },
  acceptText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16 * scale,
    color: 'rgb(247,247,247)',
    letterSpacing: 0.2,
    textAlign: 'center',
    height: 50 * scale,
    lineHeight: 50 * scale,
    textAlignVertical: 'center',
  },
  comHighlight: {
    position: 'absolute',
    left: -22 * scale,
    top: 12 * scale, // keep highlight visually aligned, but let container height be dynamic
    width: 56 * scale,
    height: 14 * scale,
    backgroundColor: 'rgba(255,177,49,0.3)',
    borderRadius: 5 * scale,
    zIndex: 0,
  },
}); 