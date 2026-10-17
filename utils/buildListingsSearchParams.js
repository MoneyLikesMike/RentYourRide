/**
 * Shared /v1/listings/search query builder for Home + SearchResults.
 *
 * Distance chips:
 * - numeric km → send latitude/longitude/radiusKm when coords exist
 * - 'prov' / 'national' → no radius (and no province filter) — city/q only
 *
 * Dates (bookingDates) are kept on the search state for the UI / RYRA-465;
 * this builder does not add them to the API query until the API accepts them.
 */

function trimStr(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function finiteNumber(value) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {{
 *   label?: string,
 *   fullAddress?: string,
 *   city?: string,
 *   latitude?: number|null,
 *   longitude?: number|null,
 *   radiusKm?: number|null,
 *   distance?: number|'prov'|'national'|null,
 *   bookingDates?: object|null,
 * }} state
 * @returns {{
 *   params: { city?: string, q?: string, latitude?: number, longitude?: number, radiusKm?: number } | null,
 *   reason?: 'empty',
 * }}
 */
export function buildListingsSearchParams(state = {}) {
  const city = trimStr(state.city);
  const label = trimStr(state.label) || trimStr(state.fullAddress) || city;
  const lat = finiteNumber(state.latitude);
  const lon = finiteNumber(state.longitude);
  const hasCoords = lat != null && lon != null;

  const distance = state.distance ?? state.radiusKm ?? null;
  const isSpecial = distance === 'prov' || distance === 'national';
  const numericRadius =
    typeof distance === 'number' && Number.isFinite(distance)
      ? distance
      : finiteNumber(state.radiusKm);

  if (!hasCoords && !city && !label) {
    return { params: null, reason: 'empty' };
  }

  // Need a city/q key or coords to hit the API usefully.
  if (!hasCoords && !city) {
    // Label-only (e.g. free text) — use as city/q fallback.
    if (label) {
      return { params: { city: label } };
    }
    return { params: null, reason: 'empty' };
  }

  const params = {};
  if (city) params.city = city;

  // Prov / national: intentionally no radius and no lat/lng filter (city match only).
  if (hasCoords && !isSpecial) {
    params.latitude = lat;
    params.longitude = lon;
    if (numericRadius != null && numericRadius > 0) {
      params.radiusKm = numericRadius;
    }
  }

  return { params };
}

/**
 * Normalize route params / place selection into the results-screen search state.
 */
export function createSearchStateFromParams(params = {}) {
  const city = trimStr(params.city);
  const label =
    trimStr(params.label) ||
    trimStr(params.fullAddress) ||
    trimStr(params.locationQuery) ||
    city;
  const lat = finiteNumber(params.latitude);
  const lon = finiteNumber(params.longitude);
  const distance =
    params.distance === 'prov' || params.distance === 'national'
      ? params.distance
      : finiteNumber(params.distance) ??
        finiteNumber(params.radiusKm) ??
        500;

  return {
    label,
    fullAddress: trimStr(params.fullAddress) || label,
    city,
    latitude: lat,
    longitude: lon,
    radiusKm: typeof distance === 'number' ? distance : null,
    distance,
    bookingDates:
      params.bookingDates && typeof params.bookingDates === 'object'
        ? params.bookingDates
        : null,
    country: trimStr(params.country),
    region: trimStr(params.region) || trimStr(params.province),
  };
}

/** True when route params carry a real place (not a dates-only return from Calendar). */
export function routeParamsHaveLocation(params = {}) {
  const lat = finiteNumber(params.latitude);
  const lon = finiteNumber(params.longitude);
  return Boolean(
    trimStr(params.city) ||
      trimStr(params.locationQuery) ||
      trimStr(params.label) ||
      trimStr(params.fullAddress) ||
      (lat != null && lon != null),
  );
}

/**
 * Merge route params into existing search state without wiping location when
 * Calendar (or similar) navigates back with only `{ bookingDates }`.
 */
export function mergeSearchStateFromRoute(prev = {}, routeParams = {}) {
  const next = createSearchStateFromParams(routeParams);
  if (!routeParamsHaveLocation(routeParams)) {
    return {
      ...prev,
      bookingDates: next.bookingDates || prev.bookingDates || null,
    };
  }
  return {
    ...prev,
    ...next,
    distance:
      routeParams.distance ??
      routeParams.radiusKm ??
      prev.distance ??
      next.distance,
    bookingDates: next.bookingDates || prev.bookingDates || null,
  };
}

/** Snapshot of location fields to round-trip through CalendarScreen. */
export function searchReturnParamsFromState(state = {}) {
  return {
    city: state.city || undefined,
    locationQuery: state.label || state.fullAddress || undefined,
    label: state.label || undefined,
    fullAddress: state.fullAddress || undefined,
    latitude: state.latitude ?? undefined,
    longitude: state.longitude ?? undefined,
    country: state.country || undefined,
    region: state.region || undefined,
    distance: state.distance ?? undefined,
    radiusKm: state.radiusKm ?? undefined,
  };
}
