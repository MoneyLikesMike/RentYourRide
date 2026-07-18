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
  listPaymentMethods,
  type StripePaymentMethod,
} from '../api/payments';
import { useAuth } from '../auth/AuthContext';
import AddCardPanel from '../components/AddCardPanel';
import PlacesAutocomplete from '../components/PlacesAutocomplete';
import SiteHeader from '../components/SiteHeader';
import type { SearchNavState, SearchTripDates } from '../types/search';

export type CheckoutNavState = {
  search?: SearchNavState;
  dates?: SearchTripDates;
  listing?: ListingDetail;
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
  const [extraUnlimitedKm, setExtraUnlimitedKm] = useState(false);
  const [extraPrepaidFuel, setExtraPrepaidFuel] = useState(false);
  const [extraPrepaidClean, setExtraPrepaidClean] = useState(false);
  const [introMessage, setIntroMessage] = useState('');

  const [isExtras, setExtras] = useState(true);
  const [isMessage, setMessage] = useState(false);
  const [isPayment, setPayment] = useState(true);
  const [descOpen, setDescOpen] = useState(false);

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
    listing?.title,
  ]
    .filter(Boolean)
    .join(' ');

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
      const dropAddr =
        deliveryEnabled && canDeliver && deliveryAddress.trim()
          ? deliveryAddress.trim()
          : pickupAddress;

      const booking = await createBooking(
        {
          listingId: listing.id,
          listingSnapshot: {
            id: listing.id,
            title: listing.title,
            photos: listing.photos,
            pickupAddress: listing.pickupAddress,
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
          pickupAddress,
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
                <span className="checkout-text">{pickupAddress}</span>
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
                      <PlacesAutocomplete
                        value={deliveryAddress}
                        onChange={setDeliveryAddress}
                        onPlaceSelected={(place) => {
                          setDeliveryAddress(
                            place.query || place.city || deliveryAddress,
                          );
                        }}
                        placeholder="Enter delivery address"
                      />
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
                  <span className="checkout-chevron">
                    {isExtras ? '▴' : '▾'}
                  </span>
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
                  <span className="checkout-chevron">
                    {isMessage ? '▴' : '▾'}
                  </span>
                </button>
                {isMessage ? (
                  <div>
                    <span className="checkout-text uppercase checkout-message-label">
                      Introduce yourself
                    </span>
                    <textarea
                      className="checkout-message"
                      value={introMessage}
                      onChange={(e) => setIntroMessage(e.target.value)}
                      placeholder="Say hello to your host…"
                      maxLength={2000}
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
                  <span className="checkout-chevron">
                    {isPayment ? '▴' : '▾'}
                  </span>
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
                          className="checkout-payment"
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
                              XXXX-XXXX-XXXX-{m.last4}
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

              <div className="checkout-price-list">
                <div className="checkout-price-col">
                  <div className="checkout-price-row">
                    <span className="checkout-text uppercase">
                      Kilometres included in the trip
                    </span>
                    <span className="checkout-price-value">
                      {quote?.kmIncludedLabel ?? '—'}
                    </span>
                  </div>
                  <div className="checkout-price-row">
                    <span className="checkout-text uppercase">
                      Price per day
                    </span>
                    <span className="checkout-price-value">
                      {quote
                        ? formatMoney(quote.pricePerDay)
                        : formatMoney(listing.pricePerDay)}
                    </span>
                  </div>
                </div>
                <div className="checkout-price-col">
                  <div className="checkout-price-row">
                    <span className="checkout-text uppercase">
                      {quote?.tripDays ?? '—'} days
                    </span>
                    <span className="checkout-price-value">
                      {quote
                        ? formatMoney(quote.discountedTripSubtotal)
                        : '—'}
                    </span>
                  </div>
                  {quote && quote.tripDiscountSavings > 0 ? (
                    <div className="checkout-price-row">
                      <span className="checkout-text uppercase">Discount</span>
                      <span className="checkout-price-value">
                        −{formatMoney(quote.tripDiscountSavings)}
                      </span>
                    </div>
                  ) : null}
                  {quote && quote.unlimitedKmFee > 0 ? (
                    <div className="checkout-price-row">
                      <span className="checkout-text uppercase">
                        Unlimited kms
                      </span>
                      <span className="checkout-price-value">
                        {formatMoney(quote.unlimitedKmFee)}
                      </span>
                    </div>
                  ) : null}
                  {quote && quote.prepaidFuelFee > 0 ? (
                    <div className="checkout-price-row">
                      <span className="checkout-text uppercase">
                        Pre paid fuel
                      </span>
                      <span className="checkout-price-value">
                        {formatMoney(quote.prepaidFuelFee)}
                      </span>
                    </div>
                  ) : null}
                  {quote && quote.prepaidCleanFee > 0 ? (
                    <div className="checkout-price-row">
                      <span className="checkout-text uppercase">
                        Pre paid clean
                      </span>
                      <span className="checkout-price-value">
                        {formatMoney(quote.prepaidCleanFee)}
                      </span>
                    </div>
                  ) : null}
                  {quote && quote.selectedDeliveryFee > 0 ? (
                    <div className="checkout-price-row">
                      <span className="checkout-text uppercase">Delivery</span>
                      <span className="checkout-price-value">
                        {formatMoney(quote.selectedDeliveryFee)}
                      </span>
                    </div>
                  ) : null}
                  <div className="checkout-price-row">
                    <span className="checkout-text uppercase">Trip fee</span>
                    <span className="checkout-price-value">
                      {quote ? formatMoney(quote.tripFee) : '—'}
                    </span>
                  </div>
                </div>
              </div>
              {quoteError ? (
                <p className="checkout-error">{quoteError}</p>
              ) : null}
              <p className="checkout-fee-note">
                Trip fee is 10% of the daily rental (after discounts), not
                extras.
              </p>

              <div className="checkout-border" />

              {submitError ? (
                <p className="checkout-error">{submitError}</p>
              ) : null}

              <div className="checkout-booking-row">
                <div>
                  <span className="checkout-total-label">Total price:</span>
                  <span className="checkout-total-value">
                    {quote ? formatMoney(quote.grandTotal) : '—'}
                  </span>
                </div>
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
                  {submitting ? 'Sending…' : 'Send booking request'}
                </button>
              </div>
            </div>

            <div className="checkout-right">
              <h2 className="checkout-host-title">Hosted by</h2>
              <div className="checkout-host">
                <img
                  src={listing.hostPhotoUri || '/no-avatar.jpg'}
                  alt=""
                />
                <div className="checkout-host-info">
                  <span className="checkout-host-name">
                    {listing.hostName || 'Host'}
                  </span>
                  <span className="checkout-host-location">
                    {(listing.city || 'Canada').toUpperCase()}
                  </span>
                  {listing.hostTrips != null ? (
                    <span className="checkout-host-joined">
                      {listing.hostTrips} trips
                    </span>
                  ) : null}
                </div>
              </div>
              {listing.description ? (
                <>
                  <p
                    className={`checkout-desc${descOpen ? ' is-open' : ''}`}
                  >
                    {listing.description}
                  </p>
                  {!descOpen && listing.description.length > 180 ? (
                    <button
                      type="button"
                      className="checkout-more"
                      onClick={() => setDescOpen(true)}
                    >
                      More
                    </button>
                  ) : null}
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
                {listing.hostRating != null ? (
                  <span>★ {listing.hostRating.toFixed(1)}</span>
                ) : null}
                {listing.hostTrips != null ? (
                  <span>{listing.hostTrips} trips</span>
                ) : null}
              </div>
              <div className="checkout-day-price">
                {formatMoney(listing.pricePerDay).replace(/\.00$/, '')}
                <span>Per day</span>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
