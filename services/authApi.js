import { getApiBaseUrl } from '../constants/api';

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export function parseErrorMessage(body) {
  if (!body || typeof body !== 'object') return 'Something went wrong';
  const m = body.message;
  if (typeof m === 'string') return m;
  if (Array.isArray(m)) return m.filter(Boolean).join('\n');
  return 'Something went wrong';
}

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
