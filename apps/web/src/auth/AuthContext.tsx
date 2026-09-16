import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as authApi from '../api/auth';
import { getAccessToken, getRefreshToken, getUserJson, setUserJson } from '../api/storage';
import type { AuthUser } from '../api/types';
import { getMe, type MeUser } from '../api/users';
import {
  isAppleSignInCancellation,
  signInWithAppleWeb,
} from './appleSignIn';
import {
  isGoogleSignInCancellation,
  signInWithGoogleWeb,
} from './googleSignIn';

export interface AuthContextValue {
  isAuthenticated: boolean;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => void;
  /** Refresh full profile from GET /v1/users/me and update local session. */
  refreshProfile: () => Promise<MeUser | null>;
  /** Persist a MeUser into the auth session (after patch/avatar). */
  applyMeUser: (me: MeUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function hasSession(): boolean {
  return !!(getAccessToken() || getRefreshToken());
}

function meToAuthUser(me: MeUser): AuthUser {
  return {
    id: me.id,
    email: me.email,
    firstName: me.firstName,
    lastName: me.lastName,
    fullName: me.fullName,
    role: me.role,
    emailVerified: !!me.emailVerified,
    phone: me.phone,
    phoneVerified: me.phoneVerified,
    addressLine: me.addressLine,
    addressCity: me.addressCity,
    addressCountry: me.addressCountry,
    licenseNumber: me.licenseNumber,
    licenseVerified: me.licenseVerified,
    aboutBio: me.aboutBio,
    avatarUrl: me.avatarUrl,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionVersion, setSessionVersion] = useState(0);
  const bump = useCallback(() => setSessionVersion((v) => v + 1), []);

  const user = useMemo(() => getUserJson(), [sessionVersion]);
  const isAuthenticated = useMemo(() => hasSession(), [sessionVersion]);

  const applyMeUser = useCallback(
    (me: MeUser) => {
      setUserJson(meToAuthUser(me));
      bump();
    },
    [bump],
  );

  const refreshProfile = useCallback(async () => {
    if (!hasSession()) return null;
    try {
      const me = await getMe();
      applyMeUser(me);
      return me;
    } catch {
      return null;
    }
  }, [applyMeUser]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await authApi.login(email, password);
      bump();
      await refreshProfile();
    },
    [bump, refreshProfile],
  );

  const signUp = useCallback(
    async (input: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    }) => {
      await authApi.register(input);
      bump();
      await refreshProfile();
    },
    [bump, refreshProfile],
  );

  const signInWithApple = useCallback(async () => {
    try {
      const apple = await signInWithAppleWeb();
      await authApi.loginWithApple(apple);
      bump();
      await refreshProfile();
    } catch (err) {
      if (isAppleSignInCancellation(err)) return;
      throw err;
    }
  }, [bump, refreshProfile]);

  const signInWithGoogle = useCallback(async () => {
    try {
      const google = await signInWithGoogleWeb();
      await authApi.loginWithGoogle({
        idToken: google.idToken,
        firstName: google.firstName,
        lastName: google.lastName,
      });
      bump();
      await refreshProfile();
    } catch (err) {
      if (isGoogleSignInCancellation(err)) return;
      throw err;
    }
  }, [bump, refreshProfile]);

  const signOut = useCallback(() => {
    authApi.logout();
    bump();
  }, [bump]);

  const value = useMemo(
    () => ({
      isAuthenticated,
      user,
      signIn,
      signUp,
      signInWithApple,
      signInWithGoogle,
      signOut,
      refreshProfile,
      applyMeUser,
    }),
    [
      isAuthenticated,
      user,
      signIn,
      signUp,
      signInWithApple,
      signInWithGoogle,
      signOut,
      refreshProfile,
      applyMeUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
