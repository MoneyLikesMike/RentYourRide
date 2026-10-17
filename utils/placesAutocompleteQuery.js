/** Soft ranking bias only — never a hard region filter. */
export const PLACES_BIAS_RADIUS_METERS = 50000;

export const PLACES_QUERY_DEFAULTS = {
  language: 'en',
};

/**
 * Build Places Autocomplete query params (worldwide).
 * Optional location+radius bias ranks nearby places first without restricting.
 */
export function buildPlacesAutocompleteQuery({
  sessiontoken,
  types,
  latitude,
  longitude,
  radiusMeters = PLACES_BIAS_RADIUS_METERS,
} = {}) {
  const query = {
    ...PLACES_QUERY_DEFAULTS,
  };
  if (sessiontoken) query.sessiontoken = sessiontoken;
  if (types) query.types = types;

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    query.location = `${latitude},${longitude}`;
    query.radius = String(
      Number.isFinite(radiusMeters) && radiusMeters > 0
        ? radiusMeters
        : PLACES_BIAS_RADIUS_METERS,
    );
  }

  return query;
}
