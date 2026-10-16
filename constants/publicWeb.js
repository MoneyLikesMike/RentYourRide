/**
 * Canonical customer website for shared / referral links.
 * Bare apex (rentyourride.ca / .com) only forwards "/" — deep paths 404.
 */
export const PUBLIC_WEB_ORIGIN = 'https://www.rentyourride.ca';

export function publicWebUrl(path = '') {
  if (!path) return PUBLIC_WEB_ORIGIN;
  const normalized = String(path).startsWith('/') ? path : `/${path}`;
  return `${PUBLIC_WEB_ORIGIN}${normalized}`;
}

/** Shared invite / referral landing (code kept as ?code=). */
export const REFERRAL_INVITE_BASE = `${PUBLIC_WEB_ORIGIN}/invite`;
