import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as authApi from '../api/auth';
import { getAccessToken, getRefreshToken, getUserJson } from '../api/storage';

export interface AuthContextValue {
  isAuthenticated: boolean;
  user: Record<string, unknown> | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function hasSession(): boolean {
  return !!(getAccessToken() || getRefreshToken());
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionVersion, setSessionVersion] = useState(0);

  const bump = useCallback(() => setSessionVersion((v) => v + 1), []);

  const user = useMemo(() => getUserJson(), [sessionVersion]);

  const isAuthenticated = useMemo(() => hasSession(), [sessionVersion]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await authApi.adminLogin(email, password);
      bump();
    },
    [bump],
  );

  const signOut = useCallback(() => {
    authApi.logout();
    bump();
  }, [bump]);

  const value = useMemo(
    () => ({
      isAuthenticated,
      user,
      signIn,
      signOut,
    }),
    [isAuthenticated, user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
