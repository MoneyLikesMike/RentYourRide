import type { Article } from './articles';
import { ApiError, apiUrl } from './http';
import type { TeamMember } from './team';
import type { AuthUser, LoginPayload, RefreshPayload } from './types';

function studioApiUrl(path: string): string {
  const raw = import.meta.env.VITE_STUDIO_API_ORIGIN?.trim();
  if (!raw) return apiUrl(path);

  const origin = raw.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${origin}/${normalizedPath}`;
}

export function studioManagesProduction(): boolean {
  return studioApiUrl('v1').startsWith('https://backend.rentyourride.ca/');
}

/**
 * The studio keeps its own admin session so it never collides with a customer
 * session signed in on the same browser.
 */
const ACCESS = 'ryr_studio_access_token';
const REFRESH = 'ryr_studio_refresh_token';
const USER = 'ryr_studio_user';

export function getStudioUser(): AuthUser | null {
  const raw = localStorage.getItem(USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearStudioSession(): void {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  localStorage.removeItem(USER);
}

async function refreshStudioToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH);
  if (!refreshToken) return null;

  const res = await fetch(studioApiUrl('v1/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearStudioSession();
    return null;
  }

  const body = (await res.json()) as RefreshPayload;
  localStorage.setItem(ACCESS, body.accessToken);
  localStorage.setItem(REFRESH, body.refreshToken);
  return body.accessToken;
}

type StudioRequest = Omit<RequestInit, 'body'> & {
  json?: unknown;
  body?: BodyInit | null;
};

async function studioFetch<T>(path: string, opts: StudioRequest = {}): Promise<T> {
  const { json, headers: hdrs, body: bodyInit, ...rest } = opts;

  const send = async (token: string | null) => {
    const headers = new Headers(hdrs);
    headers.set('Accept', 'application/json');
    if (json !== undefined) headers.set('Content-Type', 'application/json; charset=utf-8');
    if (token) headers.set('Authorization', `Bearer ${token}`);

    return fetch(studioApiUrl(path), {
      ...rest,
      headers,
      body: json !== undefined ? JSON.stringify(json) : (bodyInit ?? undefined),
    });
  };

  let res = await send(localStorage.getItem(ACCESS));

  if (res.status === 401) {
    const refreshed = await refreshStudioToken();
    if (refreshed) res = await send(refreshed);
  }

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    const message =
      typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message: unknown }).message)
        : res.statusText || 'Request failed';
    throw new ApiError(message, res.status, parsed);
  }

  return parsed as T;
}

export async function studioLogin(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(studioApiUrl('v1/auth/admin/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    const message =
      typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message: unknown }).message)
        : 'Sign in failed';
    throw new ApiError(message, res.status, parsed);
  }

  const payload = parsed as LoginPayload;
  localStorage.setItem(ACCESS, payload.token.accessToken);
  localStorage.setItem(REFRESH, payload.token.refreshToken);
  localStorage.setItem(USER, JSON.stringify(payload.user));
  return payload.user;
}

export type ArticleDraft = {
  title: string;
  slug?: string;
  category?: string;
  summary?: string;
  body?: string;
  coverImageUrl?: string | null;
  author?: string;
  published?: boolean;
};

export async function listStudioArticles(): Promise<Article[]> {
  return studioFetch<Article[]>('v1/admin/articles', { method: 'GET' });
}

export async function createStudioArticle(draft: ArticleDraft): Promise<Article> {
  return studioFetch<Article>('v1/admin/articles', { method: 'POST', json: draft });
}

export async function updateStudioArticle(
  id: string,
  draft: Partial<ArticleDraft>,
): Promise<Article> {
  return studioFetch<Article>(`v1/admin/articles/${id}`, {
    method: 'PATCH',
    json: draft,
  });
}

export async function deleteStudioArticle(id: string): Promise<void> {
  await studioFetch<null>(`v1/admin/articles/${id}`, { method: 'DELETE' });
}

export async function uploadArticleCover(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await studioFetch<{ url: string }>('v1/admin/articles/cover', {
    method: 'POST',
    body: form,
  });
  return res.url;
}

export type TeamMemberDraft = {
  name: string;
  role?: string;
  bio?: string;
  photoUrl?: string | null;
  sortOrder?: number;
  published?: boolean;
};

export async function listStudioTeam(): Promise<TeamMember[]> {
  return studioFetch<TeamMember[]>('v1/admin/team', { method: 'GET' });
}

export async function createStudioTeamMember(
  draft: TeamMemberDraft,
): Promise<TeamMember> {
  return studioFetch<TeamMember>('v1/admin/team', { method: 'POST', json: draft });
}

export async function updateStudioTeamMember(
  id: string,
  draft: Partial<TeamMemberDraft>,
): Promise<TeamMember> {
  return studioFetch<TeamMember>(`v1/admin/team/${id}`, {
    method: 'PATCH',
    json: draft,
  });
}

export async function deleteStudioTeamMember(id: string): Promise<void> {
  await studioFetch<null>(`v1/admin/team/${id}`, { method: 'DELETE' });
}

export async function uploadTeamPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await studioFetch<{ url: string }>('v1/admin/team/photo', {
    method: 'POST',
    body: form,
  });
  return res.url;
}
