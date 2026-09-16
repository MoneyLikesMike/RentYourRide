import React, { useCallback, useState } from 'react';
import { uiScale } from '../utils/uiScale';
import { View, TouchableOpacity, Image, ActivityIndicator, Alert, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/authApi';
import { isAppleSignInAvailable, isSocialAuthCancellation } from '../services/socialAuthNative';
import { resetToMainTabs } from '../navigation/navigationRef';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = uiScale;

/**
 * Apple + Google sign-in buttons shared by Welcome, Login, and Sign Up.
 * @param {{ isSignUp?: boolean, style?: object }} props
 */
export default function SocialAuthButtons({ isSignUp = false, style }) {
  const navigation = useNavigation();
  const { signInWithApple, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(null);

  const afterSocialAuth = useCallback(
    (isNewUser) => {
      if (isNewUser) {
        navigation.navigate('TermsAndConditionsScreen');
        return;
      }
      resetToMainTabs();
    },
    [navigation],
  );

  const handleError = useCallback((err) => {
    if (isSocialAuthCancellation(err)) return;
    const msg =
      err instanceof ApiError
        ? err.message
        : err && typeof err.message === 'string'
          ? err.message
          : 'Could not sign in. Try again.';
    Alert.alert('Sign in failed', msg);
  }, []);

  const onApple = useCallback(async () => {
    setBusy('apple');
    try {
      const { isNewUser } = await signInWithApple();
      afterSocialAuth(isNewUser);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(null);
    }
  }, [signInWithApple, afterSocialAuth, handleError]);

  const onGoogle = useCallback(async () => {
    setBusy('google');
    try {
      const { isNewUser } = await signInWithGoogle();
      afterSocialAuth(isNewUser);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(null);
    }
  }, [signInWithGoogle, afterSocialAuth, handleError]);

  const showApple = isAppleSignInAvailable();

  return (
    <View style={[styles.socialRow, style]}>
      {showApple ? (
        <TouchableOpacity
          style={styles.socialBtn}
          onPress={onApple}
          disabled={!!busy}
          activeOpacity={0.85}
        >
          {busy === 'apple' ? (
            <ActivityIndicator color={COLORS.GREENY_BLUE_TWO} />
          ) : (
            <Image
              source={require('../assets/icons/signInWithAppleLogoOnly2.png')}
              style={styles.socialIcon}
            />
          )}
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        style={styles.socialBtn}
        onPress={onGoogle}
        disabled={!!busy}
        activeOpacity={0.85}
      >
        {busy === 'google' ? (
          <ActivityIndicator color={COLORS.GREENY_BLUE_TWO} />
        ) : (
          <Image source={require('../assets/icons/group2Copy.png')} style={styles.socialIcon} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginHorizontal: 11.5 * scale,
  },
  socialIcon: {
    width: 50 * scale,
    height: 50 * scale,
    resizeMode: 'contain',
  },
});
