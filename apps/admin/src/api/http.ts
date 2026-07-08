import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  setTokenPair,
} from './storage';
import type { RefreshPayload } from './types';

function apiOrigin(): string {
  const raw = import.meta.env.VITE_API_ORIGIN?.trim();
  if (raw) return raw.replace(/\/$/, '');
  return '';
}

/** Full URL for an API path starting with `v1/` */
export function apiUrl(path: string): string {
  const origin = apiOrigin();
  const p = path.startsWith('/') ? path.slice(1) : path;
  if (!origin) {
    // Dev: proxy via Vite — browser calls same-origin `/api/v1/...`
    return `/api/${p}`;
  }
  return `${origin}/${p}`;
}

let refreshInFlight: Promise<string | null> | null = null;

async function postRefresh(): Promise<string | null> {
  const rt = getRefreshToken();
  if (!rt) return null;

  const res = await fetch(apiUrl('v1/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  });

  if (!res.ok) {
    clearSession();
    return null;
  }

  const body = (await res.json()) as RefreshPayload;
  setTokenPair(body.accessToken, body.refreshToken);
  return body.accessToken;
}

async function getValidAccessToken(): Promise<string | null> {
  const existing = getAccessToken();
  if (existing) return existing;
  return postRefresh();
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** JSON body (sets Content-Type and serializes); wins over `body` if both set */
  json?: unknown;
  /** If false, skip Authorization header */
  auth?: boolean;
  body?: BodyInit | null;
}

/**
 * Fetch JSON API. Attaches Bearer token, retries once after refresh on 401.
 */
export async function apiFetch<T>(
  pathWithV1: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { json, auth = true, headers: hdrs, body: bodyInit, ...rest } = opts;

  const headers = new Headers(hdrs);
  headers.set('Accept', 'application/json');
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json; charset=utf-8');
  }

  const doRequest = async (token: string | null) => {
    if (auth && token) headers.set('Authorization', `Bearer ${token}`);
    if (auth && !token) headers.delete('Authorization');

    const body =
      json !== undefined ? JSON.stringify(json) : bodyInit ?? undefined;

    return fetch(apiUrl(pathWithV1), {
      ...rest,
      headers,
      body,
    });
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
    if (newAccess) {
      res = await doRequest(newAccess);
    }
  }

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    const msg =
      typeof parsed === 'object' &&
      parsed !== null &&
      'message' in parsed &&
      typeof (parsed as { message: unknown }).message === 'string'
        ? (parsed as { message: string }).message
        : res.statusText;
    throw new ApiError(msg || 'Request failed', res.status, parsed);
  }

  return parsed as T;
}
