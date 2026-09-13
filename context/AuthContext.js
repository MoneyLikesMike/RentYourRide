import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { postJson } from '../services/authApi';
import * as tokens from '../services/authTokens';
import {
  configureGoogleSignIn,
  signInWithAppleNative,
  signInWithGoogleNative,
} from '../services/socialAuthNative';
import { PROFILE_STORAGE_KEYS, STORAGE_AUTH_USER } from '../constants/storageKeys';
import { resetToWelcome } from '../navigation/navigationRef';

const AuthContext = createContext(null);

function compactUser(apiUser) {
  if (!apiUser || typeof apiUser !== 'object') return null;
  return {
    id: apiUser.id,
    email: apiUser.email,
    firstName: apiUser.firstName ?? '',
    lastName: apiUser.lastName ?? '',
    fullName: apiUser.fullName ?? '',
    role: apiUser.role,
  };
}

async function persistSession(loginPayload) {
  const { user: apiUser, token } = loginPayload;
  if (!token?.accessToken || !token?.refreshToken) {
    throw new Error('Sign-in response was missing tokens. Try again or contact support.');
  }
  const c = compactUser(apiUser);
  await tokens.setTokenPair(token.accessToken, token.refreshToken);
  await AsyncStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(c));
  return c;
}

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const access = await tokens.getAccessToken();
        const refresh = await tokens.getRefreshToken();
        const raw = await AsyncStorage.getItem(STORAGE_AUTH_USER);
        if (cancelled) return;
        if (access && refresh) {
          if (raw) {
            try {
              setUser(JSON.parse(raw));
            } catch {
              setUser(null);
            }
          }
        } else {
          setUser(null);
          await AsyncStorage.removeItem(STORAGE_AUTH_USER).catch(() => {});
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const data = await postJson('/v1/auth/login', { email: email.trim(), password });
    const c = await persistSession(data);
    setUser(c);
  }, []);

  const signUp = useCallback(async ({ email, password, firstName, lastName }) => {
    const data = await postJson('/v1/auth/register', {
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      password,
    });
    const c = await persistSession(data);
    setUser(c);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const native = await signInWithGoogleNative();
    const data = await postJson('/v1/auth/google', {
      idToken: native.idToken,
      firstName: native.firstName || undefined,
      lastName: native.lastName || undefined,
    });
    const c = await persistSession(data);
    setUser(c);
    return { isNewUser: !!data.isNewUser, user: c };
  }, []);

  const signInWithApple = useCallback(async () => {
    const native = await signInWithAppleNative();
    const data = await postJson('/v1/auth/apple', {
      identityToken: native.identityToken,
      firstName: native.firstName || undefined,
      lastName: native.lastName || undefined,
      email: native.email || undefined,
    });
    const c = await persistSession(data);
    setUser(c);
    return { isNewUser: !!data.isNewUser, user: c };
  }, []);

  const signOut = useCallback(async () => {
    await tokens.clearTokens();
    await AsyncStorage.removeItem(STORAGE_AUTH_USER).catch(() => {});
    await AsyncStorage.multiRemove(PROFILE_STORAGE_KEYS).catch(() => {});
    setUser(null);
    resetToWelcome();
  }, []);

  const value = useMemo(
    () => ({
      isReady: ready,
      isAuthenticated: !!user,
      user,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithApple,
      signOut,
    }),
    [ready, user, signIn, signUp, signInWithGoogle, signInWithApple, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
