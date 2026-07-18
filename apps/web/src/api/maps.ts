import { apiFetch } from './http';

export type PlacePrediction = {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

export type PlaceDetailsResult = {
  formatted_address?: string;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  geometry?: {
    location?: { lat: number; lng: number };
  };
};

type AutocompleteResponse = {
  status?: string;
  predictions?: PlacePrediction[];
};

type DetailsResponse = {
  status?: string;
  result?: PlaceDetailsResult;
};

const COMPONENTS = 'country:ca|country:us';

export async function placesAutocomplete(
  input: string,
  sessionToken?: string,
): Promise<PlacePrediction[]> {
  const q = input.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    input: q,
    language: 'en',
    components: COMPONENTS,
  });
  if (sessionToken) params.set('sessiontoken', sessionToken);

  const data = await apiFetch<AutocompleteResponse>(
    `v1/maps-proxy/api/place/autocomplete/json?${params}`,
    { method: 'GET', auth: false },
  );
  return data.predictions ?? [];
}

export async function placeDetails(
  placeId: string,
  sessionToken?: string,
): Promise<PlaceDetailsResult | null> {
  const params = new URLSearchParams({
    place_id: placeId,
    language: 'en',
    fields: 'formatted_address,address_components,geometry',
  });
  if (sessionToken) params.set('sessiontoken', sessionToken);

  const data = await apiFetch<DetailsResponse>(
    `v1/maps-proxy/api/place/details/json?${params}`,
    { method: 'GET', auth: false },
  );
  return data.result ?? null;
}

export type ParsedPlace = {
  query: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
};

export function parsePlaceDetails(
  details: PlaceDetailsResult | null,
  fallbackDescription = '',
): ParsedPlace {
  const components = details?.address_components ?? [];
  const find = (type: string) =>
    components.find((c) => c.types?.includes(type))?.long_name || '';

  const city =
    find('locality') ||
    find('postal_town') ||
    find('administrative_area_level_2') ||
    fallbackDescription.split(',')[0]?.trim() ||
    '';

  const lat = details?.geometry?.location?.lat;
  const lng = details?.geometry?.location?.lng;

  return {
    query: details?.formatted_address || fallbackDescription,
    city,
    country: find('country'),
    latitude: typeof lat === 'number' ? lat : null,
    longitude: typeof lng === 'number' ? lng : null,
  };
}
