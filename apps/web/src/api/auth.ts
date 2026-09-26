import { apiFetch } from './http';
import { clearSession, setTokenPair, setUserJson } from './storage';
import type { LoginPayload, RefreshPayload } from './types';

export async function login(
  email: string,
  password: string,
): Promise<LoginPayload> {
  const data = await apiFetch<LoginPayload>('v1/auth/login', {
    method: 'POST',
    json: { email, password },
    auth: false,
  });
  setTokenPair(data.token.accessToken, data.token.refreshToken);
  setUserJson(data.user);
  return data;
}

export async function register(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<LoginPayload> {
  const data = await apiFetch<LoginPayload>('v1/auth/register', {
    method: 'POST',
    json: input,
    auth: false,
  });
  setTokenPair(data.token.accessToken, data.token.refreshToken);
  setUserJson(data.user);
  return data;
}

export async function loginWithGoogle(input: {
  idToken: string;
  firstName?: string;
  lastName?: string;
}): Promise<LoginPayload> {
  const data = await apiFetch<LoginPayload>('v1/auth/google', {
    method: 'POST',
    json: input,
    auth: false,
  });
  setTokenPair(data.token.accessToken, data.token.refreshToken);
  setUserJson(data.user);
  return data;
}

export async function loginWithApple(input: {
  identityToken: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}): Promise<LoginPayload> {
  const data = await apiFetch<LoginPayload>('v1/auth/apple', {
    method: 'POST',
    json: input,
    auth: false,
  });
  setTokenPair(data.token.accessToken, data.token.refreshToken);
  setUserJson(data.user);
  return data;
}

export async function forgotPassword(email: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('v1/auth/password/forgot', {
    method: 'POST',
    json: { email },
    auth: false,
  });
}

/** Complete password recovery from the email link (`/reset-password?token=…`). */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('v1/auth/password/reset', {
    method: 'POST',
    json: { token: token.trim(), newPassword },
    auth: false,
  });
}

/** One-click link from the verification email (no session required). */
export async function verifyEmailWithToken(
  token: string,
): Promise<{ ok?: boolean; user?: unknown }> {
  return apiFetch('v1/auth/verify-email', {
    method: 'POST',
    json: { token: token.trim() },
    auth: false,
  });
}

/** Confirm pending email change from inbox link (no session required). */
export async function confirmEmailChange(
  token: string,
): Promise<{ ok?: boolean; user?: { email?: string; emailVerified?: boolean } }> {
  return apiFetch('v1/auth/confirm-email-change', {
    method: 'POST',
    json: { token: token.trim() },
    auth: false,
  });
}

export async function refreshSession(
  refreshToken: string,
): Promise<RefreshPayload> {
  return apiFetch<RefreshPayload>('v1/auth/refresh', {
    method: 'POST',
    json: { refreshToken },
    auth: false,
  });
}

export function logout(): void {
  clearSession();
}
