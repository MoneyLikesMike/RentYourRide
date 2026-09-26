/**
 * A host's exact address must not be discoverable before a booking is
 * confirmed, so listings served over public endpoints have their coordinates
 * shifted by a small amount — the same approach Airbnb and Turo use.
 *
 * The shift is derived from the listing id, so a vehicle always resolves to the
 * same approximate point instead of appearing to move between requests.
 *
 * Applied at the public boundary only. Host-owned reads, booking snapshots and
 * trip details keep the exact coordinates and street address.
 */

const MIN_OFFSET_M = 120;
const MAX_OFFSET_M = 400;
const METRES_PER_DEGREE_LAT = 111_320;

const POSTAL_RE =
  /\b([A-Z]\d[A-Z])\s?(\d[A-Z]\d)\b|\b(\d{5})(?:-\d{4})?\b/i;

const PROVINCE_CODES: Record<string, string> = {
  Alberta: 'AB',
  'British Columbia': 'BC',
  Manitoba: 'MB',
  'New Brunswick': 'NB',
  Newfoundland: 'NL',
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

const PROVINCE_RE =
  /\b(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT|Alberta|British Columbia|Manitoba|New Brunswick|Newfoundland(?: and Labrador)?|Northwest Territories|Nova Scotia|Nunavut|Ontario|Prince Edward Island|Quebec|Saskatchewan|Yukon)\b/i;

/** FNV-1a, enough spread for a stable per-listing offset. */
function hash(value: string): number {
  let result = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 0x01000193);
  }
  return result >>> 0;
}

export function extractPostalCode(text?: string | null): string {
  if (!text) return '';
  const m = String(text).match(POSTAL_RE);
  if (!m) return '';
  if (m[1] && m[2]) return `${m[1].toUpperCase()} ${m[2].toUpperCase()}`;
  return m[0].toUpperCase();
}

export function extractProvinceCode(text?: string | null): string {
  if (!text) return '';
  const m = String(text).match(PROVINCE_RE);
  if (!m) return '';
  const raw = m[1] || m[0];
  if (/^[A-Z]{2}$/i.test(raw)) return raw.toUpperCase();
  return PROVINCE_CODES[raw] || raw;
}

/**
 * Public listing label: "Winnipeg, MB R3N 0P2" — never a street address.
 */
export function approximatePickupLabel(parts: {
  city?: string | null;
  pickupAddress?: string | null;
  province?: string | null;
}): string {
  const city = (parts.city || '').trim();
  const province =
    (parts.province || '').trim().toUpperCase() ||
    extractProvinceCode(parts.pickupAddress);
  const postal = extractPostalCode(parts.pickupAddress);

  if (city && province && postal) return `${city}, ${province} ${postal}`;
  if (city && postal) return `${city}, ${postal}`;
  if (city && province) return `${city}, ${province}`;
  if (city) return city;
  if (postal) return postal;
  return 'Approximate location';
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
  city?: string;
  pickupAddress?: string;
};

/** Returns the dto with approximate coordinates and a redacted pickup label. */
export function withApproximateLocation<T extends LocatableDto>(dto: T): T {
  const pickupAddress = approximatePickupLabel({
    city: dto.city,
    pickupAddress: dto.pickupAddress,
  });

  if (typeof dto.latitude !== 'number' || typeof dto.longitude !== 'number') {
    return { ...dto, pickupAddress };
  }
  const { latitude, longitude } = approximateCoordinates(
    dto.id,
    dto.latitude,
    dto.longitude,
  );
  return { ...dto, latitude, longitude, pickupAddress };
}
