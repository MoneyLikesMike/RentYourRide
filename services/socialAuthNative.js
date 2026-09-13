import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { getGoogleIosClientId, getGoogleWebClientId } from '../constants/socialAuth';

let googleConfigured = false;

export function configureGoogleSignIn() {
  if (googleConfigured) return;
  try {
    GoogleSignin.configure({
      webClientId: getGoogleWebClientId(),
      iosClientId: Platform.OS === 'ios' ? getGoogleIosClientId() : undefined,
      offlineAccess: false,
    });
    googleConfigured = true;
  } catch (e) {
    console.warn('[GoogleSignIn] configure failed', e?.message || e);
  }
}

export async function signInWithGoogleNative() {
  configureGoogleSignIn();
  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
  const result = await GoogleSignin.signIn();
  if (result.type === 'cancelled' || !result.data) {
    const err = new Error('Google sign-in was cancelled');
    err.code = 'CANCELLED';
    throw err;
  }
  const { data } = result;
  let idToken = data.idToken;
  if (!idToken) {
    const tokens = await GoogleSignin.getTokens();
    idToken = tokens.idToken;
  }
  if (!idToken) {
    throw new Error('Google did not return an ID token');
  }
  return {
    idToken,
    email: data.user.email?.trim().toLowerCase() || '',
    firstName: data.user.givenName?.trim() || '',
    lastName: data.user.familyName?.trim() || '',
  };
}

export async function signInWithAppleNative() {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign-In is only available on iOS');
  }
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error('Apple Sign-In is not available on this device');
  }
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) {
    throw new Error('Apple Sign-In did not return an identity token');
  }
  return {
    identityToken: credential.identityToken,
    email: credential.email?.trim().toLowerCase() || '',
    firstName: credential.fullName?.givenName?.trim() || '',
    lastName: credential.fullName?.familyName?.trim() || '',
  };
}

export function isSocialAuthCancellation(err) {
  if (!err) return false;
  if (err.code === 'CANCELLED') return true;
  if (err.code === statusCodes?.SIGN_IN_CANCELLED) return true;
  if (err.code === 'ERR_REQUEST_CANCELED') return true;
  return false;
}

export function isAppleSignInAvailable() {
  return Platform.OS === 'ios';
}
