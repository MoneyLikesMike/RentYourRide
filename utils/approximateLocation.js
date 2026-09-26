/**
 * Pre-booking pickup label: city, province, postal — never a street address.
 * Exact pickup stays on booking/trip screens after confirmation.
 */

const POSTAL_RE =
  /\b([A-Z]\d[A-Z])\s?(\d[A-Z]\d)\b|\b(\d{5})(?:-\d{4})?\b/i;

const PROVINCE_CODES = {
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

export function extractPostalCode(text) {
  if (!text) return '';
  const m = String(text).match(POSTAL_RE);
  if (!m) return '';
  if (m[1] && m[2]) return `${m[1].toUpperCase()} ${m[2].toUpperCase()}`;
  return m[0].toUpperCase();
}

export function extractProvinceCode(text) {
  if (!text) return '';
  const m = String(text).match(PROVINCE_RE);
  if (!m) return '';
  const raw = m[1] || m[0];
  if (/^[A-Z]{2}$/i.test(raw)) return raw.toUpperCase();
  return PROVINCE_CODES[raw] || raw;
}

/**
 * Public listing label: "Winnipeg, MB R3N 0P2"
 * @param {{ city?: string, pickupAddress?: string, province?: string }} parts
 */
export function formatApproximatePickup(parts = {}) {
  const existing = String(parts.pickupAddress || '')
    .replace(/^,\s*/, '')
    .trim();
  // Already redacted by the API into city/province/postal form (no street digits).
  if (
    existing &&
    !/^\d/.test(existing) &&
    !/^near\s+/i.test(existing) &&
    extractPostalCode(existing) &&
    (parts.city ? existing.toLowerCase().includes(String(parts.city).toLowerCase()) : true)
  ) {
    return existing;
  }

  const city = (parts.city || '').trim();
  const province =
    (parts.province || '').trim().toUpperCase() ||
    extractProvinceCode(parts.pickupAddress) ||
    extractProvinceCode(existing);
  const postal = extractPostalCode(parts.pickupAddress) || extractPostalCode(existing);

  if (city && province && postal) return `${city}, ${province} ${postal}`;
  if (city && postal) return `${city}, ${postal}`;
  if (city && province) return `${city}, ${province}`;
  if (city) return city;
  if (postal) return postal;
  return 'Approximate location';
}
