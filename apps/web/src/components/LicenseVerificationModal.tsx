import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ApiError } from '../api/http';
import {
  createDiditLicenseSession,
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

function statusLabel(me: MeUser): string {
  if (me.licenseVerified) return 'Verified';
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
  const [view, setView] = useState<'main' | 'pending'>('main');

  const verified = !!me.licenseVerified;
  const status = (me.licenseVerificationStatus || '').trim();
  const showPending =
    !verified &&
    (status === 'pending_review' ||
      status === 'in_progress' ||
      status === 'awaiting_user');
  const label = statusLabel(me);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setBusy(false);
    setView(showPending || verified ? 'pending' : 'main');
  }, [open, showPending, verified]);

  const startDidit = async () => {
    if (showPending) {
      setView('pending');
      return;
    }
    setBusy(true);
    setError(null);
    try {
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

        <h2 id="license-verify-title" className="phone-verify-title">
          License verification
        </h2>

        {view === 'pending' ? (
          <div className="license-verify-pending">
            <div className="license-verify-accent" />
            <p className="license-verify-heading">
              {verified
                ? 'Your license is verified'
                : "We're still reviewing your license"}
            </p>
            {!verified ? (
              <p className="license-verify-status-line">Status: {label}</p>
            ) : null}
            <p className="license-verify-body">
              {verified
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
            <p className="license-verify-status-label">Status</p>
            <p
              className={
                verified
                  ? 'license-verify-status-value license-verify-status-value--ok'
                  : 'license-verify-status-value'
              }
            >
              {label}
            </p>

            {me.licenseNumber ? (
              <p className="license-verify-on-file">
                License on file: {me.licenseNumber}
              </p>
            ) : null}

            <div className="license-verify-disclosure">
              <p className="license-verify-disclosure-title">
                Identity verification
              </p>
              <p className="license-verify-disclosure-body">
                To rent or list vehicles, we verify your driver&apos;s license
                with Didit. You will scan your license and complete a short
                liveness check in the Didit flow. Images are processed by Didit
                for verification only.
              </p>
            </div>

            {error ? <p className="phone-verify-error">{error}</p> : null}

            {!verified ? (
              <button
                type="button"
                className="license-verify-primary"
                disabled={busy}
                onClick={() => void startDidit()}
              >
                {busy
                  ? 'Starting…'
                  : showPending
                    ? 'View submission status'
                    : 'Verify my license'}
              </button>
            ) : (
              <p className="license-verify-note">
                Your license is verified. Contact support if your details
                change.
              </p>
            )}

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
      </div>
    </div>,
    document.body,
  );
}
