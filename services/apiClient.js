import { ApiError, parseErrorMessage } from './apiError';

/**
 * Overridable for unit tests. Token + base URL loaders are lazy so node:test
 * can inject stubs without importing Expo modules.
 */
export const deps = {
  fetch: (...args) => globalThis.fetch(...args),
  tokens: null,
  getApiBaseUrl: null,
};

function tokensApi() {
  if (deps.tokens) return deps.tokens;
  // eslint-disable-next-line global-require
  deps.tokens = require('./authTokens');
  return deps.tokens;
}

function apiBaseUrl() {
  if (deps.getApiBaseUrl) return deps.getApiBaseUrl();
  // eslint-disable-next-line global-require
  const { getApiBaseUrl } = require('../constants/api');
  return getApiBaseUrl();
}

/** Shared in-flight refresh so concurrent 401s / getValidAccessToken share one POST. */
let refreshInFlight = null;

/** 'network' | 'rejected' | null — last ensureRefresh failure reason. */
let lastRefreshFailure = null;

let onSessionExpired = null;
let sessionExpiredNotified = false;

/**
 * Register a handler invoked once when the server rejects the refresh token after a 401.
 * @param {null | (() => void | Promise<void>)} handler
 */
export function setOnSessionExpired(handler) {
  onSessionExpired = handler;
  sessionExpiredNotified = false;
}

/** @returns {Promise<string|null>} */
async function postRefresh() {
  const rt = await tokensApi().getRefreshToken();
  if (!rt) {
    lastRefreshFailure = 'rejected';
    return null;
  }
  const base = apiBaseUrl();
  let res;
  try {
    res = await deps.fetch(`${base}/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ refreshToken: rt }),
    });
  } catch {
    lastRefreshFailure = 'network';
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
    lastRefreshFailure = 'rejected';
    return null;
  }
  lastRefreshFailure = null;
  await tokensApi().setTokenPair(parsed.accessToken, parsed.refreshToken);
  return parsed.accessToken;
}

function ensureRefresh() {
  if (!refreshInFlight) {
    lastRefreshFailure = null;
    refreshInFlight = postRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function getValidAccessToken() {
  const existing = await tokensApi().getAccessToken();
  if (existing) return existing;
  return ensureRefresh();
}

async function notifySessionExpired() {
  if (sessionExpiredNotified) return;
  sessionExpiredNotified = true;
  try {
    await onSessionExpired?.();
  } catch {
    // Handler errors must not mask the ApiError we throw next.
  }
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

  const base = apiBaseUrl();
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
      res = await deps.fetch(url, { ...rest, method, headers: h, body });
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
    const newAccess = await ensureRefresh();
    if (newAccess) {
      res = await doRequest(newAccess);
    } else if (lastRefreshFailure === 'rejected') {
      await notifySessionExpired();
      throw new ApiError('Your session has expired. Please sign in again.', 401, {
        code: 'SESSION_EXPIRED',
      });
    }
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

/** Test-only helpers. */
export const __test = {
  ensureRefresh,
  getValidAccessToken,
  reset() {
    refreshInFlight = null;
    lastRefreshFailure = null;
    sessionExpiredNotified = false;
    onSessionExpired = null;
    deps.fetch = (...args) => globalThis.fetch(...args);
    deps.tokens = null;
    deps.getApiBaseUrl = null;
  },
  getLastRefreshFailure: () => lastRefreshFailure,
};
