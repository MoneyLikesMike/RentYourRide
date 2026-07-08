import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { resetPassword } from '../services/referralsApi';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [resetToken, setResetToken] = useState(route.params?.token || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleResetPassword = async () => {
    const token = resetToken.trim();
    if (!token) {
      Alert.alert('Token required', 'Paste the reset token from your email (or server logs in development).');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await resetPassword(token, newPassword);
      Alert.alert('Success', 'Your password was updated. You can sign in.', [
        { text: 'OK', onPress: () => navigation.navigate('AuthScreen', { tab: 'login' }) },
      ]);
    } catch (e) {
      Alert.alert('Reset failed', e?.message || 'Invalid or expired token.');
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
      <Text style={styles.title}>RESET PASSWORD</Text>
      <View style={[styles.titleUnderlineContainer, { marginTop: 7 * scale, marginLeft: 51 * scale, alignSelf: 'flex-start' }]}> 
        <View style={styles.titleUnderline} />
      </View>
      {/* Paragraph */}
      <Text style={styles.paragraph}>
        Please create a new password
      </Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Reset token (from email)"
          placeholderTextColor="rgba(142,142,142,0.4)"
          value={resetToken}
          onChangeText={setResetToken}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      {/* New Password Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="New Password"
          placeholderTextColor="rgba(142,142,142,0.4)"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
      </View>
      {/* Confirm Password Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="rgba(142,142,142,0.4)"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
      </View>
      {/* Reset Password Button */}
      <TouchableOpacity style={styles.resetButton} onPress={handleResetPassword} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.resetButtonText}>RESET PASSWORD</Text>}
      </TouchableOpacity>
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
    color: 'rgb(142,142,142)',
    letterSpacing: 0.2,
    flex: 1,
    width: '100%',
    opacity: 0.3987397693452381,
    paddingHorizontal: 16 * scale,
  },
  resetButton: {
    width: 273 * scale,
    height: 50 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32 * scale,
    marginBottom: 0,
  },
  resetButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: '#fff',
    letterSpacing: 0.2,
    width: 120 * scale,
    height: 22 * scale,
    textAlign: 'center',
  },
}); 