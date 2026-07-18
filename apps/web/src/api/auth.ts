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
