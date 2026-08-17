import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../api/http';
import {
  getReferralsSummary,
  inviteLink,
  type ReferralSummary,
} from '../api/referrals';
import ProfileLayout from '../components/ProfileLayout';

type Mode = 'invite' | 'host' | null;
type ReferralTab = 'confirmed' | 'pending';

const FRIEND_CREDIT = 25;
const HOST_CREDIT = 25;

type ReferralPerson = {
  id: string;
  name: string;
  avatarUrl?: string;
  /** Confirmed credit earned */
  amount?: number;
  /** Pending: signed up but no trip yet */
  signedUp?: boolean;
};

function formatCad(n: number): string {
  return `$${n.toFixed(n % 1 ? 2 : 0)}`;
}

function ReferralsBody() {
  const [mode, setMode] = useState<Mode>(null);
  const [tab, setTab] = useState<ReferralTab>('confirmed');
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);

  // Lists are not yet returned by the API — keep structure ready for real data.
  const confirmed: ReferralPerson[] = [];
  const pending: ReferralPerson[] = [];

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
  const potentialEarnings = pending.length * HOST_CREDIT;
  const paidOut = confirmed.reduce((sum, r) => sum + (r.amount ?? 0), 0);

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

  const selectMode = (next: Mode) => {
    setMode(next);
    setTab(next === 'host' ? 'pending' : 'confirmed');
    setShowShare(false);
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
          onClick={() => selectMode('invite')}
        >
          <div className="referrals-card-top">
            <span>Invite friend</span>
            {/* White glyph on teal card; teal glyph on white card (legacy invite / inviteWhite) */}
            <img
              src={
                mode === 'invite'
                  ? '/profile/users-alt.png?v=2'
                  : '/profile/users-alt1.png?v=2'
              }
              alt=""
              className="referrals-card-icon--friend"
            />
          </div>
          <p>Get up to ({formatCad(FRIEND_CREDIT)}) off your next trip.</p>
        </button>

        <button
          type="button"
          className={`referrals-card${mode === 'host' ? ' is-active' : ''}`}
          onClick={() => selectMode('host')}
        >
          <div className="referrals-card-top">
            <span>Refer a host</span>
            {/* White glyph on teal card; teal glyph on white card (legacy referral / referralWhite) */}
            <img
              src={
                mode === 'host'
                  ? '/profile/group-4.png?v=2'
                  : '/profile/group-4-1.png?v=2'
              }
              alt=""
              className="referrals-card-icon--host"
            />
          </div>
          <p>Refer a host and earn ({formatCad(HOST_CREDIT)}).</p>
        </button>
      </div>

      {mode === 'invite' ? (
        <div className="referrals-panel">
          <div className="referrals-panel-main">
            <h2>Share the Rent Your Ride experience with your friends</h2>
            <p>
              When your friend completes their first trip with Rent Your Ride,
              you’ll get up to ({formatCad(FRIEND_CREDIT)}) in travel credit.
            </p>
            <p>
              Friends who sign up using with your link will get (
              {formatCad(FRIEND_CREDIT)}) off their first trip
            </p>

            <div className="referrals-link-wrap">
              <div className="referrals-link-row">
                <span className="referrals-link-text">
                  {link || 'Your referral link will appear here'}
                </span>
              </div>
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
                SHARE YOUR LINK
              </button>
              <span className="referrals-terms">Terms &amp; Conditions</span>
            </div>

            <button
              type="button"
              className="referrals-green-note"
              onClick={() => selectMode('host')}
            >
              Know someone who would like to earn money from while renting out
              their car?
            </button>

            <div className="referrals-tabs">
              <button
                type="button"
                className={`referrals-tab${tab === 'confirmed' ? ' is-active' : ''}`}
                onClick={() => setTab('confirmed')}
              >
                Confirmed referrals ({confirmed.length})
              </button>
              <button
                type="button"
                className={`referrals-tab${tab === 'pending' ? ' is-active' : ''}`}
                onClick={() => setTab('pending')}
              >
                Pending referrals ({pending.length})
              </button>
            </div>

            {tab === 'confirmed' ? (
              <div className="referrals-list">
                {confirmed.length === 0 ? (
                  <p className="referrals-empty">
                    No confirmed referrals yet. Share your link to get started.
                  </p>
                ) : (
                  confirmed.map((row) => (
                    <div key={row.id} className="referrals-person">
                      <div className="referrals-person-left">
                        {row.avatarUrl ? (
                          <img src={row.avatarUrl} alt="" />
                        ) : (
                          <div className="referrals-avatar-empty" />
                        )}
                        <div>
                          <span className="referrals-person-name">
                            {row.name}
                          </span>
                          <span className="referrals-person-status">
                            <img src="/profile/done.png" alt="" />
                            Confirmed
                          </span>
                        </div>
                      </div>
                      <span className="referrals-person-amount">
                        {formatCad(row.amount ?? 0)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="referrals-list">
                {pending.length === 0 ? (
                  <p className="referrals-empty">No pending referrals.</p>
                ) : (
                  pending.map((row) => (
                    <div key={row.id} className="referrals-person">
                      <div className="referrals-person-left">
                        {row.avatarUrl ? (
                          <img src={row.avatarUrl} alt="" />
                        ) : (
                          <div className="referrals-avatar-empty" />
                        )}
                        <div>
                          <span className="referrals-person-name">
                            {row.name}
                          </span>
                          <span className="referrals-person-pending">
                            {row.signedUp
                              ? 'signed up, but hasn’t taken a ride yet.'
                              : 'hasn’t signed up yet'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <aside className="referrals-credit-box">
            <span className="referrals-credit-label">Available credit:</span>
            <div className="referrals-credit-amount">
              <span className="referrals-cost">{formatCad(credits)}</span>
              <span className="referrals-cad">CAD</span>
            </div>
            <p className="referrals-credit-copy">
              You’re doing an amazing! Share your link with more people to earn
              more credits
            </p>
          </aside>
        </div>
      ) : null}

      {mode === 'host' ? (
        <div className="referrals-panel">
          <div className="referrals-panel-main">
            <h2>
              Earn ({formatCad(HOST_CREDIT)}) for every new host refer to Rent
              Your Ride
            </h2>
            <p>
              Friends who start hosting thier vehicle will earn you (
              {formatCad(HOST_CREDIT)}) when they complete their first rental
            </p>

            <div className="referrals-link-wrap">
              <div className="referrals-link-row">
                <span className="referrals-link-text">
                  {link || 'Your referral link will appear here'}
                </span>
              </div>
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
                SHARE YOUR LINK
              </button>
              <span className="referrals-terms">Terms &amp; Conditions</span>
            </div>

            <button
              type="button"
              className="referrals-green-note"
              onClick={() => selectMode('invite')}
            >
              Know someone who would like to save money renting a car?
            </button>

            <div className="referrals-tabs">
              <button
                type="button"
                className={`referrals-tab${tab === 'pending' ? ' is-active' : ''}`}
                onClick={() => setTab('pending')}
              >
                Pending referrals ({pending.length})
              </button>
            </div>

            <div className="referrals-list">
              {pending.length === 0 ? (
                <p className="referrals-empty">
                  No pending host referrals yet.
                </p>
              ) : (
                pending.map((row) => (
                  <div key={row.id} className="referrals-person">
                    <div className="referrals-person-left">
                      {row.avatarUrl ? (
                        <img src={row.avatarUrl} alt="" />
                      ) : (
                        <div className="referrals-avatar-empty" />
                      )}
                      <div>
                        <span className="referrals-person-name">
                          {row.name}
                        </span>
                        <span className="referrals-person-pending">
                          {row.signedUp
                            ? 'signed up, but hasn’t taken a ride yet.'
                            : 'hasn’t signed up yet'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <aside className="referrals-credit-box referrals-credit-box--host">
            <span className="referrals-credit-label">Your earnings</span>
            <div className="referrals-credit-amount">
              <span className="referrals-cost">{formatCad(credits)}</span>
              <span className="referrals-cad">CAD</span>
            </div>
            <span className="referrals-credit-sublabel">Potential earnings</span>
            <div className="referrals-credit-amount referrals-credit-amount--sm">
              <span className="referrals-cost">
                {formatCad(potentialEarnings)}
              </span>
              <span className="referrals-cad">CAD</span>
            </div>
            <span className="referrals-credit-sublabel">Paid out</span>
            <div className="referrals-credit-amount referrals-credit-amount--sm">
              <span className="referrals-cost">{formatCad(paidOut)}</span>
              <span className="referrals-cad">CAD</span>
            </div>
          </aside>
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
            aria-labelledby="referrals-share-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="referrals-share-close"
              onClick={() => setShowShare(false)}
              aria-label="Close"
            >
              <img src="/close.png" alt="" />
            </button>
            <h2 id="referrals-share-title">Share link</h2>
            <ul className="referrals-share-list">
              <li>
                <a
                  href={`mailto:?subject=${encodeURIComponent('Join RentYourRide')}&body=${encodeURIComponent(link)}`}
                >
                  <span>Email</span>
                  <img src="/referrals/email.png" alt="" />
                </a>
              </li>
              <li>
                <a href={`sms:?&body=${encodeURIComponent(link)}`}>
                  <span>Sms</span>
                  <img src="/referrals/sms.png" alt="" />
                </a>
              </li>
              <li>
                <button type="button" onClick={() => void copyLink()}>
                  <span>{copied ? 'Copied!' : 'Copy link'}</span>
                  <img src="/referrals/copy.png" alt="" />
                </button>
              </li>
              <li>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Facebook</span>
                  <img src="/referrals/facebook.png" alt="" />
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(link)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>WhatsApp</span>
                  <img src="/referrals/whatsapp.png" alt="" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ReferralsCreditsPage() {
  return (
    <ProfileLayout title="Referrals and credits">
      {() => <ReferralsBody />}
    </ProfileLayout>
  );
}
