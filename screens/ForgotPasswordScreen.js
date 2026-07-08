import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { forgotPassword } from '../services/referralsApi';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSendLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Email required', 'Enter the email for your account.');
      return;
    }
    setBusy(true);
    try {
      await forgotPassword(trimmed);
      Alert.alert(
        'Check your email',
        'If an account exists for that address, password reset instructions were sent. In development, the API may log a reset token to the server console.',
      );
    } catch (e) {
      Alert.alert('Request failed', e?.message || 'Could not start password recovery.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Logo */}
      <View style={styles.logoStack}>
        <Image source={require('../assets/logo/ryrLogoNew.png')} style={styles.logo} resizeMode="contain" />
      </View>
      {/* Title */}
      <Text style={styles.title}>FORGOT PASSWORD</Text>
      <View style={[styles.titleUnderlineContainer, { marginTop: 7 * scale, marginLeft: 51 * scale, alignSelf: 'flex-start' }]}> 
        <View style={styles.titleUnderline} />
      </View>
      {/* Paragraph */}
      <Text style={styles.paragraph}>
        Please provide your email address and {'\n'}we’ll send you a recovery link
      </Text>
      {/* Recovery Email Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Recovery Email"
          placeholderTextColor="rgba(142,142,142,0.4)"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>
      {/* Send Link Button */}
      <TouchableOpacity style={styles.sendLinkButton} onPress={handleSendLink} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.sendLinkButtonText}>SEND LINK</Text>
        )}
      </TouchableOpacity>
      {/* Remember your password? Sign In */}
      <View style={styles.bottomRow}>
        <Text style={styles.rememberText}>Remembered your password? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('AuthScreen', { tab: 'login' })}>
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    width: 209 * scale,
    height: 27 * scale,
    textAlign: 'center',
    opacity: 0.7350492931547619,
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
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15 * scale,
    color: 'rgb(142,142,142)',
    textAlign: 'center',
    width: 257 * scale,
    height: 48 * scale,
    marginTop: 71 * scale,
    marginBottom: 0,
    letterSpacing: -0.2,
    opacity: 1,
  },
  inputContainer: {
    width: 273 * scale,
    height: 49 * scale,
    backgroundColor: 'rgba(249,249,249,0.3441917782738095)',
    borderRadius: 5 * scale,
    borderWidth: 1,
    borderColor: 'rgb(163,163,163)',
    marginTop: 32 * scale,
    marginBottom: 0,
    justifyContent: 'center',
  },
  input: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: COLORS.BLACK,
    letterSpacing: 0.2,
    flex: 1,
    width: '100%',
    paddingHorizontal: 16 * scale,
  },
  sendLinkButton: {
    width: 273 * scale,
    height: 50 * scale,
    backgroundColor: 'rgba(255,178,20,0.1)',
    borderRadius: 25 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.YELLOWISH_ORANGE,
    marginTop: 32 * scale,
    marginBottom: 0,
  },
  sendLinkButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: COLORS.YELLOWISH_ORANGE,
    letterSpacing: 0.2,
    width: 85 * scale,
    height: 22 * scale,
    textAlign: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 40 * scale,
    left: 0,
    right: 0,
  },
  rememberText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: 'rgb(142,142,142)',
    letterSpacing: 0.2,
  },
  signInText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
  },
}); 