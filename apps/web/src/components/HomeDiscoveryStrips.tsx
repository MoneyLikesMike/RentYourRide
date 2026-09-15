import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listingPhotoUrl,
  searchListings,
  type ListingSummary,
} from '../api/listings';
import {
  DEFAULT_MARKET,
  haversineKm,
  MAX_RESULT_DISTANCE_KM,
  resolveLocalOrigin,
  SEARCH_RADIUS_KM,
} from '../utils/searchLocation';

type StripItem = {
  listing: ListingSummary;
  distanceKm?: number | null;
  badge?: 'new';
};

function formatDistanceKm(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  if (km < 1) return `${Math.max(0.1, Math.round(km * 10) / 10)} km`;
  if (km < 10) return `${Math.round(km * 10) / 10} km`;
  return `${Math.round(km)} km`;
}

function tripCount(listing: ListingSummary): number {
  const n = Number(listing.hostTrips ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function buildStrips(
  listings: ListingSummary[],
  origin: { latitude: number; longitude: number } | null,
  limit = 3,
): { nearYou: StripItem[]; bestValue: StripItem[]; newHosts: StripItem[] } {
  const pool = listings.filter((l) => l && l.id);
  const used = new Set<string>();

  const claim = (
    candidates: ListingSummary[],
    mapItem: (listing: ListingSummary) => StripItem,
  ): StripItem[] => {
    const out: StripItem[] = [];
    for (const listing of candidates) {
      const id = String(listing.id);
      if (used.has(id)) continue;
      used.add(id);
      out.push(mapItem(listing));
      if (out.length >= limit) break;
    }
    return out;
  };

  const newHosts = claim(
    pool.filter((l) => tripCount(l) === 0),
    (listing) => ({ listing, badge: 'new' }),
  );

  const remainingNear = pool
    .filter((l) => !used.has(String(l.id)))
    .map((listing) => {
      const lat = Number(listing.latitude);
      const lon = Number(listing.longitude);
      let dist: number | null = null;
      if (origin && Number.isFinite(lat) && Number.isFinite(lon)) {
        dist = haversineKm(origin.latitude, origin.longitude, lat, lon);
      }
      return { listing, distanceKm: dist };
    })
    .filter((row) => {
      // Near-you never shows continental distances.
      if (row.distanceKm == null) return false;
      return row.distanceKm <= MAX_RESULT_DISTANCE_KM;
    })
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

  const nearYou: StripItem[] = [];
  for (const row of remainingNear) {
    const id = String(row.listing.id);
    if (used.has(id)) continue;
    used.add(id);
    nearYou.push({ listing: row.listing, distanceKm: row.distanceKm });
    if (nearYou.length >= limit) break;
  }

  const bestValue = claim(
    pool
      .filter((l) => !used.has(String(l.id)))
      .sort(
        (a, b) => (Number(a.pricePerDay) || 0) - (Number(b.pricePerDay) || 0),
      ),
    (listing) => ({ listing }),
  );

  return { nearYou, bestValue, newHosts };
}

function StripCard({ item }: { item: StripItem }) {
  const photo = listingPhotoUrl(item.listing);
  const price = Number(item.listing.pricePerDay) || 0;
  const dist = formatDistanceKm(item.distanceKm);

  return (
    <Link
      to={`/find-your-car/${item.listing.id}`}
      className="home-strip-card"
    >
      <div className="home-strip-photo">
        {photo ? (
          <img src={photo} alt="" loading="lazy" />
        ) : (
          <span className="home-strip-photo-empty">No photo</span>
        )}
        {item.badge === 'new' ? (
          <span className="home-strip-badge home-strip-badge--new">New</span>
        ) : null}
      </div>
      <p className="home-strip-title">{item.listing.title || 'Vehicle'}</p>
      <p className="home-strip-price">
        <span>${price}</span>/day
      </p>
      {dist ? <p className="home-strip-meta">{dist}</p> : null}
    </Link>
  );
}

function StripSection({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: StripItem[];
}) {
  if (!items.length) return null;
  return (
    <section className="home-strip-section">
      <h2 className="home-strip-heading">{title}</h2>
      {subtitle ? <p className="home-strip-subheading">{subtitle}</p> : null}
      <div className="home-strip-row">
        {items.map((item) => (
          <StripCard key={item.listing.id} item={item} />
        ))}
      </div>
    </section>
  );
}

/**
 * Home discovery carousels. Always local-first: GPS when allowed, otherwise
 * Winnipeg — never an unbounded nationwide browse.
 */
export default function HomeDiscoveryStrips() {
  const [strips, setStrips] = useState({
    nearYou: [] as StripItem[],
    bestValue: [] as StripItem[],
    newHosts: [] as StripItem[],
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const resolved = await resolveLocalOrigin();
      const origin = resolved.origin;
      const city =
        resolved.source === 'default'
          ? DEFAULT_MARKET.city
          : resolved.city || undefined;

      let listings: ListingSummary[] = [];
      try {
        listings = await searchListings({
          city,
          latitude: origin.latitude,
          longitude: origin.longitude,
          radiusKm: SEARCH_RADIUS_KM,
        });
      } catch {
        listings = [];
      }

      if (!cancelled) {
        setStrips(buildStrips(listings, origin, 3));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const empty =
    !strips.nearYou.length &&
    !strips.bestValue.length &&
    !strips.newHosts.length;
  if (empty) return null;

  return (
    <div className="home-discovery">
      <StripSection title="Near you" items={strips.nearYou} />
      <StripSection title="Best value this week" items={strips.bestValue} />
      <StripSection
        title="New hosts"
        subtitle="First-booking deals"
        items={strips.newHosts}
      />
    </div>
  );
}
