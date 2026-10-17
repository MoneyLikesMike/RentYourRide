/** Soft ranking bias only — never a hard region filter. */
export const PLACES_BIAS_RADIUS_METERS = 50_000;

export type PlacesBias = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

function firstString(
  query: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = query[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return '';
}

/** Parse a coordinate string; empty / whitespace → null (`Number('')` is 0). */
function parseCoord(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * Read an optional location bias from legacy Places query params
 * (`location=lat,lng` + `radius`, or separate latitude/longitude).
 */
export function parsePlacesBias(
  query: Record<string, string | string[] | undefined> = {},
): PlacesBias | null {
  const radiusParsed = parseCoord(firstString(query, 'radius'));
  const radiusMeters =
    radiusParsed != null && radiusParsed > 0
      ? radiusParsed
      : PLACES_BIAS_RADIUS_METERS;

  const location = firstString(query, 'location').trim();
  const matched = location.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/,
  );
  if (matched) {
    const latitude = Number(matched[1]);
    const longitude = Number(matched[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude, radiusMeters };
    }
  }

  const latitude = parseCoord(firstString(query, 'latitude'));
  const longitude = parseCoord(firstString(query, 'longitude'));
  if (latitude != null && longitude != null) {
    return { latitude, longitude, radiusMeters };
  }

  return null;
}

/** Places API (New) autocomplete body — worldwide, optional circle bias. */
export function buildPlacesNewAutocompleteBody(
  input: string,
  query: Record<string, string | string[] | undefined> = {},
): Record<string, unknown> {
  const language = firstString(query, 'language') || 'en';
  const body: Record<string, unknown> = {
    input: input.trim(),
    languageCode: language,
  };
  const bias = parsePlacesBias(query);
  if (bias) {
    body.locationBias = {
      circle: {
        center: { latitude: bias.latitude, longitude: bias.longitude },
        radius: bias.radiusMeters,
      },
    };
  }
  return body;
}

/**
 * Legacy Place Autocomplete query params — worldwide (no `components`),
 * optional location+radius bias. Strips any client-supplied region filter.
 */
export function buildLegacyAutocompleteQuery(
  input: string,
  query: Record<string, string | string[] | undefined> = {},
): Record<string, string> {
  const out: Record<string, string> = {
    input: input.trim(),
    language: firstString(query, 'language') || 'en',
  };
  const sessiontoken = firstString(query, 'sessiontoken');
  if (sessiontoken) out.sessiontoken = sessiontoken;
  const types = firstString(query, 'types');
  if (types) out.types = types;

  const bias = parsePlacesBias(query);
  if (bias) {
    out.location = `${bias.latitude},${bias.longitude}`;
    out.radius = String(bias.radiusMeters);
  }
  return out;
}
