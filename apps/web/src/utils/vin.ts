/** Same VIN helpers as mobile `utils/vinListingFlow.js`. */

export function normalizeVin(vin: string): string {
  return String(vin || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
}

/** VINs exclude I, O, and Q per ISO 3779. */
export function isValidVin(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(normalizeVin(vin));
}

export const DEFAULT_TRANSMISSION_OPTIONS = ['Automatic', 'Manual'];

export const DEFAULT_FUEL_TYPE_OPTIONS = [
  'Gasoline',
  'Diesel',
  'Hybrid',
  'Electricity',
  'Plug-in Hybrid',
];

export const DEFAULT_TRIM_OPTIONS = ['Base'];

export const DEFAULT_STYLE_OPTIONS = [
  '4dr Sedan',
  '2dr Coupe',
  '4dr Hatchback',
  '5dr SUV',
  '4dr Wagon',
  '4dr Pickup',
];

/** Merge API options with sensible defaults, preserving order. */
export function mergeFieldOptions(
  apiOptions: unknown,
  fallback: string[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const lists = [
    Array.isArray(apiOptions) ? apiOptions : [],
    fallback,
  ];
  for (const list of lists) {
    for (const item of list) {
      const label = String(item || '').trim();
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(label);
    }
  }
  return out;
}
