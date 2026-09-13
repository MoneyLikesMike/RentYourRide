import React, { useState } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { verifyEmail, startEmailVerification } from '../services/authApi';
import * as tokens from '../services/authTokens';

const { width: screenWidth } = Dimensions.get('window');
const scale = uiScale;

export default function EmailVerificationScreen({ navigation, route }) {
  const email = route.params?.email ?? '';
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  const onVerify = async () => {
    const token = code.trim();
    if (token.length < 16) {
      Alert.alert('Invalid link', 'Paste the verification token from your email.');
      return;
    }
    setBusy(true);
    try {
      await verifyEmail(token);
      Alert.alert('Email verified', 'Your email address is now verified.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Verification failed', e?.message || 'Try again or request a new link.');
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    setResending(true);
    try {
      const access = await tokens.getAccessToken();
      if (!access) throw new Error('Sign in again to resend verification email.');
      await startEmailVerification(access);
      Alert.alert('Email sent', 'Check your inbox for a new verification link.');
    } catch (e) {
      Alert.alert('Could not resend', e?.message || 'Try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>VERIFY EMAIL</Text>
      <Text style={styles.body}>
        We sent a verification link to {email || 'your email'}. Open the link in your email app, or paste
        the verification token below.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Paste verification token"
        placeholderTextColor="#999"
        autoCapitalize="none"
        autoCorrect={false}
        value={code}
        onChangeText={setCode}
      />
      <TouchableOpacity style={styles.primaryBtn} onPress={onVerify} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Verify email</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={onResend} disabled={resending}>
        <Text style={styles.secondaryText}>{resending ? 'Sending…' : 'Resend verification email'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.skip}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 24 * scale, paddingTop: 48 * scale },
  title: {
    fontFamily: FONTS.NUNITO_LIGHT,
    fontSize: 20 * scale,
    color: 'rgb(122,121,121)',
    marginBottom: 16 * scale,
  },
  body: {
    fontFamily: FONTS.NUNITO_REGULAR,
    fontSize: 15 * scale,
    color: 'rgb(122,121,121)',
    lineHeight: 22 * scale,
    marginBottom: 24 * scale,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONTS.NUNITO_REGULAR,
    fontSize: 14,
    marginBottom: 16 * scale,
  },
  primaryBtn: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25 * scale,
    height: 50 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12 * scale,
  },
  primaryText: { color: '#fff', fontFamily: FONTS.NUNITO_SEMIBOLD, fontSize: 16 * scale },
  secondaryBtn: { alignItems: 'center', paddingVertical: 12 },
  secondaryText: { color: COLORS.YELLOWISH_ORANGE, fontFamily: FONTS.NUNITO_SEMIBOLD },
  skip: { textAlign: 'center', marginTop: 8, color: '#888', fontFamily: FONTS.NUNITO_REGULAR },
});
