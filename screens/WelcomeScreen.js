import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import SocialAuthButtons from '../components/SocialAuthButtons';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top || 8 * scale, paddingBottom: insets.bottom || 0 }]}> 
      <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-start' }}>
        {/* Welcome Text */}
        <Text style={styles.welcomeText}>Welcome to Rent Your Ride</Text>

        {/* Icon ZStack with illustration */}
        <View style={styles.iconStack}>
          <Image
            source={require('../assets/icons/group5.png')}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        {/* Experience more together with highlight under 'Exp' */}
        <View style={[styles.experienceRow, { position: 'relative' }]}> 
          {/* Highlight rectangle behind 'Exp' */}
          <View style={styles.expHighlight} />
          {/* Highlight rectangle behind 'together' */}
          <View style={styles.togetherHighlight} />
          <Text style={styles.experienceText}>
            <Text style={styles.expWord}>Experience</Text>
            <Text> more </Text>
            <Text style={styles.togetherWord}>together</Text>
          </Text>
        </View>

        {/* Continue with email button */}
        <TouchableOpacity
          style={[styles.emailButton, { marginBottom: 40 * scale }]}
          onPress={() => navigation.navigate('AuthScreen', { tab: 'signup' })}
          activeOpacity={0.8}
        >
          <Image
            source={require('../assets/icons/group4.png')}
            style={styles.emailIcon}
          />
          <Text style={styles.emailButtonText}>Continue with email</Text>
        </TouchableOpacity>

        {/* Or continue with */}
        <Text style={[styles.orContinueText, { marginBottom: 25 * scale }]}>Or continue with</Text>

        {/* Social login icons */}
        <SocialAuthButtons isSignUp style={{ marginBottom: 88 * scale }} />
      </View>
      {/* Already have an account? Login */}
      <View style={styles.loginRow}>
        <Text style={styles.loginGray}>Already have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('AuthScreen', { tab: 'login' })}>
          <Text style={styles.loginGreen}>Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#fff' },
  welcomeText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 22 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    textAlign: 'center',
    width: 334 * scale,
    height: 30 * scale,
    marginTop: 16 * scale,
    marginBottom: 24 * scale,
  },
  iconStack: {
    width: 196 * scale,
    height: 196 * scale,
    marginBottom: 16 * scale,
    position: 'relative',
  },
  rect: {
    position: 'absolute',
    borderWidth: 1.6,
    borderColor: 'rgb(222,242,241)',
    backgroundColor: 'transparent',
    opacity: 0.5,
  },
  rect196: { width: 196 * scale, height: 196 * scale, left: 0, top: 0, borderRadius: 98 * scale },
  rect156: { width: 156 * scale, height: 156 * scale, borderRadius: 78 * scale },
  rect46: { width: 46 * scale, height: 46 * scale, borderRadius: 23 * scale },
  rect37: { width: 37 * scale, height: 37 * scale, borderRadius: 18.5 * scale },
  experienceRow: { marginBottom: 24 * scale, alignItems: 'center', position: 'relative' },
  highlightExp: {
    position: 'absolute',
    left: 0,
    top: 8 * scale,
    width: 53 * scale,
    height: 13 * scale,
    backgroundColor: 'rgba(255,177,49,0.3)',
    borderRadius: 5 * scale,
    zIndex: -1,
  },
  highlightTogether: {
    position: 'absolute',
    right: 0,
    top: 8 * scale,
    width: 56 * scale,
    height: 14 * scale,
    backgroundColor: 'rgba(255,177,49,0.3)',
    borderRadius: 5 * scale,
    zIndex: -1,
  },
  experienceText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 22 * scale,
    color: 'rgb(14,38,43)',
    textAlign: 'center',
    width: 240 * scale,
    height: 60 * scale,
  },
  expWord: { fontWeight: 'bold' },
  togetherWord: { fontWeight: 'bold' },
  emailButton: {
    width: 273 * scale,
    height: 50 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25 * scale,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16 * scale,
  },
  emailIcon: { width: 15 * scale, height: 12 * scale, marginRight: 12 * scale },
  emailButtonText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16 * scale,
    color: 'rgb(247,247,247)',
    letterSpacing: 0.2,
    width: 150 * scale,
    height: 22 * scale,
    textAlign: 'center',
  },
  orContinueText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16 * scale,
    color: 'rgb(142,142,142)',
    textAlign: 'center',
    width: 126 * scale,
    height: 22 * scale,
    marginBottom: 16 * scale,
    letterSpacing: 0.2,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 88 * scale,
  },
  socialBtn: {
    width: 50 * scale,
    height: 50 * scale,
    borderRadius: 25 * scale,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgb(227,227,227)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 11.5 * scale, // 23pt total between icons
  },
  socialIcon: { width: 50 * scale, height: 50 * scale, resizeMode: 'contain' },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24 * scale,
  },
  loginGray: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12 * scale,
    color: 'rgb(142,142,142)',
    letterSpacing: 0.2,
  },
  loginGreen: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12 * scale,
    color: COLORS.GREENY_BLUE,
    letterSpacing: 0.2,
  },
  illustration: {
    width: 196 * scale,
    height: 196 * scale,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignSelf: 'center',
    zIndex: 1,
  },
  highlightBarExp: {
    width: 90 * scale,
    height: 10 * scale,
    backgroundColor: 'rgba(255,177,49,0.3)',
    borderRadius: 5 * scale,
    position: 'absolute',
    left: 0,
    top: 32 * scale,
    zIndex: 0,
  },
  highlightBarTogether: {
    width: 90 * scale,
    height: 10 * scale,
    backgroundColor: 'rgba(255,177,49,0.3)',
    borderRadius: 5 * scale,
    position: 'absolute',
    right: 0,
    top: 32 * scale,
    zIndex: 0,
  },
  expHighlight: {
    position: 'absolute',
    left: 20 * scale,
    top: 15 * scale, // moved up by 5pt
    width: 53 * scale,
    height: 13 * scale,
    backgroundColor: 'rgba(255,177,49,0.3)',
    borderRadius: 5 * scale,
    zIndex: -1,
  },
  togetherHighlight: {
    position: 'absolute',
    right: 20 * scale,
    top: 15 * scale, // moved up by 5pt
    width: 56 * scale,
    height: 14 * scale,
    backgroundColor: 'rgba(255,177,49,0.3)',
    borderRadius: 5 * scale,
    zIndex: -1,
  },
});
 