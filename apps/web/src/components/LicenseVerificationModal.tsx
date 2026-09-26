import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ApiError } from '../api/http';
import {
  createDiditLicenseSession,
  abandonDiditLicenseSession,
  DIDIT_RETURN_PATH_KEY,
  diditWebCallbackUrl,
} from '../api/didit';
import type { MeUser } from '../api/users';

type Props = {
  open: boolean;
  onClose: () => void;
  me: MeUser;
  reload: () => Promise<void>;
};

type View = 'confirm' | 'main' | 'pending';

function statusLabel(me: MeUser): string {
  if (me.licenseVerified) {
    const s = (me.licenseVerificationStatus || '').trim();
    if (
      s === 'pending_review' ||
      s === 'in_progress' ||
      s === 'awaiting_user'
    ) {
      // Re-verify in flight
    } else {
      return 'Verified';
    }
  }
  const s = (me.licenseVerificationStatus || '').trim();
  if (s === 'pending_review') return 'In review';
  if (s === 'declined') return 'Declined';
  if (s === 'resubmitted') return 'Resubmit required';
  if (s === 'in_progress') return 'In progress';
  if (s === 'awaiting_user') return 'Awaiting your action';
  if (s === 'expired') return 'Expired — verify again';
  return 'Not verified';
}

export default function LicenseVerificationModal({
  open,
  onClose,
  me,
  reload,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('main');

  const verified = !!me.licenseVerified;
  const status = (me.licenseVerificationStatus || '').trim();
  const reverifyInFlight = verified && status === 'pending_review';
  // Mid-flow abandon leaves in_progress — that must stay retryable, not locked as pending.
  const showPending =
    reverifyInFlight || (!verified && status === 'pending_review');
  const canRetryAbandoned =
    !verified && (status === 'in_progress' || status === 'awaiting_user');
  const label = statusLabel(me);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setBusy(false);
    if (showPending) {
      setView('pending');
    } else if (verified) {
      setView('confirm');
    } else {
      setView('main');
    }
  }, [open, showPending, verified]);

  const startDidit = async () => {
    if (showPending && !verified) {
      setView('pending');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (canRetryAbandoned) {
        try {
          await abandonDiditLicenseSession();
        } catch {
          /* still attempt a new session */
        }
      }
      sessionStorage.setItem(
        DIDIT_RETURN_PATH_KEY,
        '/profile/contact-information',
      );
      const session = await createDiditLicenseSession(diditWebCallbackUrl());
      if (!session?.url) {
        throw new Error('Could not start verification session.');
      }
      window.location.assign(session.url);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not start verification',
      );
      setBusy(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="phone-verify-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="phone-verify-modal license-verify-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="license-verify-title"
      >
        <button
          type="button"
          className="phone-verify-close"
          aria-label="Close"
          onClick={onClose}
        >
          <img src="/close.png" alt="" />
        </button>

        {view === 'confirm' ? (
          <div className="license-verify-confirm">
            <img
              className="license-verify-confirm-icon"
              src="/profile/license-already-approved.png"
              alt=""
              width={150}
              height={150}
            />
            <h2 id="license-verify-title" className="license-verify-confirm-title">
              Your license is already approved would you like to update it?
            </h2>
            <button
              type="button"
              className="license-verify-primary"
              onClick={() => setView('main')}
            >
              Update
            </button>
            <button
              type="button"
              className="license-verify-primary license-verify-primary--outline"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <h2 id="license-verify-title" className="phone-verify-title">
              License verification
            </h2>

            {view === 'pending' ? (
              <div className="license-verify-pending">
                <div className="license-verify-accent" />
                <p className="license-verify-heading">
                  {verified && !reverifyInFlight
                    ? 'Your license is verified'
                    : "We're still reviewing your license"}
                </p>
                {!(verified && !reverifyInFlight) ? (
                  <p className="license-verify-status-line">Status: {label}</p>
                ) : null}
                <p className="license-verify-body">
                  {verified && !reverifyInFlight
                    ? 'You are cleared to rent and list on Rent Your Ride. Contact support if your license details change.'
                    : "You look good! Please give us a moment to verify your ID. We will send you an email once you're verified or if we need more information."}
                </p>
                <button
                  type="button"
                  className="license-verify-continue"
                  onClick={() => {
                    void reload();
                    onClose();
                  }}
                >
                  Continue
                </button>
                {!verified && status === 'declined' ? (
                  <button
                    type="button"
                    className="account-action"
                    style={{ marginTop: '1rem' }}
                    onClick={() => setView('main')}
                  >
                    Try again
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="license-verify-main">
                <div className="license-verify-disclosure">
                  <p className="license-verify-disclosure-title">
                    Let&apos;s add your license
                  </p>
                  <p className="license-verify-disclosure-body">
                    Rent Your Ride verifies the I.D. of every user on the
                    platform. Please ensure that you are a minimum of 18 years
                    old and hold a valid drivers license.
                  </p>
                </div>

                {error ? <p className="phone-verify-error">{error}</p> : null}

                <button
                  type="button"
                  className="license-verify-primary license-verify-primary--outline"
                  disabled={busy}
                  onClick={() => void startDidit()}
                >
                  {busy
                    ? 'Starting…'
                    : showPending
                      ? 'View submission status'
                      : canRetryAbandoned
                        ? 'Try again'
                        : 'Next'}
                </button>

                {canRetryAbandoned ? (
                  <p className="phone-verify-hint" style={{ marginTop: '0.75rem' }}>
                    Previous attempt was not finished. You can try again.
                  </p>
                ) : null}

                {showPending ? (
                  <button
                    type="button"
                    className="account-action"
                    style={{ marginTop: '1rem', alignSelf: 'center' }}
                    onClick={() => setView('pending')}
                  >
                    View submission status
                  </button>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
