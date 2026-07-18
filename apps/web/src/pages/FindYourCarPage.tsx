import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  listingPhotoUrl,
  searchListings,
  type ListingSummary,
} from '../api/listings';
import { ApiError } from '../api/http';
import type { ParsedPlace } from '../api/maps';
import PlacesAutocomplete from '../components/PlacesAutocomplete';
import SiteHeader from '../components/SiteHeader';
import type { SearchNavState } from '../types/search';

const VEHICLE_TYPE_OPTIONS = [
  'Car',
  'SUV',
  'Minivan',
  'Pickup Truck',
  'Van',
  'Convertible',
] as const;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeInput(iso?: string): string {
  if (!iso) return '10:00';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '10:00';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function combineLocal(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function Stars({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(rating || 0)));
  return (
    <span className="fyc-stars" aria-label={`${filled} of 5 stars`}>
      {'★'.repeat(filled)}
      <span className="fyc-stars-empty">{'★'.repeat(5 - filled)}</span>
    </span>
  );
}

function MapPanel({
  lat,
  lng,
  label,
}: {
  lat: number | null;
  lng: number | null;
  label: string;
}) {
  const hasCoords =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng);

  if (!hasCoords) {
    return (
      <div className="fyc-map-placeholder">
        <p>Map</p>
        <span>{label || 'Search a location to center the map'}</span>
      </div>
    );
  }

  const delta = 0.08;
  const bbox = [
    lng - delta,
    lat - delta,
    lng + delta,
    lat + delta,
  ].join('%2C');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <iframe
      title={`Map of ${label}`}
      className="fyc-map-frame"
      src={src}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}

export default function FindYourCarPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as SearchNavState | null;

  const initialCity = navState?.location.city?.trim() || '';
  const initialQuery = navState?.location.query?.trim() || '';

  const [addressText, setAddressText] = useState(
    () => navState?.location.query || initialCity || '',
  );
  const [place, setPlace] = useState<ParsedPlace | null>(() =>
    navState?.location
      ? {
          query: navState.location.query,
          city: navState.location.city,
          country: navState.location.country || '',
          latitude: navState.location.latitude ?? null,
          longitude: navState.location.longitude ?? null,
        }
      : null,
  );
  const [startDate, setStartDate] = useState(() =>
    toDateInput(navState?.dates?.start),
  );
  const [startTime, setStartTime] = useState(() =>
    toTimeInput(navState?.dates?.start),
  );
  const [endDate, setEndDate] = useState(() =>
    toDateInput(navState?.dates?.end),
  );
  const [endTime, setEndTime] = useState(() =>
    toTimeInput(navState?.dates?.end),
  );

  const [searchCity, setSearchCity] = useState(initialCity);
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);

  const [priceOpen, setPriceOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(1);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [appliedMin, setAppliedMin] = useState(1);
  const [appliedMax, setAppliedMax] = useState(1000);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    () => navState?.vehicleType ?? [],
  );
  const [instantOnly, setInstantOnly] = useState(false);

  useEffect(() => {
    if (!searchCity && !searchQuery) {
      navigate('/', { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      setStatus('loading');
      setError(null);
      try {
        const rows = await searchListings({
          city: searchCity || undefined,
          q: !searchCity && searchQuery ? searchQuery : undefined,
        });
        if (cancelled) return;
        setListings(Array.isArray(rows) ? rows : []);
        setStatus('ok');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Search failed',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchCity, searchQuery, navigate]);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (l.pricePerDay < appliedMin || l.pricePerDay > appliedMax) return false;
      if (selectedTypes.length) {
        const t = (l.vehicleType || '').toLowerCase();
        if (!selectedTypes.some((s) => s.toLowerCase() === t)) return false;
      }
      if (instantOnly) {
        if (l.instantBooking === false) return false;
      }
      return true;
    });
  }, [listings, appliedMin, appliedMax, selectedTypes, instantOnly]);

  const mapLat =
    place?.latitude ??
    filtered.find((l) => l.latitude != null)?.latitude ??
    null;
  const mapLng =
    place?.longitude ??
    filtered.find((l) => l.longitude != null)?.longitude ??
    null;

  const currentSearchState = (): SearchNavState => {
    const city =
      place?.city?.trim() ||
      addressText.split(',')[0]?.trim() ||
      searchCity ||
      addressText.trim();
    const start = combineLocal(startDate, startTime);
    const end = combineLocal(endDate, endTime);
    return {
      location: {
        query: place?.query || addressText.trim() || city,
        city,
        country: place?.country,
        latitude: place?.latitude ?? mapLat,
        longitude: place?.longitude ?? mapLng,
      },
      dates: {
        start: (start ?? new Date()).toISOString(),
        end: (end ?? new Date(Date.now() + 86400000)).toISOString(),
      },
      vehicleType: selectedTypes.length ? selectedTypes : undefined,
    };
  };

  const runSearch = (e?: FormEvent) => {
    e?.preventDefault();
    const city =
      place?.city?.trim() ||
      addressText.split(',')[0]?.trim() ||
      addressText.trim();
    if (!city) {
      setError('Enter a city, airport, or address.');
      return;
    }
    setError(null);
    setSearchCity(city);
    setSearchQuery(place?.query || addressText.trim());
    setPriceOpen(false);
    setFiltersOpen(false);
    navigate('/find-your-car', { replace: true, state: currentSearchState() });
  };

  const applyPrice = () => {
    setAppliedMin(minPrice);
    setAppliedMax(maxPrice);
    setPriceOpen(false);
  };

  const toggleType = (title: string) => {
    setSelectedTypes((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );
  };

  return (
    <div className="fyc-page">
      <SiteHeader />

      <div className="find-your-car-wrapper">
        <form className="fyc-sort-bar" onSubmit={runSearch}>
          <div className="fyc-sort-field location">
            <PlacesAutocomplete
              value={addressText}
              onChange={(text) => {
                setAddressText(text);
                setPlace(null);
              }}
              onPlaceSelected={(parsed) => {
                setPlace(parsed);
                setAddressText(parsed.query);
              }}
            />
          </div>

          <div className="fyc-sort-field">
            <span className="option-caption">Start</span>
            <div className="fyc-dt-row">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="fyc-sort-field">
            <span className="option-caption">End</span>
            <div className="fyc-dt-row">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="fyc-filter-btns">
            <button
              type="button"
              className={`fyc-chip${priceOpen ? ' active' : ''}`}
              onClick={() => {
                setPriceOpen((v) => !v);
                setFiltersOpen(false);
              }}
            >
              Price {priceOpen ? '▴' : '▾'}
            </button>
            <button
              type="button"
              className={`fyc-chip more${filtersOpen ? ' active' : ''}`}
              onClick={() => {
                setFiltersOpen((v) => !v);
                setPriceOpen(false);
              }}
            >
              More filter {filtersOpen ? '▴' : '▾'}
            </button>
            <button type="submit" className="fyc-search-btn">
              Search
            </button>
          </div>

          {priceOpen ? (
            <div className="fyc-popover price">
              <div className="fyc-popover-row">
                <label>
                  Min Price: <strong>${minPrice}</strong>
                  <input
                    type="range"
                    min={5}
                    max={5000}
                    step={5}
                    value={minPrice}
                    onChange={(e) =>
                      setMinPrice(Math.min(Number(e.target.value), maxPrice - 5))
                    }
                  />
                </label>
                <label>
                  Max Price: <strong>${maxPrice}</strong>
                  <input
                    type="range"
                    min={5}
                    max={5000}
                    step={5}
                    value={maxPrice}
                    onChange={(e) =>
                      setMaxPrice(Math.max(Number(e.target.value), minPrice + 5))
                    }
                  />
                </label>
              </div>
              <button type="button" className="fyc-apply" onClick={applyPrice}>
                Apply price
              </button>
            </div>
          ) : null}

          {filtersOpen ? (
            <div className="fyc-popover filters">
              <p className="fyc-filter-caption">Vehicle type</p>
              <div className="fyc-type-grid">
                {VEHICLE_TYPE_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`fyc-type-tile${selectedTypes.includes(t) ? ' selected' : ''}`}
                    onClick={() => toggleType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <label className="fyc-toggle-row">
                <input
                  type="checkbox"
                  checked={instantOnly}
                  onChange={(e) => setInstantOnly(e.target.checked)}
                />
                Book instantly
              </label>
              <button
                type="button"
                className="fyc-apply"
                onClick={() => setFiltersOpen(false)}
              >
                Apply
              </button>
            </div>
          ) : null}
        </form>

        {error ? <p className="fyc-banner-error">{error}</p> : null}

        <div className="fyc-content-wrapper">
          <div className="fyc-scroll-wrapper">
            {status === 'loading' ? (
              <p className="fyc-loading-message">Loading…</p>
            ) : null}
            {status === 'ok' && filtered.length === 0 ? (
              <p className="fyc-loading-message">
                No rides found. Try another city or filter.
              </p>
            ) : null}

            <div className="fyc-car-grid">
              {filtered.map((listing) => {
                const photo = listingPhotoUrl(listing);
                const state = currentSearchState();
                return (
                  <Link
                    key={listing.id}
                    to={`/find-your-car/${listing.id}`}
                    state={{ search: state, dates: state.dates }}
                    className="fyc-car-wrapper"
                  >
                    {photo ? (
                      <img src={photo} alt="" className="fyc-car-img" />
                    ) : (
                      <div className="fyc-car-img fyc-car-img--empty" />
                    )}
                    <div className="fyc-car-description">
                      <div className="fyc-title-type-price">
                        <div className="fyc-title-type">
                          <span className="fyc-card-title-text">
                            {listing.title}
                          </span>
                          {listing.vehicleType ? (
                            <span className="fyc-card-type">
                              {listing.vehicleType}
                            </span>
                          ) : null}
                        </div>
                        <div className="fyc-price-cad">
                          <span className="fyc-price">
                            ${listing.pricePerDay}
                          </span>
                          <span className="fyc-cad">CAD</span>
                        </div>
                      </div>
                      <div className="fyc-stars-trips">
                        <Stars rating={listing.hostRating ?? 0} />
                        <span className="fyc-trips">
                          {listing.hostTrips ?? 0} trips
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="fyc-map-wrapper">
            <MapPanel
              lat={mapLat}
              lng={mapLng}
              label={searchCity || searchQuery}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
