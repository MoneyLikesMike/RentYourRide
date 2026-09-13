/**
 * Resolve a marketplace search city from geocode / Places / free-text input.
 * @returns {{ city: string, query: string }}
 */
export function looksLikeCoordinates(value) {
  if (value == null) return false;
  const raw = String(value).trim();
  if (!raw) return false;
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(raw)) return true;
  return /^-?\d+(\.\d+)?$/.test(raw);
}

export function formatLocationLabel(value, fallback = 'your area') {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || looksLikeCoordinates(raw)) return fallback;
  return raw;
}

export function resolveSearchCity({ city, query, region, country } = {}) {
  const explicit = typeof city === 'string' ? city.trim() : '';
  if (explicit && !looksLikeCoordinates(explicit)) {
    return { city: explicit, query: explicit };
  }

  const raw = typeof query === 'string' ? query.trim() : '';
  if (!raw) return { city: '', query: '' };

  if (looksLikeCoordinates(raw)) {
    return { city: '', query: raw };
  }

  if (!raw.includes(',')) {
    return { city: raw, query: raw };
  }

  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const likelyCity = parts[1];
    const suffix = [region, country].filter(Boolean).join(', ');
    return {
      city: likelyCity,
      query: suffix ? `${likelyCity}, ${suffix}` : likelyCity,
    };
  }

  return { city: parts[0], query: raw };
}

/** Published marketplace listings only (owned drafts excluded unless published). */
export function isMarketplaceListing(listing) {
  if (!listing || listing.active === false) return false;
  if (listing.owned === true) return listing.published !== false;
  return listing.published !== false;
}
