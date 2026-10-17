/**
 * Display label for a selected search place — uses the place's own country,
 * never a hard-coded ", Canada".
 */
export function formatSearchPlaceLabel(parts = {}) {
  const city = typeof parts.city === 'string' ? parts.city.trim() : '';
  const country = typeof parts.country === 'string' ? parts.country.trim() : '';
  const region = (
    (typeof parts.regionCode === 'string' && parts.regionCode) ||
    (typeof parts.region === 'string' && parts.region) ||
    (typeof parts.province === 'string' && parts.province) ||
    ''
  ).trim();
  const query = typeof parts.query === 'string' ? parts.query.trim() : '';

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
  return (typeof parts.fallback === 'string' && parts.fallback.trim()) || 'Enter location';
}
