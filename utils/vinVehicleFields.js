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
export function mergeFieldOptions(apiOptions, fallback) {
  const seen = new Set();
  const out = [];
  for (const list of [apiOptions || [], fallback || []]) {
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

/**
 * Apply decoded VIN vehicleData + fieldOptions to listing form state.
 * @param {object | null | undefined} vehicleData
 * @param {object} handlers
 */
export function applyVinVehicleFields(vehicleData, handlers) {
  if (!vehicleData || typeof vehicleData !== 'object') return;

  const opts = vehicleData.fieldOptions || {};
  const {
    setTransmission,
    setFuelType,
    setTrim,
    setStyle,
    setTransmissionOptions,
    setFuelTypeOptions,
    setTrimOptions,
    setStyleOptions,
  } = handlers;

  if (setTransmissionOptions) {
    setTransmissionOptions(
      mergeFieldOptions(opts.transmission, DEFAULT_TRANSMISSION_OPTIONS),
    );
  }
  if (setFuelTypeOptions) {
    setFuelTypeOptions(mergeFieldOptions(opts.fuelType, DEFAULT_FUEL_TYPE_OPTIONS));
  }
  if (setTrimOptions) {
    setTrimOptions(mergeFieldOptions(opts.trim, DEFAULT_TRIM_OPTIONS));
  }
  if (setStyleOptions) {
    setStyleOptions(mergeFieldOptions(opts.style, DEFAULT_STYLE_OPTIONS));
  }

  if (vehicleData.transmission && setTransmission) {
    setTransmission(vehicleData.transmission);
  }
  if (vehicleData.fuelType && setFuelType) {
    setFuelType(vehicleData.fuelType);
  }
  if (vehicleData.trim && setTrim) {
    setTrim(vehicleData.trim);
  }
  if (vehicleData.style && setStyle) {
    setStyle(vehicleData.style);
  }
}
