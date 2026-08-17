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
  street?: string;
  city: string;
  country: string;
  region?: string;
  regionCode?: string;
  postalCode?: string;
  latitude: number | null;
  longitude: number | null;
};

export type GeocodeResult = {
  formatted: string;
  city: string;
  region: string;
  country: string;
  street: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  cached?: boolean;
};

const CA_PROVINCE_CODES: Record<string, string> = {
  Alberta: 'AB',
  'British Columbia': 'BC',
  Manitoba: 'MB',
  'New Brunswick': 'NB',
  'Newfoundland and Labrador': 'NL',
  'Northwest Territories': 'NT',
  'Nova Scotia': 'NS',
  Nunavut: 'NU',
  Ontario: 'ON',
  'Prince Edward Island': 'PE',
  Quebec: 'QC',
  Saskatchewan: 'SK',
  Yukon: 'YT',
};

const POSTAL_RE =
  /\b([A-Z]\d[A-Z])\s?(\d[A-Z]\d)\b|\b(\d{5})(?:-\d{4})?\b/i;

export function extractPostalCode(text: string): string {
  const m = text.match(POSTAL_RE);
  if (!m) return '';
  if (m[1] && m[2]) return `${m[1].toUpperCase()} ${m[2].toUpperCase()}`;
  return m[0].toUpperCase();
}

export function provinceCode(region: string): string {
  const trimmed = region.trim();
  if (!trimmed) return '';
  if (/^[A-Z]{2}$/i.test(trimmed)) return trimmed.toUpperCase();
  return CA_PROVINCE_CODES[trimmed] || trimmed;
}

/** Compact display like Zeplin: "Winnipeg, MB R3B 1G7" */
export function formatLocationLabel(parts: {
  formatted?: string;
  city?: string;
  region?: string;
  regionCode?: string;
  postalCode?: string;
  country?: string;
  fallback?: string;
}): string {
  const postal =
    (parts.postalCode || '').trim() ||
    extractPostalCode(parts.formatted || '') ||
    extractPostalCode(parts.fallback || '');
  const city = (parts.city || '').trim();
  const code =
    (parts.regionCode || '').trim() ||
    provinceCode(parts.region || '') ||
    '';

  if (city && code && postal) return `${city}, ${code} ${postal}`;
  if (city && postal) return `${city}, ${postal}`;
  if (city && code) return `${city}, ${code}`;

  const formatted = (parts.formatted || '').trim();
  if (formatted && postal && !extractPostalCode(formatted)) {
    return `${formatted.replace(/,?\s*Canada$/i, '').trim()}, ${postal}`;
  }
  if (formatted) {
    return formatted.replace(/^,\s*/, '').trim();
  }

  const fallback = (parts.fallback || '').replace(/^,\s*/, '').trim();
  return fallback || '—';
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<GeocodeResult> {
  return apiFetch<GeocodeResult>('v1/geocode/reverse', {
    method: 'POST',
    auth: false,
    json: { latitude, longitude },
  });
}

export async function forwardGeocode(address: string): Promise<GeocodeResult> {
  return apiFetch<GeocodeResult>('v1/geocode/forward', {
    method: 'POST',
    auth: false,
    json: { address: address.trim() },
  });
}

export async function resolveBrowserCurrentLocation(): Promise<GeocodeResult> {
  if (!('geolocation' in navigator)) {
    throw new Error('Location is not available in this browser.');
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60_000,
    });
  });

  return reverseGeocode(
    position.coords.latitude,
    position.coords.longitude,
  );
}

export function parsePlaceDetails(
  details: PlaceDetailsResult | null,
  fallbackDescription = '',
): ParsedPlace {
  const components = details?.address_components ?? [];
  const find = (type: string, short = false) => {
    const row = components.find((c) => c.types?.includes(type));
    if (!row) return '';
    return short ? row.short_name || row.long_name : row.long_name;
  };

  const city =
    find('locality') ||
    find('postal_town') ||
    find('administrative_area_level_2') ||
    fallbackDescription.split(',')[0]?.trim() ||
    '';
  const region = find('administrative_area_level_1');
  const regionCode = find('administrative_area_level_1', true);
  const postalCode = find('postal_code');
  const country = find('country');
  const streetNumber = find('street_number');
  const route = find('route');
  const street =
    [streetNumber, route].filter(Boolean).join(' ').trim() ||
    fallbackDescription.split(',')[0]?.trim() ||
    '';
  const lat = details?.geometry?.location?.lat;
  const lng = details?.geometry?.location?.lng;
  const formatted = details?.formatted_address || fallbackDescription;

  return {
    query: formatted || fallbackDescription,
    street,
    city,
    country,
    region,
    regionCode,
    postalCode,
    latitude: typeof lat === 'number' ? lat : null,
    longitude: typeof lng === 'number' ? lng : null,
  };
}
