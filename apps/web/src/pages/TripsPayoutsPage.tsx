import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/http';
import { listHostListings } from '../api/hostListings';
import {
  isPayoutAccountReady,
  payoutsAccountStatus,
  payoutsSummary,
  type PayoutAccountStatus,
  type PayoutsSummary,
} from '../api/payouts';
import FinishPayoutSetupBanner from '../components/FinishPayoutSetupBanner';
import GetPaidGate from '../components/GetPaidGate';
import ProfileLayout from '../components/ProfileLayout';
import FinishPayoutSetupPage from './FinishPayoutSetupPage';

function PayoutsBody() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const forceEmpty = params.get('empty') === '1';
  const forceFinish =
    params.get('finish') === '1' || params.get('payout') === 'finish';
  const [loading, setLoading] = useState(true);
  const [showEmpty, setShowEmpty] = useState(forceEmpty);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [status, setStatus] = useState<PayoutAccountStatus | null>(null);
  const [summary, setSummary] = useState<PayoutsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [listings, acctStatus] = await Promise.all([
          listHostListings().catch(() => []),
          payoutsAccountStatus().catch(() => null),
        ]);
        if (!cancelled) setStatus(acctStatus);
        const stripeReady = isPayoutAccountReady(acctStatus);
        if (!stripeReady) {
          try {
            sessionStorage.removeItem('ryr_payout_setup_complete');
          } catch {
            /* ignore */
          }
        }
        const hasHub = listings.length > 0 || stripeReady;
        if (!cancelled) {
          if (forceEmpty || !hasHub) {
            setShowEmpty(true);
            return;
          }
          setShowEmpty(false);
          if (!stripeReady && !acctStatus?.currentlyDue?.length) {
            // No account at all → Get Paid; if they have dues, finish flow.
            if (!acctStatus || acctStatus.status === 'not_started') {
              setNeedsOnboarding(true);
              return;
            }
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

  if (forceFinish) {
    return <FinishPayoutSetupPage />;
  }

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
          <p>
            We need you to list a vehicle first before we can send you your
            earnings.
          </p>
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
  const needsFinish =
    !isPayoutAccountReady(status) ||
    (status?.currentlyDue?.length || 0) + (status?.pastDue?.length || 0) > 0;

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

      <FinishPayoutSetupBanner
        status={status}
        pendingAmount={pending}
        finishPath="/profile/trips/payouts?finish=1"
      />

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

      {needsFinish ? (
        <div className="trips-detail-actions">
          <Link
            className="trips-btn trips-btn--primary"
            to="/profile/trips/payouts?finish=1"
          >
            Finish payout setup
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export default function TripsPayoutsPage() {
  const [params] = useSearchParams();
  if (params.get('finish') === '1' || params.get('payout') === 'finish') {
    return <FinishPayoutSetupPage />;
  }
  return <ProfileLayout title="Payouts">{() => <PayoutsBody />}</ProfileLayout>;
}
