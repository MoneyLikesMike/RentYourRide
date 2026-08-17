import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  createBooking,
  quoteBooking,
  type BookingQuote,
} from '../api/bookings';
import { ApiError } from '../api/http';
import {
  getListing,
  listingPhotoUrl,
  type ListingDetail,
} from '../api/listings';
import {
  formatLocationLabel,
  resolveBrowserCurrentLocation,
  reverseGeocode,
} from '../api/maps';
import {
  listPaymentMethods,
  type StripePaymentMethod,
} from '../api/payments';
import { useAuth } from '../auth/AuthContext';
import AddCardPanel from '../components/AddCardPanel';
import PlacesAutocomplete from '../components/PlacesAutocomplete';
import PageMeta from '../components/PageMeta';
import SiteHeader from '../components/SiteHeader';
import type { SearchNavState, SearchTripDates } from '../types/search';

export type CheckoutNavState = {
  search?: SearchNavState;
  dates?: SearchTripDates;
  listing?: ListingDetail;
};

const TRIP_FEE_DISCLOSURE =
  'This fee helps us keep the platform safe and reliable for you. This fee also helps us provide our around the 24/7 customer service for you!';

const EXTRA_ICONS: Record<string, string> = {
  unlimitedKm: '/checkout/road.png',
  kms: '/checkout/road.png',
  prepaidFuel: '/checkout/fuel.png',
  fuel: '/checkout/fuel.png',
  prepaidClean: '/checkout/cleanCar.png',
  clean: '/checkout/cleanCar.png',
  delivery: '/checkout/shorttrip.png',
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function ordinal(day: number): string {
  if (day >= 11 && day <= 13) return 'TH';
  switch (day % 10) {
    case 1:
      return 'ST';
    case 2:
      return 'ND';
    case 3:
      return 'RD';
    default:
      return 'TH';
  }
}

function formatCheckoutDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];
  const day = d.getDate();
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const mm = String(minutes).padStart(2, '0');
  return `${months[d.getMonth()]} ${day}${ordinal(day)}, ${d.getFullYear()} - ${hours}:${mm} ${ampm}`;
}

function formatTimeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

function brandLabel(brand?: string): string {
  if (!brand) return 'CARD';
  return brand.toUpperCase();
}

function Stars({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(rating || 0)));
  return (
    <span className="checkout-stars" aria-label={`${filled} of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`checkout-star${i < filled ? ' checkout-star--on' : ''}`}
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

function SectionChevron({ open }: { open: boolean }) {
  return (
    <span
      className={`checkout-chevron${open ? ' is-open' : ''}`}
      aria-hidden
    />
  );
}

export default function CheckoutPage() {
  const { listingId = '' } = useParams<{ listingId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const navState = (location.state as CheckoutNavState | null) ?? {};

  const dates = navState.dates;
  const search = navState.search;

  const [listing, setListing] = useState<ListingDetail | null>(
    navState.listing ?? null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingListing, setLoadingListing] = useState(!navState.listing);

  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [extraUnlimitedKm, setExtraUnlimitedKm] = useState(false);
  const [extraPrepaidFuel, setExtraPrepaidFuel] = useState(false);
  const [extraPrepaidClean, setExtraPrepaidClean] = useState(false);
  const [introMessage, setIntroMessage] = useState('');

  const [isExtras, setExtras] = useState(false);
  const [isMessage, setMessage] = useState(false);
  const [isPayment, setPayment] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [pickupDisplay, setPickupDisplay] = useState('Pickup location TBD');

  const [methods, setMethods] = useState<StripePaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [methodsLoading, setMethodsLoading] = useState(false);

  const [quote, setQuote] = useState<BookingQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(
    null,
  );
  const [confirmedInstant, setConfirmedInstant] = useState(false);

  const idempotencyKeyRef = useRef(
    `book_${listingId}_${dates?.start ?? ''}_${dates?.end ?? ''}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
  );
  const submittingRef = useRef(false);

  const bookingDates = useMemo(() => {
    if (!dates?.start || !dates?.end) return null;
    const start = new Date(dates.start).getTime();
    const end = new Date(dates.end).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    return {
      start,
      end,
      startTime: formatTimeLabel(dates.start),
      endTime: formatTimeLabel(dates.end),
    };
  }, [dates?.start, dates?.end]);

  const canDeliver = (listing?.deliveryPrice ?? 0) > 0;
  const pickupAddress =
    listing?.pickupAddress ||
    search?.location?.query ||
    search?.location?.city ||
    'Pickup location TBD';

  useEffect(() => {
    if (!listing) {
      setPickupDisplay('Pickup location TBD');
      return;
    }

    const raw = (listing.pickupAddress || '').replace(/^,\s*/, '').trim();
    const fallback = formatLocationLabel({
      fallback: raw || listing.city || 'Pickup location TBD',
      city: listing.city,
    });
    setPickupDisplay(fallback);

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

  useEffect(() => {
    if (!isAuthenticated || listing || !listingId) return;
    let cancelled = false;
    (async () => {
      setLoadingListing(true);
      setLoadError(null);
      try {
        const data = await getListing(listingId);
        if (!cancelled) setListing(data);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Could not load listing',
          );
        }
      } finally {
        if (!cancelled) setLoadingListing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, listing, listingId]);

  useEffect(() => {
    if (!isAuthenticated || !listing?.id || !bookingDates) return;
    let cancelled = false;
    (async () => {
      setQuoteError(null);
      try {
        const q = await quoteBooking({
          listingId: listing.id,
          bookingDates,
          extraUnlimitedKm,
          extraPrepaidFuel,
          extraPrepaidClean,
          deliveryEnabled: !!(deliveryEnabled && canDeliver),
        });
        if (!cancelled) setQuote(q);
      } catch (err) {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Could not quote trip',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    listing?.id,
    bookingDates,
    extraUnlimitedKm,
    extraPrepaidFuel,
    extraPrepaidClean,
    deliveryEnabled,
    canDeliver,
  ]);

  const refreshMethods = async (preferId?: string) => {
    setMethodsLoading(true);
    try {
      const list = await listPaymentMethods();
      setMethods(list);
      setSelectedMethodId((prev) => {
        if (preferId && list.some((m) => m.id === preferId)) return preferId;
        if (prev && list.some((m) => m.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch {
      setMethods([]);
    } finally {
      setMethodsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    void refreshMethods();
  }, [isAuthenticated]);

  const selectedMethod = useMemo(
    () => methods.find((m) => m.id === selectedMethodId) ?? null,
    [methods, selectedMethodId],
  );

  const photo = listing ? listingPhotoUrl(listing) : null;
  const vehicleTitle = [
    listing?.vehicleData?.make,
    listing?.vehicleData?.model,
  ]
    .filter(Boolean)
    .join(' ')
    .trim() || listing?.title || '';
  const hostBio = listing?.hostBio?.trim() || '';

  const onUseCurrentLocation = async () => {
    setLocating(true);
    setLocationError(null);
    try {
      const geo = await resolveBrowserCurrentLocation();
      setDeliveryAddress(
        (geo.formatted || '').trim() ||
          [geo.street, geo.city, geo.region, geo.postalCode, geo.country]
            .filter(Boolean)
            .join(', '),
      );
    } catch (err) {
      const geoErr = err as { code?: number; message?: string };
      const denied = typeof geoErr?.code === 'number' && geoErr.code === 1;
      setLocationError(
        denied
          ? 'Allow location access to use your current location.'
          : err instanceof Error
            ? err.message
            : 'Could not get your current location.',
      );
    } finally {
      setLocating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `/find-your-car/${listingId}/checkout`,
          checkout: { search, dates, listing },
        }}
      />
    );
  }

  if (!dates?.start || !dates?.end || !bookingDates) {
    return (
      <Navigate
        to={`/find-your-car/${listingId}`}
        replace
        state={{ search }}
      />
    );
  }

  const onSubmit = async () => {
    if (submittingRef.current || !listing || !quote || !selectedMethod) return;
    if (deliveryEnabled && canDeliver && !deliveryAddress.trim()) {
      setSubmitError('Enter a delivery address.');
      return;
    }
    if (!introMessage.trim()) {
      setMessage(true);
      setSubmitError('Please introduce yourself before booking.');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const extras = (quote.selectedExtras ?? []).map((e) => ({
        key: e.key,
        label: e.label,
        amount: e.amount,
      }));
      const guestName =
        [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
        user?.fullName ||
        'Guest';
      const pickupForBooking =
        pickupDisplay && pickupDisplay !== 'Pickup location TBD'
          ? pickupDisplay
          : pickupAddress;
      const dropAddr =
        deliveryEnabled && canDeliver && deliveryAddress.trim()
          ? deliveryAddress.trim()
          : pickupForBooking;

      const booking = await createBooking(
        {
          listingId: listing.id,
          listingSnapshot: {
            id: listing.id,
            title: listing.title,
            photos: listing.photos,
            pickupAddress: pickupForBooking,
            hostName: listing.hostName,
            hostPhotoUri: listing.hostPhotoUri,
            year: listing.vehicleData?.year,
            make: listing.vehicleData?.make,
            model: listing.vehicleData?.model,
            vehicleData: listing.vehicleData
              ? { ...listing.vehicleData }
              : undefined,
          },
          bookingDates,
          pickupAddress: pickupForBooking,
          dropoffAddress: dropAddr,
          deliveryEnabled: !!(deliveryEnabled && canDeliver),
          extras,
          introMessage: introMessage.trim(),
          pricing: { ...quote },
          selectedPaymentMethod: {
            id: selectedMethod.id,
            type: selectedMethod.type,
            brand: selectedMethod.brand,
            last4: selectedMethod.last4,
            funding: selectedMethod.funding,
          },
          instantBooking: listing.instantBooking === true,
          guestName,
        },
        idempotencyKeyRef.current,
      );

      setConfirmedBookingId(booking.id);
      setConfirmedInstant(
        booking.status === 'confirmed' || listing.instantBooking === true,
      );
    } catch (err) {
      submittingRef.current = false;
      setSubmitting(false);
      const body = err instanceof ApiError ? err.body : null;
      const payload =
        typeof body === 'object' &&
        body &&
        'message' in body &&
        typeof (body as { message: unknown }).message === 'object' &&
        (body as { message: unknown }).message
          ? (body as { message: Record<string, unknown> }).message
          : (body as Record<string, unknown> | null);
      const code =
        payload && typeof payload.code === 'string' ? payload.code : null;
      if (code === 'VERIFICATION_INCOMPLETE') {
        setSubmitError(
          'Complete email, phone, and license verification in your account before booking.',
        );
      } else {
        setSubmitError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Booking failed',
        );
      }
    }
  };

  if (confirmedBookingId) {
    return (
      <div className="checkout-page">
        <SiteHeader />
        <main className="checkout-wrapper">
          <div className="checkout-success">
            <h2>
              {confirmedInstant ? 'Booking confirmed' : 'Request sent'}
            </h2>
            <p>
              {confirmedInstant
                ? 'Your trip is confirmed. The host has been notified and payment is being processed.'
                : 'Your booking request was sent to the host. You’ll be notified when they respond.'}
            </p>
            <p className="checkout-fee-note">Booking ID: {confirmedBookingId}</p>
            <div className="checkout-success-actions">
              <Link to="/" className="checkout-primary-btn">
                Back home
              </Link>
              <Link
                to="/find-your-car"
                state={search}
                className="checkout-go-back"
              >
                Find another ride
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <PageMeta title="Checkout | Rent Your Ride" noindex />
      <SiteHeader />
      <main className="checkout-wrapper">
        <div className="checkout-caption-row">
          <h1 className="checkout-caption">Checkout</h1>
          <button
            type="button"
            className="checkout-go-back"
            onClick={() =>
              navigate(`/find-your-car/${listingId}`, {
                state: { search, dates },
              })
            }
          >
            <img
              src="/return-arrow.png"
              alt=""
              className="checkout-back-img"
            />
            Back to overview
          </button>
        </div>
        <div className="checkout-border" />

        {loadingListing ? (
          <p className="checkout-status">Loading checkout…</p>
        ) : null}
        {loadError ? <p className="checkout-error">{loadError}</p> : null}

        {listing ? (
          <div className="checkout-details-wrapper">
            <div className="checkout-left">
              <div className="checkout-location">
                <span className="checkout-green">
                  Pickup &amp; drop off location:
                </span>
                <span className="checkout-text">{pickupDisplay}</span>
              </div>

              <div className="checkout-dates">
                <div className="checkout-date">
                  <span className="checkout-green">Start</span>
                  <span className="checkout-text">
                    {formatCheckoutDateTime(dates.start)}
                  </span>
                </div>
                <div className="checkout-date">
                  <span className="checkout-green">End</span>
                  <span className="checkout-text">
                    {formatCheckoutDateTime(dates.end)}
                  </span>
                </div>
              </div>

              <div className="checkout-border" />

              {canDeliver ? (
                <>
                  <div className="checkout-toggle-row">
                    <span className="checkout-text">
                      Have the vehicle dropped off to you
                    </span>
                    <label className="checkout-switch">
                      <input
                        type="checkbox"
                        checked={deliveryEnabled}
                        onChange={(e) => setDeliveryEnabled(e.target.checked)}
                      />
                      <span className="checkout-switch-slider" />
                    </label>
                  </div>
                  {deliveryEnabled ? (
                    <div className="checkout-delivery-field">
                      <div className="checkout-delivery-where">
                        <PlacesAutocomplete
                          value={deliveryAddress}
                          onChange={(text) => {
                            setDeliveryAddress(text);
                            setLocationError(null);
                          }}
                          onPlaceSelected={(place) => {
                            setDeliveryAddress(
                              place.query ||
                                place.city ||
                                deliveryAddress,
                            );
                            setLocationError(null);
                          }}
                          placeholder="Enter city, airport or address"
                          showLabel
                        />
                      </div>
                      <button
                        type="button"
                        className="checkout-current-location"
                        onClick={() => void onUseCurrentLocation()}
                        disabled={locating}
                      >
                        <img
                          src="/current-location-pin.png"
                          alt=""
                          className="checkout-current-location-icon"
                        />
                        {locating ? 'Locating…' : 'Current location'}
                      </button>
                      {locationError ? (
                        <p className="checkout-error">{locationError}</p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="checkout-border" />
                </>
              ) : null}

              <div className="checkout-option">
                <button
                  type="button"
                  className="checkout-option-caption"
                  onClick={() => setExtras(!isExtras)}
                >
                  <span className="checkout-option-title">Extras</span>
                  <SectionChevron open={isExtras} />
                </button>
                {isExtras ? (
                  <div className="checkout-options">
                    <div className="checkout-toggle-item">
                      <span className="checkout-text uppercase">
                        Unlimited kms
                      </span>
                      <label className="checkout-switch">
                        <input
                          type="checkbox"
                          checked={extraUnlimitedKm}
                          onChange={(e) =>
                            setExtraUnlimitedKm(e.target.checked)
                          }
                        />
                        <span className="checkout-switch-slider" />
                      </label>
                    </div>
                    <div className="checkout-toggle-item">
                      <span className="checkout-text uppercase">
                        Pre paid fuel
                      </span>
                      <label className="checkout-switch">
                        <input
                          type="checkbox"
                          checked={extraPrepaidFuel}
                          onChange={(e) =>
                            setExtraPrepaidFuel(e.target.checked)
                          }
                        />
                        <span className="checkout-switch-slider" />
                      </label>
                    </div>
                    <div className="checkout-toggle-item">
                      <span className="checkout-text uppercase">
                        Pre paid clean
                      </span>
                      <label className="checkout-switch">
                        <input
                          type="checkbox"
                          checked={extraPrepaidClean}
                          onChange={(e) =>
                            setExtraPrepaidClean(e.target.checked)
                          }
                        />
                        <span className="checkout-switch-slider" />
                      </label>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="checkout-border" />

              <div className="checkout-option">
                <button
                  type="button"
                  className="checkout-option-caption"
                  onClick={() => setMessage(!isMessage)}
                >
                  <span className="checkout-option-title">Message</span>
                  <SectionChevron open={isMessage} />
                </button>
                {isMessage ? (
                  <div>
                    <span className="checkout-message-label">
                      Introduce yourself
                    </span>
                    <textarea
                      className={`checkout-message${
                        introMessage.trim() ? ' has-value' : ''
                      }`}
                      value={introMessage}
                      onChange={(e) => {
                        setIntroMessage(e.target.value);
                        if (e.target.value.trim()) {
                          setSubmitError((prev) =>
                            prev ===
                            'Please introduce yourself before booking.'
                              ? null
                              : prev,
                          );
                        }
                      }}
                      placeholder="Say hello to your host…"
                      maxLength={2000}
                      required
                    />
                  </div>
                ) : null}
              </div>

              <div className="checkout-border" />

              <div className="checkout-option">
                <button
                  type="button"
                  className="checkout-option-caption"
                  onClick={() => setPayment(!isPayment)}
                >
                  <span className="checkout-option-title">Payment methods</span>
                  <SectionChevron open={isPayment} />
                </button>
                {isPayment ? (
                  <div>
                    {methodsLoading ? (
                      <p className="checkout-status">Loading cards…</p>
                    ) : null}
                    <div className="checkout-payments">
                      {methods.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className={`checkout-payment${
                            selectedMethodId === m.id ? ' is-selected' : ''
                          }`}
                          onClick={() => setSelectedMethodId(m.id)}
                        >
                          <div className="checkout-radio">
                            {selectedMethodId === m.id ? (
                              <div className="checkout-radio-dot" />
                            ) : null}
                          </div>
                          <div>
                            <div className="checkout-card-brand">
                              {brandLabel(m.brand)}
                            </div>
                            <div className="checkout-card-meta">
                              <span>
                                XXXX - XXXX - XXXX - {m.last4}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    {!methods.length && !methodsLoading && !showAddCard ? (
                      <p className="checkout-status">
                        No cards on file yet. Add a payment method to continue.
                      </p>
                    ) : null}
                    <div className="checkout-add-method">
                      {showAddCard ? (
                        <AddCardPanel
                          onSaved={(id) => {
                            setShowAddCard(false);
                            void refreshMethods(id);
                          }}
                          onCancel={() => setShowAddCard(false)}
                        />
                      ) : (
                        <button
                          type="button"
                          className="checkout-link-btn"
                          onClick={() => setShowAddCard(true)}
                        >
                          + Add payment method
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="checkout-border" />

              <div className="checkout-summary">
                <div className="checkout-summary-row">
                  <span className="checkout-summary-label">
                    Kilometres included in this trip
                  </span>
                  <span className="checkout-summary-value">
                    {quote?.kmIncludedLabel ?? '—'}
                  </span>
                </div>
                <div className="checkout-summary-row">
                  <span className="checkout-summary-label">Price per day</span>
                  <span className="checkout-summary-value">
                    {quote
                      ? formatMoney(quote.pricePerDay)
                      : formatMoney(listing.pricePerDay)}
                  </span>
                </div>
                <div className="checkout-summary-row">
                  <span className="checkout-summary-label">
                    {quote?.tripDays ?? '—'} days
                  </span>
                  <span className="checkout-summary-value">
                    {quote ? formatMoney(quote.baseTripSubtotal) : '—'}
                  </span>
                </div>
                {quote && quote.tripDiscountSavings > 0 ? (
                  <>
                    <div className="checkout-summary-row">
                      <span className="checkout-summary-label">
                        {quote.appliesMonthlyDiscount
                          ? `Monthly discount (${listing.monthlyDiscount || `${quote.monthlyDiscountPct}%`})`
                          : `Weekly discount (${listing.weeklyDiscount || `${quote.weeklyDiscountPct}%`})`}
                      </span>
                      <span className="checkout-summary-value checkout-summary-value--discount">
                        − {formatMoney(quote.tripDiscountSavings)}
                      </span>
                    </div>
                    <div className="checkout-summary-row">
                      <span className="checkout-summary-label">
                        Trip total (after discount)
                      </span>
                      <span className="checkout-summary-value">
                        {formatMoney(quote.discountedTripSubtotal)}
                      </span>
                    </div>
                  </>
                ) : null}

                {quote && quote.selectedExtras?.length ? (
                  <>
                    <div className="checkout-summary-divider" />
                    <p className="checkout-extras-header">Selected extras</p>
                    <div className="checkout-selected-extras">
                      {quote.selectedExtras.map((extra) => (
                        <div key={extra.key} className="checkout-summary-row">
                          <span className="checkout-extra-label">
                            {EXTRA_ICONS[extra.key] ? (
                              <img
                                src={EXTRA_ICONS[extra.key]}
                                alt=""
                                className="checkout-extra-icon"
                              />
                            ) : null}
                            {extra.label}
                          </span>
                          <span className="checkout-summary-value">
                            {formatMoney(extra.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="checkout-summary-divider checkout-summary-divider--teal" />
                  </>
                ) : null}

                <div className="checkout-summary-row">
                  <span className="checkout-summary-label">Subtotal</span>
                  <span className="checkout-summary-value">
                    {quote ? formatMoney(quote.subtotal) : '—'}
                  </span>
                </div>
                <div className="checkout-summary-row">
                  <span className="checkout-summary-label checkout-trip-fee-label">
                    Trip fee
                    <button
                      type="button"
                      className="checkout-trip-fee-info"
                      aria-label="About trip fee"
                      title={TRIP_FEE_DISCLOSURE}
                      onClick={() =>
                        window.alert(`Trip fee\n\n${TRIP_FEE_DISCLOSURE}`)
                      }
                    >
                      i
                    </button>
                  </span>
                  <span className="checkout-summary-value">
                    {quote ? formatMoney(quote.tripFee) : '—'}
                  </span>
                </div>
                <div className="checkout-summary-row checkout-summary-row--total">
                  <span className="checkout-total-label">Total Price</span>
                  <span className="checkout-total-value">
                    {quote ? formatMoney(quote.grandTotal) : '—'}
                  </span>
                </div>
              </div>

              {quoteError ? (
                <p className="checkout-error">{quoteError}</p>
              ) : null}

              <div className="checkout-border" />

              {submitError ? (
                <p className="checkout-error">{submitError}</p>
              ) : null}

              <div className="checkout-booking-row">
                <button
                  type="button"
                  className="checkout-primary-btn"
                  disabled={
                    submitting ||
                    !quote ||
                    !selectedMethod ||
                    Boolean(quoteError)
                  }
                  onClick={() => void onSubmit()}
                >
                  {submitting ? 'SENDING…' : 'SEND BOOKING REQUEST'}
                </button>
              </div>
            </div>

            <div className="checkout-right">
              <h2 className="checkout-host-title">Hosted by</h2>
              <div className="checkout-host">
                {listing.hostPhotoUri ? (
                  <img src={listing.hostPhotoUri} alt="" />
                ) : (
                  <div className="checkout-host-avatar-empty" />
                )}
                <div className="checkout-host-info">
                  <span className="checkout-host-name">
                    {listing.hostName || 'Host'}
                  </span>
                  <span className="checkout-host-location">
                    {(listing.city || '').toUpperCase()}
                    {listing.city ? ', CANADA' : 'CANADA'}
                  </span>
                  {listing.hostJoinedYear != null ? (
                    <span className="checkout-host-joined">
                      Joined in {listing.hostJoinedYear}
                    </span>
                  ) : null}
                </div>
              </div>
              {hostBio ? (
                <>
                  <p
                    className={`checkout-desc${descOpen ? ' is-open' : ''}`}
                  >
                    {hostBio}
                  </p>
                  <button
                    type="button"
                    className="checkout-more"
                    onClick={() => setDescOpen((open) => !open)}
                  >
                    {descOpen ? 'Less' : 'More'}
                  </button>
                </>
              ) : null}
              {photo ? (
                <img
                  src={photo}
                  alt={listing.title}
                  className="checkout-main-photo"
                />
              ) : (
                <div className="checkout-main-photo" />
              )}
              <h2 className="checkout-vehicle-title">
                {vehicleTitle || listing.title}
              </h2>
              <div className="checkout-vehicle-meta">
                <Stars rating={listing.hostRating ?? 0} />
                <span>{listing.hostTrips ?? 0} trips</span>
              </div>
              <div className="checkout-day-price">
                {formatMoney(listing.pricePerDay)}
                <span>Per day</span>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
