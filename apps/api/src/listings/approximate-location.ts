/**
 * A host's exact address must not be discoverable before a booking is
 * confirmed, so listings served over public endpoints have their coordinates
 * shifted by a small amount — the same approach Airbnb and Turo use.
 *
 * The shift is derived from the listing id, so a vehicle always resolves to the
 * same approximate point instead of appearing to move between requests.
 *
 * Applied at the public boundary only. Host-owned reads, booking snapshots and
 * trip details keep the exact coordinates.
 */

const MIN_OFFSET_M = 120;
const MAX_OFFSET_M = 400;
const METRES_PER_DEGREE_LAT = 111_320;

/** FNV-1a, enough spread for a stable per-listing offset. */
function hash(value: string): number {
  let result = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 0x01000193);
  }
  return result >>> 0;
}

export function approximateCoordinates(
  id: string,
  latitude: number,
  longitude: number,
): { latitude: number; longitude: number } {
  const seed = hash(id);
  // Two independent values out of one hash: low bits for the angle, high bits
  // for the distance.
  const angle = ((seed & 0xffff) / 0xffff) * Math.PI * 2;
  const distance =
    MIN_OFFSET_M + ((seed >>> 16) / 0xffff) * (MAX_OFFSET_M - MIN_OFFSET_M);

  const northMetres = Math.sin(angle) * distance;
  const eastMetres = Math.cos(angle) * distance;

  const metresPerDegreeLng =
    METRES_PER_DEGREE_LAT * Math.cos((latitude * Math.PI) / 180);

  return {
    latitude: latitude + northMetres / METRES_PER_DEGREE_LAT,
    longitude:
      metresPerDegreeLng > 1 ? longitude + eastMetres / metresPerDegreeLng : longitude,
  };
}

type LocatableDto = {
  id: string;
  latitude?: number;
  longitude?: number;
};

/** Returns the dto with its coordinates replaced by the approximate ones. */
export function withApproximateLocation<T extends LocatableDto>(dto: T): T {
  if (typeof dto.latitude !== 'number' || typeof dto.longitude !== 'number') {
    return dto;
  }
  const { latitude, longitude } = approximateCoordinates(
    dto.id,
    dto.latitude,
    dto.longitude,
  );
  return { ...dto, latitude, longitude };
}
