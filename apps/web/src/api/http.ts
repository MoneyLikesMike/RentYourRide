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
    return `/api/${p}`;
  }
  return `${origin}/${p}`;
}

function parseErrorMessage(parsed: unknown, fallback: string): string {
  if (typeof parsed === 'object' && parsed !== null && 'message' in parsed) {
    const msg = (parsed as { message: unknown }).message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.map(String).join('\n');
    if (
      typeof msg === 'object' &&
      msg !== null &&
      'message' in msg &&
      typeof (msg as { message: unknown }).message === 'string'
    ) {
      return (msg as { message: string }).message;
    }
  }
  return fallback;
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
  json?: unknown;
  /** Attach Bearer token and retry once after refresh on 401 (default true) */
  auth?: boolean;
  body?: BodyInit | null;
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

/**
 * Fetch JSON from Nest `/v1/*`. Attaches Bearer token; retries once after refresh on 401.
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
      json !== undefined ? JSON.stringify(json) : (bodyInit ?? undefined);

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
    throw new ApiError(
      parseErrorMessage(parsed, res.statusText || 'Request failed'),
      res.status,
      parsed,
    );
  }

  return parsed as T;
}

export function getApiOriginLabel(): string {
  return apiOrigin() || '(Vite proxy → bedev)';
}
