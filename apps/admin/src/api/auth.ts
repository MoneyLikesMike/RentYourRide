import { apiFetch } from './http';
import { clearSession, setTokenPair, setUserJson } from './storage';
import type { LoginPayload, RefreshPayload } from './types';

export async function adminLogin(email: string, password: string): Promise<LoginPayload> {
  const data = await apiFetch<LoginPayload>('v1/auth/admin/login', {
    method: 'POST',
    json: { email, password },
    auth: false,
  });
  setTokenPair(data.token.accessToken, data.token.refreshToken);
  setUserJson(data.user);
  return data;
}

export async function logout(): Promise<void> {
  clearSession();
}

export async function refreshSession(refreshToken: string): Promise<RefreshPayload> {
  return apiFetch<RefreshPayload>('v1/auth/refresh', {
    method: 'POST',
    json: { refreshToken },
    auth: false,
  });
}
