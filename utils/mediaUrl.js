import { getApiBaseUrl } from '../constants/api';

/** Make avatar/listing upload URLs loadable from the mobile app (bedev routes /v1/* to Nest). */
export function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^(file|content|ph):/.test(trimmed)) return trimmed;

  const apiBase = getApiBaseUrl().replace(/\/$/, '');

  if (trimmed.startsWith('/v1/uploads/')) {
    return `${apiBase}${trimmed}`;
  }
  if (trimmed.startsWith('/uploads/')) {
    return `${apiBase}/v1${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith('/v1/uploads/')) {
      return `${apiBase}${parsed.pathname}${parsed.search}`;
    }
    if (parsed.pathname.startsWith('/uploads/')) {
      return `${apiBase}/v1${parsed.pathname}${parsed.search}`;
    }
  } catch (_) {
    /* not a valid absolute URL */
  }

  return trimmed;
}
