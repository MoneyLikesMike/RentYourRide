import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  CAR_FEATURE_LABELS,
  getListing,
  listingPhotoUrls,
  type ListingDetail,
} from '../api/listings';
import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthContext';
import SiteHeader from '../components/SiteHeader';
import type { SearchNavState, SearchTripDates } from '../types/search';

export type ListingDetailNavState = {
  search?: SearchNavState;
  dates?: SearchTripDates;
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(n);
}

function toDateInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function combineLocal(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export default function ListingDetailPage() {
  const { listingId = '' } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const navState = (location.state as ListingDetailNavState | null) ?? {};

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const [startDate, setStartDate] = useState(() =>
    toDateInput(navState.dates?.start),
  );
  const [startTime, setStartTime] = useState(() =>
    toTimeInput(navState.dates?.start) || '10:00',
  );
  const [endDate, setEndDate] = useState(() => toDateInput(navState.dates?.end));
  const [endTime, setEndTime] = useState(
    () => toTimeInput(navState.dates?.end) || '10:00',
  );

  useEffect(() => {
    if (!listingId) {
      navigate('/find-your-car', { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      setStatus('loading');
      setError(null);
      try {
        const data = await getListing(listingId);
        if (cancelled) return;
        setListing(data);
        setPhotoIndex(0);
        setStatus('ok');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Could not load listing',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listingId, navigate]);

  const photos = useMemo(
    () => (listing ? listingPhotoUrls(listing) : []),
    [listing],
  );
  const mainPhoto = photos[photoIndex] || photos[0] || null;

  const features = useMemo(() => {
    const keys = listing?.carFeatures ?? [];
    return keys
      .map((key) => ({
        key,
        label: CAR_FEATURE_LABELS[key] || key.replace(/([A-Z])/g, ' $1').toUpperCase(),
      }))
      .filter((f) => f.label);
  }, [listing]);

  const vehicleMeta = useMemo(() => {
    const vd = listing?.vehicleData;
    const year = vd?.year ? String(vd.year) : '';
    const transmission = vd?.transmission ? String(vd.transmission) : '';
    const fuel = vd?.fuelType ? String(vd.fuelType) : '';
    return [year, transmission, fuel, listing?.vehicleType].filter(Boolean);
  }, [listing]);

  const kmOverage = listing?.extras?.kmOverageFee;

  const onCheckout = () => {
    const start = combineLocal(startDate, startTime);
    const end = combineLocal(endDate, endTime);
    if (!start || !end || end <= start) {
      setError('Choose a valid start and end for your trip.');
      return;
    }

    const dates: SearchTripDates = {
      start: start.toISOString(),
      end: end.toISOString(),
    };

    if (!isAuthenticated) {
      navigate('/login', {
        state: {
          from: `/find-your-car/${listingId}/checkout`,
          checkout: { search: navState.search, dates, listing },
        },
      });
      return;
    }

    navigate(`/find-your-car/${listingId}/checkout`, {
      state: { search: navState.search, dates, listing },
    });
  };

  const backToListings = () => {
    if (navState.search) {
      navigate('/find-your-car', { state: navState.search });
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="car-page">
      <SiteHeader />

      <main className="car-screen-wrapper">
        <div className="caption-button-row">
          <h1 className="car-page-caption">Find Your Ride</h1>
          <button type="button" className="go-back" onClick={backToListings}>
            ← Back to listing
          </button>
        </div>
        <div className="car-border" />

        {status === 'loading' ? (
          <p className="car-status">Loading ride…</p>
        ) : null}
        {status === 'error' && !listing ? (
          <p className="car-status car-status--error">{error}</p>
        ) : null}

        {listing ? (
          <div className="car-details-wrapper">
            <div className="left-details-column">
              <div className="photo-wrapper">
                {mainPhoto ? (
                  <img
                    src={mainPhoto}
                    alt={listing.title}
                    className="main-photo"
                  />
                ) : (
                  <div className="main-photo main-photo--empty" />
                )}
                {photos.length > 1 ? (
                  <div className="other-photos">
                    {photos.map((url, i) => (
                      <button
                        key={url + i}
                        type="button"
                        className={`car-photo${i === photoIndex ? ' active' : ''}`}
                        onClick={() => setPhotoIndex(i)}
                      >
                        <img src={url} alt="" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="title-stars">
                <h2 className="car-title">{listing.title}</h2>
                <span className="car-trips">
                  ★ {listing.hostRating || '—'} · {listing.hostTrips} trips
                </span>
              </div>

              {vehicleMeta.length ? (
                <p className="car-meta-chips">{vehicleMeta.join(' · ')}</p>
              ) : null}

              {listing.description ? (
                <p className="car-description">{listing.description}</p>
              ) : null}

              {features.length > 0 ? (
                <section className="car-features">
                  <h3 className="car-features-header">Car features</h3>
                  <ul className="car-features-grid">
                    {features.map((f) => (
                      <li key={f.key} className="car-feature-tile">
                        {f.label}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            <aside className="right-details-column">
              <section className="host-block">
                <h3 className="host-label">Hosted by</h3>
                <div className="host-row">
                  {listing.hostPhotoUri ? (
                    <img
                      src={listing.hostPhotoUri}
                      alt=""
                      className="host-avatar"
                    />
                  ) : (
                    <div className="host-avatar host-avatar--empty" />
                  )}
                  <div>
                    <p className="host-name">{listing.hostName || 'Host'}</p>
                    <p className="host-city">
                      {(listing.city || '').toUpperCase()}
                      {listing.hostTrips != null
                        ? ` · ${listing.hostTrips} trips`
                        : ''}
                    </p>
                  </div>
                </div>
              </section>

              <section className="price-box">
                <span className="price-amount">
                  {formatMoney(listing.pricePerDay)}
                </span>
                <span className="price-per">Per day</span>
                {listing.instantBooking ? (
                  <span className="instant-badge">Instant book</span>
                ) : (
                  <span className="request-badge">Request to book</span>
                )}
              </section>

              <div className="trip-field">
                <span className="trip-label">Start</span>
                <div className="trip-inputs">
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

              <div className="trip-field">
                <span className="trip-label">End</span>
                <div className="trip-inputs">
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

              <div className="trip-field">
                <span className="trip-label">Pickup & drop off location</span>
                <p className="pickup-text">
                  {listing.pickupAddress?.replace(/^,\s*/, '') ||
                    listing.city ||
                    '—'}
                </p>
              </div>

              <dl className="stats-list">
                <div>
                  <dt>Kilometres included</dt>
                  <dd>{listing.dailyKm || '—'}</dd>
                </div>
                <div>
                  <dt>Weekly discount</dt>
                  <dd>{listing.weeklyDiscount || '—'}</dd>
                </div>
                <div>
                  <dt>Monthly discount</dt>
                  <dd>{listing.monthlyDiscount || '—'}</dd>
                </div>
                <div>
                  <dt>Kilometres overage fee*</dt>
                  <dd>
                    {typeof kmOverage === 'number'
                      ? `$${kmOverage}/KM`
                      : '—'}
                  </dd>
                </div>
                {listing.deliveryPrice > 0 ? (
                  <div>
                    <dt>Delivery</dt>
                    <dd>{formatMoney(listing.deliveryPrice)}</dd>
                  </div>
                ) : null}
              </dl>

              {error ? (
                <p className="car-status car-status--error">{error}</p>
              ) : null}

              <button
                type="button"
                className="checkout-cta"
                onClick={onCheckout}
              >
                Go to checkout
              </button>
            </aside>
          </div>
        ) : null}
      </main>
    </div>
  );
}
