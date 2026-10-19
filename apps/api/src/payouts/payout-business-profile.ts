import { publicWebOrigin, publicWebUrl } from '../common/public-web-origin';

export const DEFAULT_PRODUCT_DESCRIPTION =
  'Peer-to-peer rental of my personal vehicle(s) to guests through RentYourRide (rentyourride.ca). Bookings and payments are handled by RentYourRide.';

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

/** Fallback marketing URL when the host has no public listing/profile. */
export function defaultBusinessProfileUrl(env?: EnvReader): string {
  const raw =
    readEnv(env, 'PUBLIC_WEB_URL')?.trim() ||
    readEnv(env, 'PUBLIC_WEB_ORIGIN')?.trim() ||
    '';
  if (raw) return raw.replace(/\/$/, '');
  return publicWebOrigin(env);
}

/**
 * Prefer host public profile (none on web today), else first public listing
 * (`/find-your-car/:id`), else site origin.
 */
export function resolveBusinessProfileUrl(opts: {
  env?: EnvReader;
  /** Reserved for a future public host profile path. */
  publicProfilePath?: string | null;
  firstPublicListingId?: string | null;
}): string {
  if (opts.publicProfilePath) {
    return publicWebUrl(opts.publicProfilePath, opts.env);
  }
  if (opts.firstPublicListingId) {
    return publicWebUrl(`/find-your-car/${opts.firstPublicListingId}`, opts.env);
  }
  return defaultBusinessProfileUrl(opts.env);
}
