import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  addFavorite,
  listFavorites,
  removeFavorite,
} from '../api/favorites';
import { withAuthBackground } from '../auth/authModal';
import {
  listingPhotoUrl,
  searchListings,
  type ListingSummary,
} from '../api/listings';
import { ApiError } from '../api/http';
import { forwardGeocode, type ParsedPlace } from '../api/maps';
import { useAuth } from '../auth/AuthContext';
import { isGoogleMapsConfigured } from '../components/googleMaps';
import ListingsMap from '../components/ListingsMap';
import PlacesAutocomplete from '../components/PlacesAutocomplete';
import PageMeta, { breadcrumbLd, SITE_ORIGIN } from '../components/PageMeta';
import SearchTimePicker, { snapSearchTime } from '../components/SearchTimePicker';
import SiteHeader from '../components/SiteHeader';
import type { SearchNavState } from '../types/search';
import { VEHICLE_COLOR_OPTIONS } from '../data/vehicleColors';

const VEHICLE_TYPE_OPTIONS = [
  { label: 'cars', value: 'Car', icon: '/fyc/vehicles/cars.png' },
  { label: 'SUVs', value: 'SUV', icon: '/fyc/vehicles/suv.png' },
  { label: 'PickUp', value: 'Pickup Truck', icon: '/fyc/vehicles/pickup.png' },
  { label: 'Busses', value: 'Bus', icon: '/fyc/vehicles/bus.png' },
  { label: 'Motorhomes', value: 'Motorhome', icon: '/fyc/vehicles/motorhome.png' },
  {
    label: 'Commercial Truck',
    value: 'Commercial Truck',
    icon: '/fyc/vehicles/truck.png',
  },
  { label: 'Van', value: 'Van', icon: '/fyc/vehicles/van.png' },
  {
    label: 'Scooter and Mopeds',
    value: 'Scooter',
    icon: '/fyc/vehicles/scooter.png',
  },
] as const;

const CAR_FEATURE_OPTIONS = [
  { label: 'Navigation', icon: '/fyc/features/feature1.png' },
  { label: 'Remote start', icon: '/fyc/features/feature2.png' },
  { label: 'Back up camera', icon: '/fyc/features/feature3.png' },
  { label: 'Audio input', icon: '/fyc/features/feature4.png' },
  { label: 'USB', icon: '/fyc/features/feature5.png' },
  { label: 'Bluetooth', icon: '/fyc/features/feature6.png' },
  { label: 'Pet friendly', icon: '/fyc/features/feature7.png' },
  { label: 'Convertible', icon: '/fyc/features/feature8.png' },
  { label: 'Sunroof', icon: '/fyc/features/feature9.png' },
  { label: 'Heated seats', icon: '/fyc/features/feature10.png' },
  { label: 'Snow tires', icon: '/fyc/features/feature11.png' },
  { label: 'All-wheel drive', icon: '/fyc/features/feature12.png' },
] as const;

const COLOR_OPTIONS = VEHICLE_COLOR_OPTIONS;
const YEAR_OPTIONS = Array.from({ length: 30 }, (_, i) =>
  String(new Date().getFullYear() - i),
);

const TRANSMISSION_OPTIONS = ['Automatic', 'Manual'] as const;
const FUEL_OPTIONS = ['Gasoline', 'Diesel', 'Electric', 'Hybrid'] as const;

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

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="fyc-fav-icon"
      width="21"
      height="19"
      viewBox="0 0 24 22"
      aria-hidden
    >
      <path
        d="M12 20.5S2.5 14.2 2.5 8.4C2.5 5.1 5 2.8 8.1 2.8c1.8 0 3.4.9 3.9 2.2.5-1.3 2.1-2.2 3.9-2.2 3.1 0 5.6 2.3 5.6 5.6 0 5.8-9.5 12.1-9.5 12.1z"
        fill={filled ? '#f34949' : 'none'}
        stroke={filled ? '#f34949' : '#fff'}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChipChevron({ open }: { open: boolean }) {
  return (
    <span
      className={`fyc-chip-chevron${open ? ' fyc-chip-chevron--up' : ''}`}
      aria-hidden
    />
  );
}

/** Zeplin Find Your Car_filter_full_v2 km control — smooth pointer drag */
function KmSlider({
  value,
  min = 0,
  max = 500,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef(value);
  const draggingRef = useRef(false);

  const pctOf = useCallback(
    (v: number) => `${((v - min) / (max - min)) * 100}%`,
    [min, max],
  );

  const paint = useCallback(
    (v: number) => {
      const pct = pctOf(v);
      if (fillRef.current) fillRef.current.style.width = pct;
      if (thumbRef.current) thumbRef.current.style.left = pct;
      if (labelRef.current) labelRef.current.textContent = `${v} km/day`;
    },
    [pctOf],
  );

  useEffect(() => {
    if (draggingRef.current) return;
    valueRef.current = value;
    paint(value);
  }, [value, paint]);

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return valueRef.current;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return valueRef.current;
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return Math.round(min + ratio * (max - min));
    },
    [min, max],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const next = valueFromClientX(e.clientX);
    valueRef.current = next;
    paint(next);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const next = valueFromClientX(e.clientX);
    valueRef.current = next;
    paint(next);
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    const next = valueFromClientX(e.clientX);
    valueRef.current = next;
    paint(next);
    onChange(next);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let next = valueRef.current;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next -= 1;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next += 1;
    else if (e.key === 'Home') next = min;
    else if (e.key === 'End') next = max;
    else if (e.key === 'PageDown') next -= 25;
    else if (e.key === 'PageUp') next += 25;
    else return;
    e.preventDefault();
    next = Math.min(max, Math.max(min, next));
    valueRef.current = next;
    paint(next);
    onChange(next);
  };

  const pct = pctOf(value);

  return (
    <div className="fyc-km-field">
      <div className="fyc-km-header">
        <span className="fyc-filter-caption">Kilometers</span>
        <span className="fyc-km-value" ref={labelRef}>
          {value} km/day
        </span>
      </div>
      <div
        ref={trackRef}
        className="fyc-km-slider"
        role="slider"
        tabIndex={0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label="Kilometers per day"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        <div className="fyc-km-track" aria-hidden>
          <div
            ref={fillRef}
            className="fyc-km-fill"
            style={{ width: pct }}
          />
        </div>
        <div
          ref={thumbRef}
          className="fyc-km-thumb"
          style={{ left: pct }}
          aria-hidden
        />
      </div>
    </div>
  );
}

function MapPanel({
  lat,
  lng,
  label,
  listings,
  searchState,
}: {
  lat: number | null;
  lng: number | null;
  label: string;
  listings: ListingSummary[];
  searchState: SearchNavState;
}) {
  const hasCoords =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng);

  if (isGoogleMapsConfigured()) {
    return (
      <ListingsMap
        listings={listings}
        center={hasCoords ? { lat, lng } : null}
        linkState={{ search: searchState, dates: searchState.dates }}
      />
    );
  }

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
  const { isAuthenticated } = useAuth();
  const navState = location.state as SearchNavState | null;

  // Router state only exists after an in-app search, so fall back to query
  // params. That keeps /find-your-car?city=… shareable and crawlable.
  const urlParams = new URLSearchParams(location.search);
  const urlCity = urlParams.get('city')?.trim() || '';
  const urlQuery = urlParams.get('q')?.trim() || '';
  const rawUrlLat = urlParams.get('latitude');
  const rawUrlLng = urlParams.get('longitude');
  const parsedUrlLat = rawUrlLat == null ? NaN : Number(rawUrlLat);
  const parsedUrlLng = rawUrlLng == null ? NaN : Number(rawUrlLng);
  const urlLatitude = Number.isFinite(parsedUrlLat) ? parsedUrlLat : null;
  const urlLongitude = Number.isFinite(parsedUrlLng) ? parsedUrlLng : null;

  const initialCity = navState?.location.city?.trim() || urlCity;
  const initialQuery = navState?.location.query?.trim() || urlQuery;

  const [addressText, setAddressText] = useState(
    () => navState?.location.query || initialQuery || initialCity || '',
  );
  const [place, setPlace] = useState<ParsedPlace | null>(() => {
    if (navState?.location) {
      return {
        query: navState.location.query,
        city: navState.location.city,
        country: navState.location.country || '',
        latitude: navState.location.latitude ?? null,
        longitude: navState.location.longitude ?? null,
      };
    }
    if (initialCity) {
      return {
        query: initialQuery || initialCity,
        city: initialCity,
        country: '',
        latitude: urlLatitude,
        longitude: urlLongitude,
      };
    }
    return null;
  });
  const [startDate, setStartDate] = useState(() =>
    toDateInput(navState?.dates?.start),
  );
  const [startTime, setStartTime] = useState(() =>
    snapSearchTime(toTimeInput(navState?.dates?.start)),
  );
  const [endDate, setEndDate] = useState(() =>
    toDateInput(navState?.dates?.end),
  );
  const [endTime, setEndTime] = useState(() =>
    snapSearchTime(toTimeInput(navState?.dates?.end)),
  );

  const [searchCity, setSearchCity] = useState(initialCity);
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);

  const [priceOpen, setPriceOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(
    () => navState?.openFilters === true,
  );
  const [minPrice, setMinPrice] = useState(1);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [appliedMin, setAppliedMin] = useState(1);
  const [appliedMax, setAppliedMax] = useState(1000);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    () => navState?.vehicleType ?? [],
  );
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [filterMake, setFilterMake] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterTransmission, setFilterTransmission] = useState('');
  const [filterFuel, setFilterFuel] = useState('');
  const [kmPerDay, setKmPerDay] = useState(250);
  const [instantOnly, setInstantOnly] = useState(false);
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [openFilterSelect, setOpenFilterSelect] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favBusyId, setFavBusyId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'trips' | 'rating'>('default');
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    if (
      !searchCity ||
      (typeof place?.latitude === 'number' &&
        typeof place?.longitude === 'number')
    ) {
      return;
    }

    // Shared URLs and manually entered city names may not carry Places
    // coordinates. Resolve the city once so they receive the same nearby-area
    // search as an autocomplete selection.
    let cancelled = false;
    forwardGeocode(searchCity)
      .then((result) => {
        if (cancelled) return;
        setPlace((current) => ({
          query: current?.query || searchQuery || searchCity,
          city: current?.city || result.city || searchCity,
          country: current?.country || result.country,
          latitude: result.latitude,
          longitude: result.longitude,
        }));
      })
      .catch(() => {
        // Keep exact city matching as a safe fallback if geocoding is
        // temporarily unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [
    searchCity,
    searchQuery,
    place?.latitude,
    place?.longitude,
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      setFavoriteIds(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await listFavorites();
        if (cancelled) return;
        setFavoriteIds(new Set(rows.map((r) => String(r.id))));
      } catch {
        if (!cancelled) setFavoriteIds(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    // With no city or query this browses every published listing, so the page
    // still renders for a visitor (or crawler) arriving straight from Google.
    let cancelled = false;
    (async () => {
      setStatus('loading');
      setError(null);
      try {
        const rows = await searchListings({
          city: searchCity || undefined,
          q: !searchCity && searchQuery ? searchQuery : undefined,
          latitude: place?.latitude,
          longitude: place?.longitude,
          radiusKm: 50,
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
  }, [
    searchCity,
    searchQuery,
    place?.latitude,
    place?.longitude,
    navigate,
  ]);

  const filtered = useMemo(() => {
    const rows = listings.filter((l) => {
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

    const sorted = [...rows];
    if (sortBy === 'price-asc') {
      sorted.sort((a, b) => a.pricePerDay - b.pricePerDay);
    } else if (sortBy === 'price-desc') {
      sorted.sort((a, b) => b.pricePerDay - a.pricePerDay);
    } else if (sortBy === 'trips') {
      sorted.sort((a, b) => (b.hostTrips ?? 0) - (a.hostTrips ?? 0));
    } else if (sortBy === 'rating') {
      sorted.sort((a, b) => (b.hostRating ?? 0) - (a.hostRating ?? 0));
    }
    return sorted;
  }, [listings, appliedMin, appliedMax, selectedTypes, instantOnly, sortBy]);

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

  const applyPrice = () => {
    setAppliedMin(minPrice);
    setAppliedMax(maxPrice);
    setPriceOpen(false);
  };

  const toggleType = (value: string) => {
    setSelectedTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    );
  };

  const toggleFeature = (name: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  };

  const toggleFilterSelect = (id: string) => {
    setOpenFilterSelect((cur) => (cur === id ? null : id));
  };

  const resetFilters = () => {
    setSelectedTypes([]);
    setSelectedFeatures([]);
    setFilterMake('');
    setFilterYear('');
    setFilterModel('');
    setFilterColor('');
    setFilterTransmission('');
    setFilterFuel('');
    setKmPerDay(250);
    setInstantOnly(false);
    setDeliveryOnly(false);
    setOpenFilterSelect(null);
  };

  const applyFilters = () => {
    setFiltersOpen(false);
    setOpenFilterSelect(null);
  };

  const selectedColor = COLOR_OPTIONS.find((c) => c.name === filterColor);

  const toggleFavorite = async (listing: ListingSummary) => {
    if (!isAuthenticated) {
      navigate('/login', {
        state: withAuthBackground(location, { from: '/find-your-car' }),
      });
      return;
    }
    const id = String(listing.id);
    const isFav = favoriteIds.has(id);
    setFavBusyId(id);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      if (isFav) await removeFavorite(id);
      else await addFavorite(id);
    } catch {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(id);
        else next.delete(id);
        return next;
      });
    } finally {
      setFavBusyId(null);
    }
  };

  const applyLocationSearch = (parsed?: ParsedPlace | null, text?: string) => {
    const city =
      parsed?.city?.trim() ||
      (text || addressText).split(',')[0]?.trim() ||
      (text || addressText).trim();
    if (!city) return;
    setError(null);
    setSearchCity(city);
    setSearchQuery(parsed?.query || text || addressText.trim());
    setPriceOpen(false);
    setFiltersOpen(false);
    setSortOpen(false);
    const nextParams = new URLSearchParams({ city });
    const latitude = parsed?.latitude ?? place?.latitude;
    const longitude = parsed?.longitude ?? place?.longitude;
    if (typeof latitude === 'number') {
      nextParams.set('latitude', String(latitude));
    }
    if (typeof longitude === 'number') {
      nextParams.set('longitude', String(longitude));
    }
    navigate(`/find-your-car?${nextParams.toString()}`, {
      replace: true,
      state: {
        ...currentSearchState(),
        location: {
          query: parsed?.query || text || addressText.trim() || city,
          city,
          country: parsed?.country || place?.country,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
        },
      },
    });
  };

  const locationField = (
    <div className="fyc-header-where">
      <span className="option-caption">Where?</span>
      <PlacesAutocomplete
        showLabel={false}
        value={addressText}
        onChange={(text) => {
          setAddressText(text);
          setPlace(null);
        }}
        onPlaceSelected={(parsed) => {
          setPlace(parsed);
          setAddressText(parsed.query);
          applyLocationSearch(parsed, parsed.query);
        }}
      />
    </div>
  );

  return (
    <div className="fyc-page">
      <PageMeta
        title={
          searchCity
            ? `Car Rentals in ${searchCity} | Rent Your Ride`
            : 'Find Your Ride | Rent Your Ride Car Rentals'
        }
        description={
          searchCity
            ? `Rent cars, vans, and SUVs from local hosts in ${searchCity}. Compare daily prices and book your ride on Rent Your Ride.`
            : 'Search Rent Your Ride listings near you — rent cars, vans, and SUVs from local hosts across Canada.'
        }
        canonical={
          searchCity
            ? `${SITE_ORIGIN}/find-your-car?city=${encodeURIComponent(searchCity)}`
            : `${SITE_ORIGIN}/find-your-car`
        }
        jsonLd={breadcrumbLd([
          { name: 'Find Your Ride', path: '/find-your-car' },
        ])}
      />
      <SiteHeader afterLogo={locationField} />

      <div className="find-your-car-wrapper">
        <div className="fyc-sort-bar">
          <div className="fyc-sort-field fyc-sort-field--dates">
            <span className="option-caption">Start</span>
            <div className="fyc-dt-row">
              <label className="fyc-dt-control">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="fyc-dt-chevron" aria-hidden />
              </label>
              <SearchTimePicker
                className="fyc-dt-control"
                value={startTime}
                onChange={setStartTime}
                aria-label="Start time"
              />
            </div>
          </div>

          <div className="fyc-sort-field fyc-sort-field--dates">
            <span className="option-caption">End</span>
            <div className="fyc-dt-row">
              <label className="fyc-dt-control">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <span className="fyc-dt-chevron" aria-hidden />
              </label>
              <SearchTimePicker
                className="fyc-dt-control"
                value={endTime}
                onChange={setEndTime}
                aria-label="End time"
              />
            </div>
          </div>

          <div className="fyc-filter-btns">
            <div className="fyc-sort-wrap">
              <button
                type="button"
                className={`fyc-chip${sortOpen ? ' active' : ''}`}
                onClick={() => {
                  setSortOpen((v) => !v);
                  setPriceOpen(false);
                  setFiltersOpen(false);
                  setOpenFilterSelect(null);
                }}
              >
                <span>Sort by</span>
                <ChipChevron open={sortOpen} />
              </button>
              {sortOpen ? (
                <div className="fyc-popover sort">
                  {(
                    [
                      ['default', 'Default'],
                      ['price-asc', 'Price: low to high'],
                      ['price-desc', 'Price: high to low'],
                      ['trips', 'Most trips'],
                      ['rating', 'Highest rated'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`fyc-sort-option${sortBy === value ? ' selected' : ''}`}
                      onClick={() => {
                        setSortBy(value);
                        setSortOpen(false);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className={`fyc-chip${priceOpen ? ' active' : ''}`}
              onClick={() => {
                setPriceOpen((v) => !v);
                setFiltersOpen(false);
                setSortOpen(false);
                setOpenFilterSelect(null);
              }}
            >
              <span>Price</span>
              <ChipChevron open={priceOpen} />
            </button>
            <button
              type="button"
              className={`fyc-chip more${filtersOpen ? ' active' : ''}`}
              onClick={() => {
                setFiltersOpen((v) => !v);
                setPriceOpen(false);
                setSortOpen(false);
                setOpenFilterSelect(null);
              }}
            >
              <span>More filter</span>
              <ChipChevron open={filtersOpen} />
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
              <div className="fyc-filters-caret" aria-hidden />
              <button
                type="button"
                className="fyc-filters-close"
                aria-label="Close filters"
                onClick={() => {
                  setFiltersOpen(false);
                  setOpenFilterSelect(null);
                }}
              >
                <span />
                <span />
              </button>

              <div className="fyc-filters-cols">
                <div className="fyc-filters-col">
                  <div
                    className={`fyc-filter-field fyc-filter-field--panel${openFilterSelect === 'vehicleType' ? ' is-open' : ''}`}
                  >
                    <span className="fyc-filter-caption">Vehicle type</span>
                    <div className="fyc-filter-panel">
                      <button
                        type="button"
                        className="fyc-filter-select fyc-filter-select--panel"
                        onClick={() => toggleFilterSelect('vehicleType')}
                      >
                        <span>
                          {selectedTypes.length
                            ? VEHICLE_TYPE_OPTIONS.filter((t) =>
                                selectedTypes.includes(t.value),
                              )
                                .map((t) => t.label)
                                .join(', ')
                            : 'Select'}
                        </span>
                        <ChipChevron open={openFilterSelect === 'vehicleType'} />
                      </button>
                      {openFilterSelect === 'vehicleType' ? (
                        <div className="fyc-icon-tile-grid">
                          {VEHICLE_TYPE_OPTIONS.map((t) => (
                            <button
                              key={t.value}
                              type="button"
                              className={`fyc-icon-tile${selectedTypes.includes(t.value) ? ' selected' : ''}`}
                              onClick={() => toggleType(t.value)}
                            >
                              <img src={t.icon} alt="" />
                              <span>{t.label}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="fyc-filter-pair">
                    <div className="fyc-filter-field">
                      <span className="fyc-filter-caption">Make</span>
                      <button
                        type="button"
                        className="fyc-filter-select"
                        onClick={() => toggleFilterSelect('make')}
                      >
                        <span>{filterMake || 'Select'}</span>
                        <ChipChevron open={openFilterSelect === 'make'} />
                      </button>
                      {openFilterSelect === 'make' ? (
                        <div className="fyc-filter-dropdown">
                          <button
                            type="button"
                            className="fyc-filter-option"
                            onClick={() => {
                              setFilterMake('');
                              setOpenFilterSelect(null);
                            }}
                          >
                            Any
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <div className="fyc-filter-field">
                      <span className="fyc-filter-caption">Car year</span>
                      <button
                        type="button"
                        className="fyc-filter-select"
                        onClick={() => toggleFilterSelect('year')}
                      >
                        <span>{filterYear || 'Select'}</span>
                        <ChipChevron open={openFilterSelect === 'year'} />
                      </button>
                      {openFilterSelect === 'year' ? (
                        <div className="fyc-filter-dropdown">
                          {YEAR_OPTIONS.map((y) => (
                            <button
                              key={y}
                              type="button"
                              className={`fyc-filter-option${filterYear === y ? ' selected' : ''}`}
                              onClick={() => {
                                setFilterYear(y);
                                setOpenFilterSelect(null);
                              }}
                            >
                              {y}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="fyc-filter-field">
                    <span className="fyc-filter-caption">Color</span>
                    <button
                      type="button"
                      className="fyc-filter-select"
                      onClick={() => toggleFilterSelect('color')}
                    >
                      <span className="fyc-color-value">
                        {selectedColor ? (
                          <>
                            <span
                              className="fyc-color-swatch"
                              style={{ background: selectedColor.hex }}
                            />
                            {selectedColor.name}
                          </>
                        ) : (
                          'Select'
                        )}
                      </span>
                      <ChipChevron open={openFilterSelect === 'color'} />
                    </button>
                    {openFilterSelect === 'color' ? (
                      <div className="fyc-filter-dropdown">
                        {COLOR_OPTIONS.map((c) => (
                          <button
                            key={c.name}
                            type="button"
                            className={`fyc-filter-option fyc-color-value${filterColor === c.name ? ' selected' : ''}`}
                            onClick={() => {
                              setFilterColor(c.name);
                              setOpenFilterSelect(null);
                            }}
                          >
                            <span
                              className="fyc-color-swatch"
                              style={{ background: c.hex }}
                            />
                            {c.name}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="fyc-filter-field">
                    <span className="fyc-filter-caption">Fuel type</span>
                    <button
                      type="button"
                      className="fyc-filter-select"
                      onClick={() => toggleFilterSelect('fuel')}
                    >
                      <span>{filterFuel || 'Select'}</span>
                      <ChipChevron open={openFilterSelect === 'fuel'} />
                    </button>
                    {openFilterSelect === 'fuel' ? (
                      <div className="fyc-filter-dropdown">
                        {FUEL_OPTIONS.map((f) => (
                          <button
                            key={f}
                            type="button"
                            className={`fyc-filter-option${filterFuel === f ? ' selected' : ''}`}
                            onClick={() => {
                              setFilterFuel(f);
                              setOpenFilterSelect(null);
                            }}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="fyc-filters-col">
                  <div
                    className={`fyc-filter-field fyc-filter-field--panel${openFilterSelect === 'features' ? ' is-open' : ''}`}
                  >
                    <span className="fyc-filter-caption">Car features</span>
                    <div className="fyc-filter-panel">
                      <button
                        type="button"
                        className="fyc-filter-select fyc-filter-select--panel"
                        onClick={() => toggleFilterSelect('features')}
                      >
                        <span>
                          {selectedFeatures.length
                            ? `${selectedFeatures.length} selected`
                            : 'Select'}
                        </span>
                        <ChipChevron open={openFilterSelect === 'features'} />
                      </button>
                      {openFilterSelect === 'features' ? (
                        <div className="fyc-icon-tile-grid">
                          {CAR_FEATURE_OPTIONS.map((f) => (
                            <button
                              key={f.label}
                              type="button"
                              className={`fyc-icon-tile${selectedFeatures.includes(f.label) ? ' selected' : ''}`}
                              onClick={() => toggleFeature(f.label)}
                            >
                              <img src={f.icon} alt="" />
                              <span>{f.label}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="fyc-filter-field">
                    <span className="fyc-filter-caption">Model</span>
                    <button
                      type="button"
                      className="fyc-filter-select"
                      onClick={() => toggleFilterSelect('model')}
                    >
                      <span>{filterModel || 'Select'}</span>
                      <ChipChevron open={openFilterSelect === 'model'} />
                    </button>
                    {openFilterSelect === 'model' ? (
                      <div className="fyc-filter-dropdown">
                        <button
                          type="button"
                          className="fyc-filter-option"
                          onClick={() => {
                            setFilterModel('');
                            setOpenFilterSelect(null);
                          }}
                        >
                          Any
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="fyc-filter-field">
                    <span className="fyc-filter-caption">
                      Vehicle transmission
                    </span>
                    <button
                      type="button"
                      className="fyc-filter-select"
                      onClick={() => toggleFilterSelect('transmission')}
                    >
                      <span>{filterTransmission || 'Select'}</span>
                      <ChipChevron
                        open={openFilterSelect === 'transmission'}
                      />
                    </button>
                    {openFilterSelect === 'transmission' ? (
                      <div className="fyc-filter-dropdown">
                        {TRANSMISSION_OPTIONS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={`fyc-filter-option${filterTransmission === t ? ' selected' : ''}`}
                            onClick={() => {
                              setFilterTransmission(t);
                              setOpenFilterSelect(null);
                            }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <KmSlider value={kmPerDay} onChange={setKmPerDay} />
                </div>
              </div>

              <div className="fyc-filters-footer">
                <div className="fyc-filters-toggles">
                  <label className="fyc-switch">
                    <input
                      type="checkbox"
                      checked={instantOnly}
                      onChange={(e) => setInstantOnly(e.target.checked)}
                    />
                    <span className="fyc-switch-ui" aria-hidden />
                    <span>Book instantly</span>
                  </label>
                  <label className="fyc-switch">
                    <input
                      type="checkbox"
                      checked={deliveryOnly}
                      onChange={(e) => setDeliveryOnly(e.target.checked)}
                    />
                    <span className="fyc-switch-ui" aria-hidden />
                    <span>Delivery</span>
                  </label>
                </div>
                <div className="fyc-filters-actions">
                  <button
                    type="button"
                    className="fyc-reset"
                    onClick={resetFilters}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="fyc-apply"
                    onClick={applyFilters}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {error ? <p className="fyc-banner-error">{error}</p> : null}

        <div className="fyc-content-wrapper">
          <div className="fyc-scroll-wrapper">
            <h1 className="fyc-results-heading">
              {searchCity
                ? `Car rentals in ${searchCity}`
                : 'Find your ride'}
            </h1>
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
                const isFav = favoriteIds.has(String(listing.id));
                return (
                  <article key={listing.id} className="fyc-car-wrapper">
                    <div className="fyc-car-img-wrap">
                      <Link
                        to={`/find-your-car/${listing.id}`}
                        state={{ search: state, dates: state.dates }}
                        className="fyc-car-img-link"
                      >
                        {photo ? (
                          <img src={photo} alt="" className="fyc-car-img" />
                        ) : (
                          <div className="fyc-car-img fyc-car-img--empty" />
                        )}
                      </Link>
                      <button
                        type="button"
                        className={`fyc-fav${isFav ? ' fyc-fav--on' : ''}`}
                        aria-label={
                          isFav ? 'Remove from favourites' : 'Add to favourites'
                        }
                        aria-pressed={isFav}
                        disabled={favBusyId === String(listing.id)}
                        onClick={() => void toggleFavorite(listing)}
                      >
                        <HeartIcon filled={isFav} />
                      </button>
                    </div>
                    <Link
                      to={`/find-your-car/${listing.id}`}
                      state={{ search: state, dates: state.dates }}
                      className="fyc-car-description"
                    >
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
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="fyc-map-wrapper">
            <MapPanel
              lat={mapLat}
              lng={mapLng}
              label={searchCity || searchQuery}
              listings={filtered}
              searchState={currentSearchState()}
            />
            <div className="fyc-map-fade fyc-map-fade--top" aria-hidden />
            <div className="fyc-map-fade fyc-map-fade--bottom" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}
