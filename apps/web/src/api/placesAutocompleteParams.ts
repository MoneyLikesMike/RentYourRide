/** Soft ranking bias only — never a hard region filter. */
export const PLACES_BIAS_RADIUS_METERS = 50_000;

export type PlacesAutocompleteBias = {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
};

export type BuildPlacesAutocompleteParamsInput = {
  input: string;
  sessionToken?: string;
  language?: string;
  bias?: PlacesAutocompleteBias | null;
};

/**
 * Query params for `/v1/maps-proxy/api/place/autocomplete/json`.
 * Worldwide (no `components`); optional location+radius bias.
 */
export function buildPlacesAutocompleteParams({
  input,
  sessionToken,
  language = 'en',
  bias,
}: BuildPlacesAutocompleteParamsInput): URLSearchParams {
  const params = new URLSearchParams({
    input: input.trim(),
    language,
  });
  if (sessionToken) params.set('sessiontoken', sessionToken);

  if (
    bias &&
    Number.isFinite(bias.latitude) &&
    Number.isFinite(bias.longitude)
  ) {
    params.set('location', `${bias.latitude},${bias.longitude}`);
    params.set(
      'radius',
      String(
        bias.radiusMeters && bias.radiusMeters > 0
          ? bias.radiusMeters
          : PLACES_BIAS_RADIUS_METERS,
      ),
    );
  }

  return params;
}
