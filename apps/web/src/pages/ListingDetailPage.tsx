import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  CAR_FEATURE_ICONS,
  CAR_FEATURE_LABELS,
  getListing,
  listingMediaItems,
  type ListingDetail,
} from '../api/listings';
import { addFavorite, listFavorites, removeFavorite } from '../api/favorites';
import { ApiError } from '../api/http';
import { formatLocationLabel, reverseGeocode } from '../api/maps';
import { useAuth } from '../auth/AuthContext';
import { withAuthBackground } from '../auth/authModal';
import { isGoogleMapsConfigured } from '../components/googleMaps';
import ListingLocationMap from '../components/ListingLocationMap';
import PageMeta, { SITE_ORIGIN } from '../components/PageMeta';
import PhotoLightbox from '../components/PhotoLightbox';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import SearchTimePicker, { snapSearchTime } from '../components/SearchTimePicker';
import BookingCalendarModal from '../components/BookingCalendarModal';
import type { SearchNavState, SearchTripDates } from '../types/search';
import {
  listingToBlockedCalendarData,
  tripOverlapsBlocked,
} from '../utils/listingAvailability';
import { sanitizeHostBioForDisplay } from '../utils/hostBioDisplay';
import {
  formatListingTripLabel,
  formatNoReviewsLabel,
  getListingDisplayRating,
  listingHasGuestReviews,
} from '../utils/listingRating';

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

function Stars({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(rating || 0)));
  return (
    <span className="car-stars" aria-label={`${filled} of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`car-star${i < filled ? ' car-star--on' : ''}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path d="M12 2.5l2.9 6.1 6.7.7-5 4.6 1.4 6.6L12 17.8 5.99 20.5 7.4 13.9 2.4 9.3l6.7-.7L12 2.5z" />
        </svg>
      ))}
    </span>
  );
}

function TripChevron() {
  return <span className="car-trip-chevron" aria-hidden />;
}

/** Same glyphs and colours as the app's VehicleDetailScreen hero buttons. */
const APP_HEART_COLOR = 'rgb(255, 178, 20)';

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s-6.7-4.35-9.33-7.5C.5 10.85 1.1 7.2 3.9 5.55 5.7 4.5 8 4.85 9.5 6.4L12 9l2.5-2.6c1.5-1.55 3.8-1.9 5.6-.85 2.8 1.65 3.4 5.3 1.23 7.95C18.7 16.65 12 21 12 21z"
        fill={filled ? APP_HEART_COLOR : 'transparent'}
        stroke={APP_HEART_COLOR}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v11M8 7l4-4 4 4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L11.6 6M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.6-1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** execCommand must run synchronously inside the click; the async Clipboard API is the fallback. */
async function copyText(text: string): Promise<boolean> {
  const active = document.activeElement as HTMLElement | null;
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    active?.focus();
    if (ok) return true;
  } catch {
    active?.focus();
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* both unavailable */
  }
  return false;
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [hostBioOpen, setHostBioOpen] = useState(false);

  const [startDate, setStartDate] = useState(() =>
    toDateInput(navState.dates?.start),
  );
  const [startTime, setStartTime] = useState(
    () => snapSearchTime(toTimeInput(navState.dates?.start) || '10:00'),
  );
  const [endDate, setEndDate] = useState(() => toDateInput(navState.dates?.end));
  const [endTime, setEndTime] = useState(
    () => snapSearchTime(toTimeInput(navState.dates?.end) || '10:00'),
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pickupDisplay, setPickupDisplay] = useState('—');
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!shareMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!shareMenuRef.current?.contains(e.target as Node)) setShareMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShareMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [shareMenuOpen]);
  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    if (!isAuthenticated || !listingId) {
      setIsFavorite(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await listFavorites();
        if (!cancelled) setIsFavorite(rows.some((r) => String(r.id) === listingId));
      } catch {
        if (!cancelled) setIsFavorite(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, listingId]);

  useEffect(() => {
    if (!shareNotice) return;
    const ms = shareNotice.startsWith('Copy this link') ? 15000 : 2500;
    const t = window.setTimeout(() => setShareNotice(null), ms);
    return () => window.clearTimeout(t);
  }, [shareNotice]);

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

  useEffect(() => {
    if (!listing) {
      setPickupDisplay('—');
      return;
    }

    const raw = (listing.pickupAddress || '').replace(/^,\s*/, '').trim();
    setPickupDisplay(
      formatLocationLabel({
        fallback: raw || listing.city || '—',
        city: listing.city,
      }),
    );

    const lat = listing.latitude;
    const lng = listing.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;

    let cancelled = false;
    (async () => {
      try {
        const geo = await reverseGeocode(lat, lng);
        if (cancelled) return;
        setPickupDisplay(
          formatLocationLabel({
            formatted: geo.formatted,
            city: geo.city || listing.city,
            region: geo.region,
            postalCode: geo.postalCode,
            country: geo.country,
            fallback: raw || listing.city,
          }),
        );
      } catch {
        /* keep fallback */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listing]);

  const media = useMemo(
    () => (listing ? listingMediaItems(listing) : []),
    [listing],
  );
  const mainMedia = media[photoIndex] || media[0] || null;

  const features = useMemo(() => {
    const keys = listing?.carFeatures ?? [];
    return keys
      .map((key) => ({
        key,
        label:
          CAR_FEATURE_LABELS[key] ||
          key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
        icon: CAR_FEATURE_ICONS[key] || null,
      }))
      .filter((f) => f.label);
  }, [listing]);

  const featureSummary = useMemo(
    () => features.slice(0, 3).map((f) => f.label).join(', '),
    [features],
  );

  const vehicleMeta = useMemo(() => {
    const vd = listing?.vehicleData;
    const year = vd?.year ? String(vd.year) : '';
    const transmission = vd?.transmission ? String(vd.transmission) : '';
    const fuel = vd?.fuelType ? String(vd.fuelType) : '';
    return [year, transmission, fuel].filter(Boolean);
  }, [listing]);

  const make = listing?.vehicleData?.make?.trim() || '';
  const vehicleType = listing?.vehicleType?.trim() || 'Cars';
  const kmOverage = listing?.extras?.kmOverageFee;

  const hostBio = sanitizeHostBioForDisplay(listing?.hostBio);

  const blockedCalendar = useMemo(
    () => (listing ? listingToBlockedCalendarData(listing) : null),
    [listing],
  );

  const initialCalStart = useMemo(() => {
    const d = combineLocal(startDate, startTime);
    return d;
  }, [startDate, startTime]);

  const initialCalEnd = useMemo(() => {
    const d = combineLocal(endDate, endTime);
    return d;
  }, [endDate, endTime]);

  const onCheckout = () => {
    const start = combineLocal(startDate, startTime);
    const end = combineLocal(endDate, endTime);
    if (!start || !end || end <= start) {
      setError('Choose a valid start and end for your trip.');
      return;
    }
    if (tripOverlapsBlocked(start.getTime(), end.getTime(), blockedCalendar)) {
      setError(
        'Those dates are blocked by the host for this vehicle. Please choose different dates.',
      );
      return;
    }

    const dates: SearchTripDates = {
      start: start.toISOString(),
      end: end.toISOString(),
    };

    if (!isAuthenticated) {
      navigate('/login', {
        state: withAuthBackground(location, {
          from: `/find-your-car/${listingId}/checkout`,
          checkout: { search: navState.search, dates, listing },
        }),
      });
      return;
    }

    navigate(`/find-your-car/${listingId}/checkout`, {
      state: { search: navState.search, dates, listing },
    });
  };

  const shareUrl = `${window.location.origin}/find-your-car/${encodeURIComponent(listingId)}`;

  const onCopyLink = async () => {
    setShareMenuOpen(false);
    const ok = await copyText(shareUrl);
    setShareNotice(ok ? 'Link copied' : `Copy this link: ${shareUrl}`);
  };

  const onNativeShare = async () => {
    setShareMenuOpen(false);
    if (!listing) return;
    try {
      await navigator.share({
        title: listing.title,
        text: `Check out ${listing.title} on RentYourRide`,
        url: shareUrl,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      await onCopyLink();
    }
  };

  const onToggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/login', {
        state: withAuthBackground(location, { from: `/find-your-car/${listingId}` }),
      });
      return;
    }
    const wasFavorite = isFavorite;
    setFavoriteBusy(true);
    setIsFavorite(!wasFavorite);
    try {
      if (wasFavorite) await removeFavorite(listingId);
      else await addFavorite(listingId);
    } catch {
      setIsFavorite(wasFavorite);
      setShareNotice('Could not update favourites');
    } finally {
      setFavoriteBusy(false);
    }
  };

  const backToListings = () => {
    if (navState.search) {
      navigate('/find-your-car', { state: navState.search });
    } else {
      navigate(-1);
    }
  };

  const seo = useMemo(() => {
    if (!listing) return null;

    const canonical = `${SITE_ORIGIN}/find-your-car/${listingId}`;
    const where = listing.city?.trim();
    const price = formatMoney(listing.pricePerDay);
    const title = [
      `Rent a ${listing.title}`,
      where ? `in ${where}` : '',
      '| Rent Your Ride',
    ]
      .filter(Boolean)
      .join(' ');

    const description = [
      `Rent this ${listing.title}`,
      where ? `in ${where}` : '',
      `from ${price}/day on Rent Your Ride.`,
      featureSummary ? `Features include ${featureSummary}.` : '',
      'Book directly with a local host.',
    ]
      .filter(Boolean)
      .join(' ');

    const vd = listing.vehicleData ?? {};
    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: listing.title,
      description: listing.description || description,
      url: canonical,
      ...(media.length
        ? {
            image: media
              .filter((m) => m.type === 'image')
              .map((m) => m.url)
              .concat(
                media.filter((m) => m.type === 'video').map((m) => m.url),
              ),
          }
        : {}),
      ...(vd.make ? { brand: { '@type': 'Brand', name: vd.make } } : {}),
      ...(vd.model ? { model: String(vd.model) } : {}),
      category: `${vehicleType} rental`,
      offers: {
        '@type': 'Offer',
        price: listing.pricePerDay,
        priceCurrency: 'CAD',
        availability: 'https://schema.org/InStock',
        url: canonical,
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: listing.pricePerDay,
          priceCurrency: 'CAD',
          unitCode: 'DAY',
        },
      },
    };

    if (listing.hostRating > 0 && listing.guestReviews.length > 0) {
      jsonLd.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: listing.hostRating,
        reviewCount: listing.guestReviews.length,
      };
    }

    return {
      title,
      description,
      canonical,
      image: media.find((m) => m.type === 'image')?.url || media[0]?.url,
      jsonLd: [
        jsonLd,
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { name: 'Home', item: `${SITE_ORIGIN}/` },
            { name: 'Find Your Ride', item: `${SITE_ORIGIN}/find-your-car` },
            { name: listing.title, item: canonical },
          ].map((crumb, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: crumb.name,
            item: crumb.item,
          })),
        },
      ],
    };
  }, [listing, listingId, media, featureSummary, vehicleType]);

  return (
    <div className="car-page">
      {seo ? (
        <PageMeta
          title={seo.title}
          description={seo.description}
          canonical={seo.canonical}
          image={seo.image}
          jsonLd={seo.jsonLd}
        />
      ) : (
        <PageMeta title="Find Your Ride | Rent Your Ride" noindex />
      )}
      <SiteHeader />

      <main className="car-screen-wrapper">
        <div className="caption-button-row">
          <h1 className="car-page-caption">Find Your Ride</h1>
          <button type="button" className="go-back" onClick={backToListings}>
            <img src="/return-arrow.png" alt="" className="back-img" />
            Back to listing
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
          <>
            <nav className="car-route" aria-label="Breadcrumb">
              <Link to="/find-your-car" className="car-route-link">
                Find my ride
              </Link>
              <span className="car-route-chevron" aria-hidden />
              <span className="car-route-text">{vehicleType}</span>
              {make ? (
                <>
                  <span className="car-route-chevron" aria-hidden />
                  <span className="car-route-text">{make}</span>
                </>
              ) : null}
              <span className="car-route-chevron" aria-hidden />
              <span className="car-route-text car-route-text--current">
                {listing.title}
              </span>
            </nav>

            <div className="car-details-wrapper">
              <div className="left-details-column">
                <div className="photo-wrapper">
                  <div className="main-photo-frame">
                    <div className="car-chrome">
                      <div className="car-share" ref={shareMenuRef}>
                        <button
                          type="button"
                          className="car-chrome-btn"
                          onClick={() => setShareMenuOpen((open) => !open)}
                          aria-label="Share"
                          aria-haspopup="menu"
                          aria-expanded={shareMenuOpen}
                        >
                          <ShareIcon />
                        </button>
                        {shareMenuOpen ? (
                          <div className="car-share-menu" role="menu">
                            {canNativeShare ? (
                              <button
                                type="button"
                                role="menuitem"
                                className="car-share-item"
                                onClick={() => void onNativeShare()}
                              >
                                <ShareIcon />
                                Share via…
                              </button>
                            ) : null}
                            <button
                              type="button"
                              role="menuitem"
                              className="car-share-item"
                              onClick={() => void onCopyLink()}
                            >
                              <LinkIcon />
                              Copy link
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="car-chrome-btn"
                        onClick={() => void onToggleFavorite()}
                        disabled={favoriteBusy}
                        aria-pressed={isFavorite}
                        aria-label={isFavorite ? 'Remove favourite' : 'Add favourite'}
                      >
                        <HeartIcon filled={isFavorite} />
                      </button>
                      {shareNotice ? (
                        <span className="car-chrome-notice" role="status" aria-live="polite">
                          {shareNotice}
                        </span>
                      ) : null}
                    </div>
                    {mainMedia ? (
                      <button
                        type="button"
                        className="main-photo-button"
                        onClick={() => setLightboxOpen(true)}
                        aria-label={
                          mainMedia.type === 'video'
                            ? `Play ${listing.title} video`
                            : `View ${listing.title} photos`
                        }
                      >
                        {mainMedia.type === 'video' ? (
                          <video
                            key={mainMedia.url}
                            className="main-photo main-photo-video"
                            src={mainMedia.url}
                            muted
                            playsInline
                            preload="metadata"
                            controls={false}
                          />
                        ) : (
                          <img
                            src={mainMedia.url}
                            alt={listing.title}
                            className="main-photo"
                          />
                        )}
                        {mainMedia.type === 'video' ? (
                          <span className="main-photo-play" aria-hidden>
                            ▶
                          </span>
                        ) : (
                          <span className="main-photo-zoom" aria-hidden>
                            <svg viewBox="0 0 24 24">
                              <circle
                                cx="11"
                                cy="11"
                                r="6.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              />
                              <path
                                d="M11 8.5v5M8.5 11h5M15.8 15.8 20 20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </span>
                        )}
                      </button>
                    ) : (
                      <div className="main-photo main-photo--empty" />
                    )}
                  </div>
                  {media.length > 1 ? (
                    <div className="other-photos">
                      {media.map((item, i) => (
                        <button
                          key={item.url + i}
                          type="button"
                          className={`car-photo${i === photoIndex ? ' active' : ''}${
                            item.type === 'video' ? ' car-photo--video' : ''
                          }`}
                          onClick={() => setPhotoIndex(i)}
                          aria-label={
                            item.type === 'video'
                              ? `Video ${i + 1}`
                              : `Photo ${i + 1}`
                          }
                        >
                          {item.type === 'video' ? (
                            <span className="car-photo-video-label">Video</span>
                          ) : (
                            <img src={item.url} alt="" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {lightboxOpen && media.length ? (
                    <PhotoLightbox
                      photos={media}
                      index={photoIndex}
                      title={listing.title}
                      onIndexChange={setPhotoIndex}
                      onClose={() => setLightboxOpen(false)}
                    />
                  ) : null}
                </div>

                <div className="title-stars">
                  <h2 className="car-title">{listing.title}</h2>
                  {listingHasGuestReviews(listing) ? (
                    <Stars rating={getListingDisplayRating(listing) ?? 0} />
                  ) : (
                    <span className="car-new-host">
                      {formatNoReviewsLabel(listing)}
                    </span>
                  )}
                  <span className="car-trips">
                    {formatListingTripLabel(listing)}
                  </span>
                </div>

                {featureSummary ? (
                  <p className="car-feature-summary">{featureSummary}</p>
                ) : null}

                {vehicleMeta.length ? (
                  <div className="car-meta-row">
                    {vehicleMeta.map((part, i) => (
                      <span key={part + i} className="car-meta-part">
                        {i > 0 ? <span className="car-meta-dot" aria-hidden /> : null}
                        {part}
                      </span>
                    ))}
                  </div>
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
                          {f.icon ? <img src={f.icon} alt="" /> : null}
                          <span>{f.label}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>

              <aside className="right-details-column">
                <h3 className="host-heading">Hosted by</h3>
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
                  <div className="host-information">
                    <span className="host-name">
                      {listing.hostName || 'Host'}
                    </span>
                    <span className="host-location">
                      {(listing.city || '').toUpperCase()}
                      {listing.city ? ', CANADA' : ''}
                    </span>
                    {listing.hostJoinedYear != null ? (
                      <span className="host-joined">
                        Joined in {listing.hostJoinedYear}
                      </span>
                    ) : null}
                  </div>
                </div>

                {hostBio ? (
                  <>
                    <p
                      className={`host-bio${hostBioOpen ? ' host-bio--open' : ''}`}
                    >
                      {hostBio}
                    </p>
                    <button
                      type="button"
                      className="host-more"
                      onClick={() => setHostBioOpen((open) => !open)}
                    >
                      {hostBioOpen ? 'Less' : 'More'}
                    </button>
                  </>
                ) : null}

                <div className="car-aside-border" />

                <div className="price-box">
                  <span className="price-amount">
                    {formatMoney(listing.pricePerDay)}
                  </span>
                  <span className="price-per">Per day</span>
                </div>

                <div className="trip-field">
                  <span className="trip-label">Start</span>
                  <div className="trip-inputs">
                    <button
                      type="button"
                      className="trip-control trip-control--date"
                      onClick={() => setCalendarOpen(true)}
                      aria-label="Choose start date"
                    >
                      <span>{startDate || 'Select date'}</span>
                      <TripChevron />
                    </button>
                    <SearchTimePicker
                      className="trip-control"
                      value={startTime}
                      onChange={setStartTime}
                      aria-label="Start time"
                    />
                  </div>
                </div>

                <div className="trip-field">
                  <span className="trip-label">End</span>
                  <div className="trip-inputs">
                    <button
                      type="button"
                      className="trip-control trip-control--date"
                      onClick={() => setCalendarOpen(true)}
                      aria-label="Choose end date"
                    >
                      <span>{endDate || 'Select date'}</span>
                      <TripChevron />
                    </button>
                    <SearchTimePicker
                      className="trip-control"
                      value={endTime}
                      onChange={setEndTime}
                      aria-label="End time"
                    />
                  </div>
                </div>

                <div className="trip-field">
                  <span className="trip-label">
                    Pickup & drop off location
                  </span>
                  <div className="pickup-row">
                    <p className="pickup-text">{pickupDisplay}</p>
                    <TripChevron />
                  </div>
                </div>

                <dl className="stats-list">
                  <div>
                    <dt>Kilometres Included</dt>
                    <dd>{listing.dailyKm || '—'}</dd>
                  </div>
                  <div>
                    <dt>Weekly Discount</dt>
                    <dd>{listing.weeklyDiscount || '—'}</dd>
                  </div>
                  <div>
                    <dt>Monthly Discount</dt>
                    <dd>{listing.monthlyDiscount || '—'}</dd>
                  </div>
                  <div>
                    <dt>Kilometres Overage Fee*</dt>
                    <dd>
                      {typeof kmOverage === 'number'
                        ? `$ ${kmOverage.toFixed(2)}/KM`
                        : '—'}
                    </dd>
                  </div>
                </dl>

                {error ? (
                  <p className="car-status car-status--error">{error}</p>
                ) : null}

                <button
                  type="button"
                  className="checkout-cta"
                  onClick={onCheckout}
                >
                  GO TO CHECKOUT
                </button>
              </aside>
            </div>

            {isGoogleMapsConfigured() &&
            typeof listing.latitude === 'number' &&
            typeof listing.longitude === 'number' ? (
              <ListingLocationMap
                latitude={listing.latitude}
                longitude={listing.longitude}
              />
            ) : null}
          </>
        ) : null}
      </main>

      <SiteFooter />

      <BookingCalendarModal
        open={calendarOpen}
        blocked={blockedCalendar}
        initialStart={initialCalStart}
        initialEnd={initialCalEnd}
        onClose={() => setCalendarOpen(false)}
        onConfirm={({ start, end }) => {
          setStartDate(toDateInput(start.toISOString()));
          setEndDate(toDateInput(end.toISOString()));
          setError(null);
          setCalendarOpen(false);
        }}
      />
    </div>
  );
}
