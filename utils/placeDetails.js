/** @param {object | null | undefined} details Google Place Details result */
export function parsePlaceDetails(details) {
  if (!details) {
    return {
      formatted: '',
      city: '',
      region: '',
    country: '',
    countryCode: '',
    postalCode: '',
    street: '',
      latitude: null,
      longitude: null,
    };
  }

  const components = details.address_components || [];
  const find = (type) =>
    components.find((c) => Array.isArray(c.types) && c.types.includes(type))?.long_name || '';

  const findShort = (type) =>
    components.find((c) => Array.isArray(c.types) && c.types.includes(type))?.short_name || '';

  const streetNumber = find('street_number');
  const route = find('route');
  const street = [streetNumber, route].filter(Boolean).join(' ');

  return {
    formatted: details.formatted_address || '',
    city:
      find('locality') ||
      find('postal_town') ||
      find('administrative_area_level_2') ||
      '',
    region: find('administrative_area_level_1') || '',
    country: find('country') || '',
    countryCode: findShort('country') || '',
    postalCode: find('postal_code') || '',
    street,
    latitude: details.geometry?.location?.lat ?? null,
    longitude: details.geometry?.location?.lng ?? null,
  };
}

/** @param {object} data @param {object | null} details */
export function placeSelectionToSearchQuery(data, details) {
  const parsed = parsePlaceDetails(details);
  return {
    query: parsed.formatted || data?.description || '',
    city: parsed.city || (data?.description || '').split(',')[0]?.trim() || '',
    country: parsed.country || '',
    countryCode: parsed.countryCode || '',
    postalCode: parsed.postalCode || '',
    street: parsed.street || '',
    latitude: parsed.latitude,
    longitude: parsed.longitude,
  };
}
