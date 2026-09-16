import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { DIDIT_RETURN_PATH_KEY } from '../api/didit';
import { getMe, type MeUser } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import PageMeta from '../components/PageMeta';

function statusFromQuery(status: string | null): string {
  const s = (status || '').trim();
  if (s === 'Approved') return 'Approved';
  if (s === 'Declined') return 'Declined';
  if (s === 'In Review') return 'In Review';
  return s || 'Submitted';
}

function labelForMe(me: MeUser | null, queryStatus: string): string {
  if (me?.licenseVerified) return 'Verified';
  const s = (me?.licenseVerificationStatus || '').trim();
  if (s === 'pending_review' || s === 'in_progress') return 'In review';
  if (s === 'declined') return 'Declined';
  if (queryStatus === 'Approved') return 'In review';
  if (queryStatus === 'Declined') return 'Declined';
  if (queryStatus === 'In Review') return 'In review';
  return 'Submitted';
}

export default function DiditCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { applyMeUser, user } = useAuth();
  const [me, setMe] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const queryStatus = statusFromQuery(params.get('status'));
  const returnPath =
    sessionStorage.getItem(DIDIT_RETURN_PATH_KEY) ||
    '/profile/contact-information';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!user) {
          setLoading(false);
          return;
        }
        const profile = await getMe();
        if (!cancelled) {
          setMe(profile);
          applyMeUser(profile);
        }
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyMeUser, user]);

  const verified = !!me?.licenseVerified;
  const label = labelForMe(me, queryStatus);

  const onContinue = () => {
    sessionStorage.removeItem(DIDIT_RETURN_PATH_KEY);
    navigate(returnPath, { replace: true });
  };

  if (!user) {
    return (
      <div className="didit-callback-page">
        <PageMeta title="License verification | Rent Your Ride" noindex />
        <div className="didit-callback-card">
          <h1>License verification</h1>
          <p>Sign in to see your verification status.</p>
          <Link className="license-verify-continue" to="/login">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="didit-callback-page">
      <PageMeta title="License verification | Rent Your Ride" noindex />
      <div className="didit-callback-card">
        <div className="license-verify-accent" />
        <h1>
          {verified
            ? 'Your license is verified'
            : "We're still reviewing your license"}
        </h1>
        {loading ? (
          <p className="license-verify-body">Checking status…</p>
        ) : (
          <>
            {!verified ? (
              <p className="license-verify-status-line">Status: {label}</p>
            ) : null}
            <p className="license-verify-body">
              {verified
                ? 'You are cleared to rent and list on Rent Your Ride. Contact support if your license details change.'
                : "You look good! Please give us a moment to verify your ID. We will send you an email once you're verified or if we need more information."}
            </p>
          </>
        )}
        <button
          type="button"
          className="license-verify-continue"
          onClick={onContinue}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
