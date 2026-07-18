import React from 'react';
import { uiScale } from '../utils/uiScale';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { registerForPushNotificationsAsync } from '../services/pushNotifications';
import { patchNotificationSettings } from '../services/usersApi';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;

export default function NotificationOnboardingScreen() {
  const navigation = useNavigation();

  const handleNotifyMe = async () => {
    try {
      await registerForPushNotificationsAsync();
      await patchNotificationSettings({ pushNotif: true, emailNotif: true, textNotif: true });
    } catch (e) {}
    navigation.navigate('MainTabs', { screen: 'HomeScreen' });
  };

  const handleSkip = () => {
    navigation.navigate('MainTabs', { screen: 'HomeScreen' });
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoStack}>
        <Image source={require('../assets/logo/ryrLogoNew.png')} style={styles.logo} resizeMode="contain" />
      </View>
      {/* Notification Title */}
      <Text style={styles.title}>NOTIFICATION</Text>
      <View style={[styles.titleUnderlineContainer, { marginTop: 7 * scale, marginLeft: 51 * scale, alignSelf: 'flex-start' }]}>
        <View style={styles.titleUnderline} />
      </View>
      {/* Paragraph */}
      <Text style={[styles.paragraph, { marginTop: 71 * scale }]}>
        We will notify you when someone messages you, or about any important account activity.
      </Text>
      {/* Yes, notify me button */}
      <TouchableOpacity style={[styles.notifyButton, { marginTop: 60 * scale }]} onPress={handleNotifyMe}>
        <Text style={styles.notifyButtonText}>Yes, notify me</Text>
      </TouchableOpacity>
      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipButtonText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#fff', paddingTop: 0 },
  logoStack: {
    width: 219 * scale,
    height: 77 * scale,
    marginTop: 90 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40 * scale,
  },
  logo: {
    width: 219 * scale,
    height: 77 * scale,
  },
  title: {
    fontFamily: FONTS.NUNITO_LIGHT,
    fontSize: 20 * scale,
    color: 'rgb(122,121,121)',
    letterSpacing: 0.6,
    width: 142 * scale,
    height: 27 * scale,
    textAlign: 'center',
    opacity: 0.735,
    marginBottom: 8 * scale,
    marginTop: 70 * scale,
    marginLeft: 51 * scale,
    alignSelf: 'flex-start',
  },
  titleUnderlineContainer: {
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  titleUnderline: {
    width: 37 * scale,
    height: 1 * scale,
    opacity: 0.7350492931547619,
    borderRadius: 1 * scale,
    borderWidth: 1,
    borderColor: COLORS.YELLOWISH_ORANGE,
    backgroundColor: 'transparent',
  },
  paragraph: {
    fontFamily: FONTS.NUNITO_LIGHT,
    fontSize: 15 * scale,
    color: 'rgb(122,121,121)',
    textAlign: 'center',
    width: 273 * scale,
    marginBottom: 0,
    opacity: 0.9,
  },
  notifyButton: {
    width: 273 * scale,
    height: 50 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16 * scale,
  },
  notifyButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: 'rgb(247,247,247)',
    letterSpacing: 0.2,
    width: 105 * scale,
    height: 22 * scale,
    textAlign: 'center',
  },
  skipButton: {
    width: 273 * scale,
    height: 50 * scale,
    backgroundColor: 'rgba(255,178,20,0.1)',
    borderRadius: 25 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.YELLOWISH_ORANGE,
    marginBottom: 0,
  },
  skipButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: COLORS.YELLOWISH_ORANGE,
    letterSpacing: 0.2,
    width: 33 * scale,
    height: 22 * scale,
    textAlign: 'center',
  },
}); 