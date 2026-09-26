/** Default local market when GPS is denied or unavailable (known RYR hub). */
export const DEFAULT_MARKET = {
  city: 'Winnipeg',
  query: 'Winnipeg, MB',
  country: 'Canada',
  latitude: 49.8951,
  longitude: -97.1384,
} as const;

/** Primary search radius sent to the API (server caps at 100 km). */
export const SEARCH_RADIUS_KM = 80;

/**
 * Hard client cap — never show multi-thousand-km “near you” cards even if the
 * API returns a wider city match or an unbounded browse.
 */
export const MAX_RESULT_DISTANCE_KM = 100;

export type SearchOrigin = {
  latitude: number;
  longitude: number;
};

export function hasSearchOrigin(
  latitude?: number | null,
  longitude?: number | null,
): latitude is number {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  );
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Resolve browser GPS; falls back to Winnipeg when denied/unavailable. */
export async function resolveLocalOrigin(): Promise<{
  origin: SearchOrigin;
  city: string;
  query: string;
  country: string;
  source: 'gps' | 'default';
}> {
  if ('geolocation' in navigator) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 300_000,
        });
      });
      return {
        origin: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        },
        city: '',
        query: 'Near you',
        country: '',
        source: 'gps',
      };
    } catch {
      // fall through to default market
    }
  }

  return {
    origin: {
      latitude: DEFAULT_MARKET.latitude,
      longitude: DEFAULT_MARKET.longitude,
    },
    city: DEFAULT_MARKET.city,
    query: DEFAULT_MARKET.query,
    country: DEFAULT_MARKET.country,
    source: 'default',
  };
}
