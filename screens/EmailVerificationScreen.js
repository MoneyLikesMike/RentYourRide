import React, { useEffect, useRef, useState } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { startEmailVerification } from '../services/authApi';
import * as tokens from '../services/authTokens';

const scale = uiScale;

/**
 * Profile / setup email verification: send the same signup link email,
 * then tell the user to open it. No paste-token / OTP entry.
 */
export default function EmailVerificationScreen({ navigation, route }) {
  const email = route.params?.email ?? '';
  const [busy, setBusy] = useState(false);
  const sentOnce = useRef(false);

  const sendLink = async ({ announce } = { announce: true }) => {
    setBusy(true);
    try {
      const access = await tokens.getAccessToken();
      if (!access) throw new Error('Sign in again to verify your email.');
      const result = await startEmailVerification(access);
      if (result?.alreadyVerified) {
        Alert.alert('Already verified', 'Your email address is already verified.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      if (announce) {
        Alert.alert(
          'Check your email',
          `Verification email sent to ${email || 'the email on file'}. Open the link in that email to verify.`,
        );
      }
    } catch (e) {
      Alert.alert('Could not send email', e?.message || 'Try again later.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (sentOnce.current) return;
    sentOnce.current = true;
    void sendLink({ announce: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>VERIFY EMAIL</Text>
      <Text style={styles.body}>
        We sent a verification link to {email || 'your email'}. Open that email and
        tap the link to verify — same as when you signed up.
      </Text>
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => void sendLink({ announce: true })}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>Resend verification email</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()} disabled={busy}>
        <Text style={styles.skip}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24 * scale,
    paddingTop: 48 * scale,
  },
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
  primaryBtn: {
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25 * scale,
    height: 50 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12 * scale,
  },
  primaryText: {
    color: '#fff',
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
  },
  skip: {
    textAlign: 'center',
    marginTop: 8,
    color: '#888',
    fontFamily: FONTS.NUNITO_REGULAR,
  },
});
