/**
 * Canonical customer website origin for user-facing links (emails, admin,
 * referrals). Bare apex domains (rentyourride.ca / .com) only forward "/" via
 * GoDaddy — any path 404s — so generated links must always use www.
 *
 * Override with PUBLIC_WEB_ORIGIN or WEB_PUBLIC_ORIGIN (no trailing slash).
 */
export const DEFAULT_PUBLIC_WEB_ORIGIN = 'https://www.rentyourride.ca';

type EnvReader =
  | { get: (key: string) => string | undefined }
  | Record<string, string | undefined>
  | undefined;

function readEnv(env: EnvReader, key: string): string | undefined {
  if (!env) return process.env[key];
  if (typeof (env as { get?: unknown }).get === 'function') {
    return (env as { get: (k: string) => string | undefined }).get(key);
  }
  const value = (env as Record<string, string | undefined>)[key];
  return typeof value === 'string' ? value : undefined;
}

/** Public marketing / customer website origin (no trailing slash). */
export function publicWebOrigin(env?: EnvReader): string {
  const raw =
    readEnv(env, 'PUBLIC_WEB_ORIGIN')?.trim() ||
    readEnv(env, 'WEB_PUBLIC_ORIGIN')?.trim() ||
    '';
  return (raw || DEFAULT_PUBLIC_WEB_ORIGIN).replace(/\/$/, '');
}

/** Absolute URL on the public website (`path` may or may not start with `/`). */
export function publicWebUrl(path: string, env?: EnvReader): string {
  const origin = publicWebOrigin(env);
  if (!path) return origin;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${normalized}`;
}

/** CTA URLs for the post-verify Welcome email (Pinpoint `Url.*` variables). */
export function welcomeEmailCtaUrls(env?: EnvReader): {
  searchYourCity: string;
  listYourRide: string;
} {
  return {
    searchYourCity: publicWebUrl('/find-your-car', env),
    listYourRide: publicWebUrl('/profile/list-your-ride', env),
  };
}
