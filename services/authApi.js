import { getApiBaseUrl } from '../constants/api';
export { ApiError, parseErrorMessage } from './apiError';
import { ApiError, parseErrorMessage } from './apiError';

/**
 * POST JSON, no auth headers.
 */
export async function postJson(path, jsonBody) {
  const base = getApiBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(jsonBody),
    });
  } catch (e) {
    const reason = e && typeof e.message === 'string' ? e.message : 'Network error';
    throw new Error(
      `${reason}. Is the API running? Expected base URL: ${base} (set expo.extra.apiUrl in app.json or EXPO_PUBLIC_API_URL).`,
    );
  }
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }
  if (!res.ok) {
    throw new ApiError(parseErrorMessage(parsed), res.status, parsed);
  }
  return parsed;
}

export async function forgotPassword(email) {
  return postJson('/v1/auth/password/forgot', { email: email.trim() });
}

export async function resetPassword(token, newPassword) {
  return postJson('/v1/auth/password/reset', { token, newPassword });
}

export async function verifyEmail(token) {
  return postJson('/v1/auth/verify-email', { token: token.trim() });
}

export async function confirmEmailChange(token) {
  return postJson('/v1/auth/confirm-email-change', { token: token.trim() });
}

export async function startEmailVerification(accessToken) {
  const base = getApiBaseUrl();
  const url = `${base}/v1/auth/start-email-verification`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }
  if (!res.ok) {
    throw new ApiError(parseErrorMessage(parsed), res.status, parsed);
  }
  return parsed;
}
