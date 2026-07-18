import type { AuthUser } from './types';

const ACCESS = 'ryr_web_access_token';
const REFRESH = 'ryr_web_refresh_token';
const USER = 'ryr_web_user';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH);
}

export function setTokenPair(access: string, refresh: string): void {
  localStorage.setItem(ACCESS, access);
  localStorage.setItem(REFRESH, refresh);
}

export function setUserJson(user: AuthUser): void {
  localStorage.setItem(USER, JSON.stringify(user));
}

export function getUserJson(): AuthUser | null {
  const raw = localStorage.getItem(USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  localStorage.removeItem(USER);
}
