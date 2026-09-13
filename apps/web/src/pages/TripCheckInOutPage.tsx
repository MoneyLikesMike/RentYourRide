import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBooking, type BookingDto } from '../api/bookings';
import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthContext';
import ProfileLayout from '../components/ProfileLayout';
import { syncBookingPatchToApi } from '../utils/bookingLifecycleSync';
import {
  formatTripDates,
  isHostForBooking,
  listingTitle,
} from '../utils/trips';

type Mode = 'check-in' | 'check-out';

const GUEST_GUIDELINES = [
  'Be punctual and arrive on time',
  "Don't forget any of your personal belongings",
  'Fill up your tank / charge your battery',
  'Make sure the vehicle is squeaky clean',
  'Report any tickets you have received with the host',
  'Do a complete walk around on the vehicle',
];

const HOST_GUIDELINES = [
  'Be punctual and arrive on time',
  'Give your guest a 5 star experience',
  'Fill up your tank / charge your battery',
  'Make sure the vehicle is squeaky clean',
  'Make sure your vehicle has no mechanical issues',
  'Remove any personal belongings',
];

const TERMS_SNIPPET =
  'I acknowledge that I have read and accepted the rental agreement terms and conditions, that I am responsible for the vehicle during this rental period, and that the information in this check-in/check-out summary is accurate.';

function WizardBody({ mode }: { mode: Mode }) {
  const { bookingId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [signerName, setSignerName] = useState('');

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
  const isCheckout = mode === 'check-out';
  const guidelines = isHost ? HOST_GUIDELINES : GUEST_GUIDELINES;
  const steps = ['intro', 'guidelines', 'sign', 'finish'] as const;
  const stepKey = steps[step] || 'intro';

  const finishAndGo = () => {
    navigate(`/profile/trips/${bookingId}`);
  };

  const onSign = async () => {
    if (!booking?.id || !agreed || !signerName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const now = Date.now();
      const name = signerName.trim();
      if (isCheckout) {
        const patch = isHost
          ? {
              hostCheckoutRentalAgreementSignedAt: now,
              hostCheckoutRentalAgreementSignerName: name,
            }
          : {
              guestCheckoutRentalAgreementSignedAt: now,
              guestCheckoutRentalAgreementSignerName: name,
            };
        await syncBookingPatchToApi(booking.id, patch);
      } else {
        const patch = isHost
          ? {
              hostCheckedInAt: now,
              hostRentalAgreementCompletedAt: now,
              hostRentalAgreementSignedAt: now,
              hostRentalAgreementSignerName: name,
            }
          : {
              guestCheckedInAt: now,
              rentalAgreementCompletedAt: now,
              rentalAgreementSignedAt: now,
              rentalAgreementSignerName: name,
            };
        await syncBookingPatchToApi(booking.id, patch);
      }
      setStep(3);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not sign agreement',
      );
    } finally {
      setBusy(false);
    }
  };

  const onStartOrEndTrip = async () => {
    if (!booking?.id) return;
    setBusy(true);
    setError(null);
    try {
      const now = Date.now();
      if (isCheckout) {
        const patch = isHost
          ? { hostCheckoutTripEndedAt: now }
          : { guestCheckedOutAt: now };
        await syncBookingPatchToApi(booking.id, patch);
      } else {
        const patch = isHost
          ? { hostTripStartedAt: now }
          : { guestTripStartedAt: now };
        await syncBookingPatchToApi(booking.id, patch);
      }
      finishAndGo();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not update trip',
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="profile-status">Loading…</p>;
  if (!booking) {
    return <p className="trips-error">{error || 'Booking not found.'}</p>;
  }

  const ls = booking.listingSnapshot || {};
  const title = listingTitle(booking);
  const pickup = booking.pickupAddress || ls.pickupAddress || '—';

  return (
    <div className="trips-page trips-wizard">
      <div className="trips-page-head">
        <button
          type="button"
          className="trips-back"
          aria-label="Back"
          onClick={() => (step > 0 ? setStep((s) => s - 1) : navigate(-1))}
        >
          ‹
        </button>
        <h1 className="trips-page-title">
          {isCheckout ? 'Check out' : 'Check in'}
        </h1>
      </div>

      {error ? <p className="trips-error">{error}</p> : null}

      {stepKey === 'intro' ? (
        <div className="trips-wizard-step">
          <p className="trips-wizard-copy">
            <strong>Ready</strong> to get started?
          </p>
          <p className="trips-wizard-copy">
            {isCheckout
              ? `You're wrapping up ${title} (${formatTripDates(booking)}).`
              : `Your trip for ${title} runs ${formatTripDates(booking)}.`}
          </p>
          <p className="trips-wizard-copy">
            {isHost
              ? isCheckout
                ? 'Confirm the vehicle return with your guest.'
                : `Meet your guest at ${pickup}.`
              : `Pick up at ${pickup}.`}
          </p>
          <button
            type="button"
            className="trips-btn trips-btn--primary"
            onClick={() => setStep(1)}
          >
            Let&apos;s go
          </button>
        </div>
      ) : null}

      {stepKey === 'guidelines' ? (
        <div className="trips-wizard-step">
          <p className="trips-wizard-copy">
            Rent Your Ride wants the best experience for hosts and guests. A few
            tips:
          </p>
          <ul className="trips-guidelines">
            {guidelines.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          <button
            type="button"
            className="trips-btn trips-btn--primary"
            onClick={() => setStep(2)}
          >
            Continue
          </button>
        </div>
      ) : null}

      {stepKey === 'sign' ? (
        <div className="trips-wizard-step">
          <p className="trips-wizard-copy">{TERMS_SNIPPET}</p>
          <label className="trips-check">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>
              I confirm this accurately reflects my rental agreement{' '}
              {isCheckout ? 'check-out' : 'check-in'}.
            </span>
          </label>
          <label className="trips-wizard-copy" htmlFor="signer">
            Full name (electronic signature)
          </label>
          <input
            id="signer"
            className="trips-wizard-input"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Type your full legal name"
            autoComplete="name"
          />
          <button
            type="button"
            className="trips-btn trips-btn--primary"
            disabled={busy || !agreed || !signerName.trim()}
            onClick={() => void onSign()}
          >
            {busy
              ? 'Signing…'
              : isCheckout
                ? 'Sign & complete check-out'
                : 'Sign & complete check-in'}
          </button>
        </div>
      ) : null}

      {stepKey === 'finish' ? (
        <div className="trips-wizard-step">
          <p className="trips-wizard-copy">
            {isCheckout
              ? 'Agreement signed. End the trip when you are ready.'
              : 'Agreement signed. Start the trip when you are ready.'}
          </p>
          <button
            type="button"
            className="trips-btn trips-btn--primary"
            disabled={busy}
            onClick={() => void onStartOrEndTrip()}
          >
            {busy
              ? 'Updating…'
              : isCheckout
                ? 'End trip'
                : 'Start trip'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function TripCheckInPage() {
  return (
    <ProfileLayout title="Trip check-in">
      {() => <WizardBody mode="check-in" />}
    </ProfileLayout>
  );
}

export function TripCheckOutPage() {
  return (
    <ProfileLayout title="Trip check-out">
      {() => <WizardBody mode="check-out" />}
    </ProfileLayout>
  );
}
