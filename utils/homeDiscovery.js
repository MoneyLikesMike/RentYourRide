import { getListingTripCount } from './listingRating';
import { isMarketplaceListing } from './searchLocation';

/** Earth distance in km (approx). */
export function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceKm(km) {
  if (km == null || !Number.isFinite(km)) return null;
  if (km < 1) return `${Math.max(0.1, Math.round(km * 10) / 10)} km`;
  if (km < 10) return `${Math.round(km * 10) / 10} km`;
  return `${Math.round(km)} km`;
}

function listingId(l) {
  return l?.id != null ? String(l.id) : null;
}

function distanceFor(listing, origin) {
  if (!origin || !Number.isFinite(origin.latitude) || !Number.isFinite(origin.longitude)) {
    return null;
  }
  const lat = Number(listing.latitude);
  const lon = Number(listing.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return distanceKm(origin.latitude, origin.longitude, lat, lon);
}

/**
 * Soft-exclusive strips (each car in at most one strip).
 * Priority: New hosts (0 trips) → Near you (closest) → Best value (cheapest).
 * Empty strips are omitted by the UI.
 * Each item: { listing, distanceKm?, badge?: 'new' }
 */
export function buildHomeDiscoveryStrips(listings, { origin = null, limit = 3 } = {}) {
  const pool = (Array.isArray(listings) ? listings : []).filter(
    (l) => l && isMarketplaceListing(l) && l.active !== false,
  );

  const used = new Set();
  const claim = (candidates, mapItem) => {
    const out = [];
    for (const listing of candidates) {
      const id = listingId(listing);
      if (!id || used.has(id)) continue;
      used.add(id);
      out.push(mapItem(listing));
      if (out.length >= limit) break;
    }
    return out;
  };

  // 1) New hosts — first claim on zero-trip cars
  const zeroTrips = pool.filter((l) => getListingTripCount(l) === 0);
  const newHosts = claim(zeroTrips, (listing) => ({
    listing,
    badge: 'new',
  }));

  // 2) Near you — closest of what's left
  const remainingNear = pool
    .filter((l) => !used.has(listingId(l)))
    .map((listing) => ({ listing, distanceKm: distanceFor(listing, origin) }))
    .sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  const nearYou = [];
  for (const row of remainingNear) {
    const id = listingId(row.listing);
    if (!id || used.has(id)) continue;
    used.add(id);
    nearYou.push({ listing: row.listing, distanceKm: row.distanceKm });
    if (nearYou.length >= limit) break;
  }

  // 3) Best value — cheapest of what's left
  const byPrice = pool
    .filter((l) => !used.has(listingId(l)))
    .sort((a, b) => (Number(a.pricePerDay) || 0) - (Number(b.pricePerDay) || 0));
  const bestValue = claim(byPrice, (listing) => ({ listing }));

  return { nearYou, bestValue, newHosts };
}
