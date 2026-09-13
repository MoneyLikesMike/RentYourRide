import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  acceptBooking,
  cancelBooking,
  declineBooking,
  getBooking,
  respondExtension,
  type BookingDto,
} from '../api/bookings';
import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthContext';
import ProfileLayout from '../components/ProfileLayout';
import {
  coverUri,
  formatTripDates,
  getTripCardPrimaryAction,
  getTripCardStatus,
  isHostForBooking,
  listingTitle,
  statusLabel,
} from '../utils/trips';

const CANCELLED_OR_DONE = new Set([
  'cancelled',
  'declined',
  'completed',
  'expired',
]);

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function DetailBody() {
  const { bookingId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const load = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    try {
      const b = await getBooking(bookingId);
      setBooking(b);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not load booking',
      );
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isHost = isHostForBooking(booking || ({} as BookingDto), user?.id);
  const isPending = booking?.status === 'pending_host';
  const isExtensionPending = booking?.status === 'extension_pending';
  const canCancel =
    booking != null && !CANCELLED_OR_DONE.has(booking.status) && !isPending;

  const pricing = booking?.pricing || {};
  const extras = useMemo(() => {
    const raw = booking?.extras;
    return Array.isArray(raw) ? (raw as Array<{ key: string; label: string; amount: number }>) : [];
  }, [booking]);

  const tripDays = Number(pricing.tripDays ?? 1);
  const pricePerDay = Number(
    pricing.pricePerDay ?? booking?.listingSnapshot?.pricePerDay ?? 0,
  );
  const discountedTripSubtotal = Number(pricing.discountedTripSubtotal ?? 0);
  const baseTripSubtotal = Number(
    pricing.baseTripSubtotal != null ? pricing.baseTripSubtotal : discountedTripSubtotal,
  );
  const tripDiscountSavings = Math.max(0, Number(pricing.tripDiscountSavings ?? 0));
  const extrasSum = extras.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const subtotal = Number(
    pricing.subtotal != null ? pricing.subtotal : discountedTripSubtotal + extrasSum,
  );
  const tripFee = Number(pricing.tripFee ?? 0);
  const grandTotal = Number(
    pricing.grandTotal != null ? pricing.grandTotal : subtotal + tripFee,
  );
  const serviceFeeHost = Math.max(0, discountedTripSubtotal * 0.25);
  const hostEarnings = Math.max(
    0,
    discountedTripSubtotal - serviceFeeHost + extrasSum,
  );

  const cardStatus = booking ? getTripCardStatus(booking) : null;
  const primary = booking
    ? getTripCardPrimaryAction(cardStatus?.key || '', { isHost, booking })
    : { type: null };

  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      after?.();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Something went wrong',
      );
    } finally {
      setBusy(false);
    }
  };

  const onAccept = () =>
    void run(
      () => acceptBooking(bookingId),
      () => navigate('/profile/trips/active'),
    );

  const onDeny = () => {
    if (!window.confirm('Turn down this booking request?')) return;
    void run(
      () => declineBooking(bookingId),
      () => navigate('/profile/trips/requests'),
    );
  };

  const onApproveExtension = () =>
    void run(
      () => respondExtension(bookingId, true),
      () => void load(),
    );

  const onDenyExtension = () => {
    if (!window.confirm('Decline this trip extension?')) return;
    void run(
      () => respondExtension(bookingId, false),
      () => void load(),
    );
  };

  const onCancelConfirm = () =>
    void run(
      () => cancelBooking(bookingId),
      () => {
        setCancelOpen(false);
        navigate('/profile/trips');
      },
    );

  if (loading) {
    return <p className="profile-status">Loading…</p>;
  }

  if (!booking) {
    return (
      <div className="trips-page">
        <button
          type="button"
          className="trips-back"
          onClick={() => navigate(-1)}
        >
          ‹
        </button>
        <p className="trips-error">{error || 'Booking not found.'}</p>
      </div>
    );
  }

  const cover = coverUri(booking);
  const ls = booking.listingSnapshot || {};
  const counterparty = isHost
    ? booking.guestName || 'Guest'
    : ls.hostName || 'Host';

  return (
    <div className="trips-page trips-detail">
      <div className="trips-page-head">
        <button
          type="button"
          className="trips-back"
          aria-label="Back"
          onClick={() => navigate(-1)}
        >
          ‹
        </button>
        <h1 className="trips-page-title">Booking details</h1>
      </div>

      {error ? <p className="trips-error">{error}</p> : null}

      {cover ? (
        <img src={cover} alt="" className="trips-detail-cover" />
      ) : (
        <div className="trips-detail-cover" aria-hidden />
      )}

      <h2 className="trips-detail-title">{listingTitle(booking)}</h2>
      <p className="trips-detail-row">
        <span className="trips-detail-label">{isHost ? 'Guest' : 'Host'}</span>
        {counterparty}
      </p>
      <p className="trips-detail-row">
        <span className="trips-detail-label">Status</span>
        {cardStatus?.label || statusLabel(booking.status)}
      </p>
      <p className="trips-detail-row">
        <span className="trips-detail-label">Dates</span>
        {formatTripDates(booking)}
      </p>
      <p className="trips-detail-row">
        <span className="trips-detail-label">Pick up</span>
        {booking.pickupAddress ||
          (typeof ls.pickupAddress === 'string' ? ls.pickupAddress : null) ||
          '—'}
      </p>
      <p className="trips-detail-row">
        <span className="trips-detail-label">Drop off</span>
        {booking.dropoffAddress || booking.pickupAddress || '—'}
      </p>

      {typeof booking.introMessage === 'string' &&
      booking.introMessage.trim() ? (
        <p className="trips-detail-row">
          <span className="trips-detail-label">Guest message</span>
          {booking.introMessage.trim()}
        </p>
      ) : null}

      <div className="trips-summary">
        <p className="trips-detail-row">
          <span className="trips-detail-label">Kilometres included</span>
          {pricing.kmIncludedLabel || '—'}
        </p>
        <p className="trips-detail-row">
          <span className="trips-detail-label">Price per day</span>
          {money(pricePerDay)}
        </p>
        <p className="trips-detail-row">
          <span className="trips-detail-label">{tripDays} days</span>
          {money(baseTripSubtotal)}
        </p>
        {tripDiscountSavings > 0 ? (
          <p className="trips-detail-row">
            <span className="trips-detail-label">Discount</span>
            −{money(tripDiscountSavings)}
          </p>
        ) : null}
        {extras.map((ex) => (
          <p key={ex.key} className="trips-detail-row">
            <span className="trips-detail-label">{ex.label}</span>
            {money(Number(ex.amount) || 0)}
          </p>
        ))}
        <p className="trips-detail-row">
          <span className="trips-detail-label">Subtotal</span>
          {money(subtotal)}
        </p>
        {isHost ? (
          <>
            <p className="trips-detail-row">
              <span className="trips-detail-label">Service fee</span>
              −{money(serviceFeeHost)}
            </p>
            <p className="trips-detail-row trips-detail-total">
              <span className="trips-detail-label">Your total earnings</span>
              {money(hostEarnings)}
            </p>
          </>
        ) : (
          <>
            <p className="trips-detail-row">
              <span className="trips-detail-label">Trip fee</span>
              {money(tripFee)}
            </p>
            <p className="trips-detail-row trips-detail-total">
              <span className="trips-detail-label">Grand total</span>
              {money(grandTotal)}
            </p>
          </>
        )}
      </div>

      <div className="trips-detail-actions">
        {isHost && isPending ? (
          <>
            <button
              type="button"
              className="trips-btn trips-btn--primary"
              disabled={busy}
              onClick={onAccept}
            >
              Rent your ride
            </button>
            <button
              type="button"
              className="trips-btn trips-btn--ghost"
              disabled={busy}
              onClick={onDeny}
            >
              Deny request
            </button>
          </>
        ) : null}

        {isHost && isExtensionPending ? (
          <>
            <button
              type="button"
              className="trips-btn trips-btn--primary"
              disabled={busy}
              onClick={onApproveExtension}
            >
              Approve extension
            </button>
            <button
              type="button"
              className="trips-btn trips-btn--ghost"
              disabled={busy}
              onClick={onDenyExtension}
            >
              Decline extension
            </button>
          </>
        ) : null}

        {!isPending && !isExtensionPending ? (
          <Link to="/messages" className="trips-btn trips-btn--primary">
            Message {isHost ? 'guest' : 'host'}
          </Link>
        ) : null}

        {primary.type === 'check_in' ? (
          <Link
            to={`/profile/trips/${booking.id}/check-in`}
            className="trips-btn trips-btn--primary"
          >
            Check in
          </Link>
        ) : null}
        {primary.type === 'checkout' ? (
          <Link
            to={`/profile/trips/${booking.id}/check-out`}
            className="trips-btn trips-btn--primary"
          >
            Check out
          </Link>
        ) : null}

        {canCancel ? (
          <button
            type="button"
            className="trips-btn trips-btn--danger"
            disabled={busy}
            onClick={() => setCancelOpen(true)}
          >
            Cancel trip
          </button>
        ) : null}
      </div>

      {cancelOpen ? (
        <div className="trips-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="trips-modal-backdrop"
            aria-label="Close"
            onClick={() => setCancelOpen(false)}
          />
          <div className="trips-modal-card">
            <p>
              There may be penalties if you cancel this booking. Read our{' '}
              <Link to="/terms-conditions">cancellation policies</Link> and
              penalties.
            </p>
            <div className="trips-detail-actions">
              <button
                type="button"
                className="trips-btn trips-btn--ghost"
                onClick={() => setCancelOpen(false)}
              >
                Keep trip
              </button>
              <button
                type="button"
                className="trips-btn trips-btn--danger"
                disabled={busy}
                onClick={onCancelConfirm}
              >
                Confirm cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function TripBookingDetailPage() {
  return (
    <ProfileLayout title="Booking details">{() => <DetailBody />}</ProfileLayout>
  );
}
