import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../api/http';
import {
  getReferralsSummary,
  inviteLink,
  type ReferralSummary,
} from '../api/referrals';
import ProfileLayout from '../components/ProfileLayout';

type Mode = 'invite' | 'host' | null;

function ReferralsBody() {
  const [mode, setMode] = useState<Mode>('invite');
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const row = await getReferralsSummary();
        if (!cancelled) setSummary(row);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Could not load referrals',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const code = summary?.referralCode?.trim() || '';
  const link = useMemo(() => (code ? inviteLink(code) : ''), [code]);
  const credits = Number(summary?.creditsBalance ?? 0) || 0;

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy link');
    }
  };

  return (
    <div className="referrals">
      <div className="referrals-title-block">
        <h1 className="referrals-title">Referrals &amp; Credits</h1>
      </div>

      {loading ? <p className="profile-status">Loading…</p> : null}
      {error ? <p className="profile-error">{error}</p> : null}

      <div className="referrals-big-buttons">
        <button
          type="button"
          className={`referrals-card${mode === 'invite' ? ' is-active' : ''}`}
          onClick={() => setMode('invite')}
        >
          <div className="referrals-card-top">
            <span>Invite friend</span>
            <img
              src={
                mode === 'invite'
                  ? '/profile/users-alt.png'
                  : '/profile/users-alt1.png'
              }
              alt=""
            />
          </div>
          <p>
            Share your link so friends can save on their first trip — and you
            earn travel credit.
          </p>
        </button>

        <button
          type="button"
          className={`referrals-card${mode === 'host' ? ' is-active' : ''}`}
          onClick={() => setMode('host')}
        >
          <div className="referrals-card-top">
            <span>Refer a host</span>
            <img
              src={
                mode === 'host' ? '/profile/group-4.png' : '/profile/group-4-1.png'
              }
              alt=""
            />
          </div>
          <p>
            Invite someone to list their vehicle and earn credit when they
            complete qualifying trips.
          </p>
        </button>
      </div>

      {mode === 'invite' ? (
        <div className="referrals-panel">
          <div className="referrals-panel-main">
            <h2>Share the Rent Your Ride experience with your friends</h2>
            <p>
              When your friend completes their first trip with Rent Your Ride,
              you’ll get up to <strong>$25</strong> in travel credit.
            </p>
            <p>
              Friends who sign up using your link will get{' '}
              <strong>$25</strong> off their first trip.
            </p>

            <div className="referrals-link-row">
              <span className="referrals-link-text">
                {link || 'Sign in to get your referral link'}
              </span>
              <button
                type="button"
                className="referrals-copy"
                disabled={!link}
                onClick={() => void copyLink()}
              >
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>

            <div className="referrals-btn-row">
              <button
                type="button"
                className="referrals-share-btn"
                disabled={!link}
                onClick={() => setShowShare(true)}
              >
                Share your link
              </button>
              <span className="referrals-terms">Terms &amp; Conditions</span>
            </div>

            <p className="referrals-green-note">
              Know someone who would like to earn money while renting out their
              car? Switch to Refer a host.
            </p>
          </div>

          <div className="referrals-credit-box">
            <span className="referrals-credit-label">Available credit:</span>
            <div className="referrals-credit-amount">
              <span className="referrals-cost">
                ${credits.toFixed(credits % 1 ? 2 : 0)}
              </span>
              <span className="referrals-cad">CAD</span>
            </div>
            <p className="referrals-credit-copy">
              You’re doing amazing! Share your link with more people to earn
              more credits.
            </p>
          </div>
        </div>
      ) : null}

      {mode === 'host' ? (
        <div className="referrals-panel">
          <div className="referrals-panel-main">
            <h2>Earn $25 for every new host you refer to Rent Your Ride</h2>
            <p>
              Friends who start hosting their vehicle will earn you $25 when
              they complete their first rental.
            </p>

            <div className="referrals-link-row">
              <span className="referrals-link-text">
                {link || 'Sign in to get your referral link'}
              </span>
              <button
                type="button"
                className="referrals-copy"
                disabled={!link}
                onClick={() => void copyLink()}
              >
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>

            <div className="referrals-btn-row">
              <button
                type="button"
                className="referrals-share-btn"
                disabled={!link}
                onClick={() => setShowShare(true)}
              >
                Share your link
              </button>
              <span className="referrals-terms">Terms &amp; Conditions</span>
            </div>

            <p className="referrals-green-note">
              Know someone who would like to save money renting a car? Switch to
              Invite friend.
            </p>
          </div>

          <div className="referrals-credit-box">
            <span className="referrals-credit-label">Your earnings</span>
            <div className="referrals-credit-amount">
              <span className="referrals-cost">
                ${credits.toFixed(credits % 1 ? 2 : 0)}
              </span>
              <span className="referrals-cad">CAD</span>
            </div>
            <p className="referrals-credit-copy">
              Credits from host referrals appear here as they complete
              qualifying trips.
            </p>
          </div>
        </div>
      ) : null}

      {showShare && link ? (
        <div
          className="referrals-share-backdrop"
          role="presentation"
          onClick={() => setShowShare(false)}
        >
          <div
            className="referrals-share-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Share your link</h2>
            <div className="referrals-share-actions">
              <a
                href={`mailto:?subject=${encodeURIComponent('Join RentYourRide')}&body=${encodeURIComponent(link)}`}
              >
                Email
              </a>
              <a href={`sms:?&body=${encodeURIComponent(link)}`}>SMS</a>
              <button type="button" onClick={() => void copyLink()}>
                {copied ? 'Copied!' : 'Copy link'}
              </button>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Facebook
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(link)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            </div>
            <button
              type="button"
              className="referrals-share-close"
              onClick={() => setShowShare(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ReferralsCreditsPage() {
  return (
    <ProfileLayout>
      {() => <ReferralsBody />}
    </ProfileLayout>
  );
}
