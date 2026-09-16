import { getApiBaseUrl } from '../constants/api';
import * as tokens from './authTokens';
import { ApiError, parseErrorMessage } from './authApi';

let refreshInFlight = null;

async function postRefresh() {
  const rt = await tokens.getRefreshToken();
  if (!rt) return null;
  const base = getApiBaseUrl();
  let res;
  try {
    res = await fetch(`${base}/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ refreshToken: rt }),
    });
  } catch {
    return null;
  }
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!res.ok || !parsed?.accessToken || !parsed?.refreshToken) {
    return null;
  }
  await tokens.setTokenPair(parsed.accessToken, parsed.refreshToken);
  return parsed.accessToken;
}

async function getValidAccessToken() {
  const existing = await tokens.getAccessToken();
  if (existing) return existing;
  return postRefresh();
}

/**
 * Authenticated JSON/form fetch with Bearer token and single refresh retry on 401.
 * @param {string} path absolute path e.g. `/v1/users/me`
 */
export async function apiFetch(path, opts = {}) {
  const {
    json,
    formData,
    auth = true,
    method = 'GET',
    headers: hdrs = {},
    ...rest
  } = opts;

  const base = getApiBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = { ...hdrs };
  if (json !== undefined && formData === undefined) {
    headers['Content-Type'] = 'application/json; charset=utf-8';
  }
  headers.Accept = headers.Accept ?? 'application/json';

  const doRequest = async (token) => {
    const h = { ...headers };
    if (auth && token) h.Authorization = `Bearer ${token}`;
    let body;
    if (formData !== undefined) body = formData;
    else if (json !== undefined) body = JSON.stringify(json);
    let res;
    try {
      res = await fetch(url, { ...rest, method, headers: h, body });
    } catch (e) {
      const reason = e && typeof e.message === 'string' ? e.message : 'Network error';
      throw new Error(
        `${reason}. Is the API running? Base URL: ${base} (EXPO_PUBLIC_API_URL / expo.extra.apiUrl).`,
      );
    }
    return res;
  };

  let token = auth ? await getValidAccessToken() : null;
  let res = await doRequest(token);

  if (res.status === 401 && auth) {
    if (!refreshInFlight) {
      refreshInFlight = postRefresh().finally(() => {
        refreshInFlight = null;
      });
    }
    const newAccess = await refreshInFlight;
    if (newAccess) res = await doRequest(newAccess);
  }

  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text ? { raw: text } : null;
  }

  if (!res.ok) {
    throw new ApiError(parseErrorMessage(parsed), res.status, parsed);
  }

  return parsed;
}
