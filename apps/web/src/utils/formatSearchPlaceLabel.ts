/**
 * Display label for a selected search place — uses the place's own country,
 * never a hard-coded ", Canada".
 */
export function formatSearchPlaceLabel(parts: {
  city?: string | null;
  region?: string | null;
  regionCode?: string | null;
  country?: string | null;
  query?: string | null;
  fallback?: string;
}): string {
  const city = (parts.city || '').trim();
  const country = (parts.country || '').trim();
  const region = (parts.regionCode || parts.region || '').trim();
  const query = (parts.query || '').trim();

  if (city && country) {
    const caOrUs =
      /^canada$/i.test(country) ||
      /^united states$/i.test(country) ||
      /^usa$/i.test(country);
    if (caOrUs && region) return `${city}, ${region}`;
    if (region && !caOrUs && region.toLowerCase() !== country.toLowerCase()) {
      return `${city}, ${region}, ${country}`;
    }
    return `${city}, ${country}`;
  }

  if (city && region) return `${city}, ${region}`;
  if (query) return query;
  if (city) return city;
  return (parts.fallback || '').trim() || 'Enter location';
}
