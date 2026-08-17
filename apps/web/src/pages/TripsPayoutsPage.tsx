import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/http';
import { listHostListings } from '../api/hostListings';
import {
  connectOnboardingLink,
  isPayoutAccountReady,
  payoutsAccountStatus,
  payoutsSummary,
  type PayoutsSummary,
} from '../api/payouts';
import GetPaidGate from '../components/GetPaidGate';
import ProfileLayout from '../components/ProfileLayout';

function PayoutsBody() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const forceEmpty = params.get('empty') === '1';
  const [loading, setLoading] = useState(true);
  const [showEmpty, setShowEmpty] = useState(forceEmpty);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [summary, setSummary] = useState<PayoutsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [listings, status] = await Promise.all([
          listHostListings().catch(() => []),
          payoutsAccountStatus().catch(() => null),
        ]);
        let local = false;
        try {
          local = sessionStorage.getItem('ryr_payout_setup_complete') === '1';
        } catch {
          local = false;
        }
        const hasHub =
          listings.length > 0 || isPayoutAccountReady(status) || local;
        if (!cancelled) {
          if (forceEmpty || !hasHub) {
            setShowEmpty(true);
            return;
          }
          setShowEmpty(false);
          if (!isPayoutAccountReady(status) && !local) {
            setNeedsOnboarding(true);
            return;
          }
          const s = await payoutsSummary().catch(() => null);
          if (!cancelled) setSummary(s);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Could not load payouts',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [forceEmpty]);

  const openConnect = async () => {
    setBusy(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const { url } = await connectOnboardingLink({
        returnUrl: `${origin}/profile/trips/payouts?payout=return`,
        refreshUrl: `${origin}/profile/trips/payouts?payout=refresh`,
      });
      try {
        sessionStorage.setItem('ryr_payout_setup_complete', '1');
      } catch {
        /* ignore */
      }
      window.location.assign(url);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not open payout setup',
      );
      setBusy(false);
    }
  };

  if (loading) return <p className="profile-status">Loading…</p>;

  if (showEmpty) {
    return (
      <div className="trips-page">
        <div className="trips-page-head">
          <button
            type="button"
            className="trips-back"
            aria-label="Back"
            onClick={() => navigate('/profile/trips')}
          >
            ‹
          </button>
          <h1 className="trips-page-title">Payouts</h1>
        </div>
        <div className="trips-empty">
          <p>
            <strong>Let&apos;s</strong> get you paid
          </p>
          <p>We need you to list a vehicle first before we can send you your earnings.</p>
          <Link to="/profile/list-your-ride" className="trips-empty-cta">
            List a ride
          </Link>
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="trips-page">
        <div className="trips-page-head">
          <button
            type="button"
            className="trips-back"
            aria-label="Back"
            onClick={() => navigate('/profile/trips')}
          >
            ‹
          </button>
          <h1 className="trips-page-title">Payouts</h1>
        </div>
        <GetPaidGate returnPath="/profile/trips/payouts" />
      </div>
    );
  }

  const pending = summary?.pendingAmount ?? 0;
  const currency = (summary?.currency || 'cad').toUpperCase();

  return (
    <div className="trips-page">
      <div className="trips-page-head">
        <button
          type="button"
          className="trips-back"
          aria-label="Back"
          onClick={() => navigate('/profile/trips')}
        >
          ‹
        </button>
        <h1 className="trips-page-title">Payouts</h1>
      </div>

      {error ? <p className="trips-error">{error}</p> : null}

      <div className="trips-payout-card">
        <div className="trips-payout-amount">
          ${pending.toFixed(2)} {currency}
        </div>
        <div className="trips-payout-label">Pending payout balance</div>
      </div>

      <p className="trips-wizard-copy">
        Earnings from completed trips are sent to your connected payout account
        after check-in completes.
      </p>

      <div className="trips-detail-actions">
        <button
          type="button"
          className="trips-btn trips-btn--primary"
          disabled={busy}
          onClick={() => void openConnect()}
        >
          {busy ? 'Opening…' : 'Manage payout method'}
        </button>
      </div>
    </div>
  );
}

export default function TripsPayoutsPage() {
  return <ProfileLayout title="Payouts">{() => <PayoutsBody />}</ProfileLayout>;
}
