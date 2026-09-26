import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { confirmEmailChange } from '../api/auth';
import { ApiError } from '../api/http';
import type { MeUser } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import PageMeta from '../components/PageMeta';

type Status = 'ready' | 'working' | 'success' | 'error' | 'missing';

const APP_SCHEME = 'com.rentyourride.ios://confirm-email-change';

/**
 * Email-change confirmation from inbox link.
 * Shows the success screen; Ok applies the new email (same as mobile).
 * Also attempts to hand off to the iOS app via custom URL scheme.
 */
export default function ConfirmEmailChangePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isAuthenticated, applyMeUser, refreshProfile } = useAuth();
  const [status, setStatus] = useState<Status>('ready');
  const [message, setMessage] = useState(
    'Confirm to finish updating your email address.',
  );

  const token = useMemo(
    () =>
      (
        params.get('token') ||
        params.get('emailChangeToken') ||
        ''
      ).trim(),
    [params],
  );

  useEffect(() => {
    if (!token) {
      setStatus('missing');
      setMessage(
        'This confirmation link is missing a token. Request a new email change from account settings.',
      );
      return;
    }
    // Prefer opening the installed app when possible (TestFlight / App Store).
    const appUrl = `${APP_SCHEME}?token=${encodeURIComponent(token)}`;
    const t = window.setTimeout(() => {
      try {
        window.location.href = appUrl;
      } catch {
        /* stay on web */
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [token]);

  const onOk = useCallback(async () => {
    if (!token || status === 'working') return;
    setStatus('working');
    setMessage('Updating your email…');
    try {
      const result = await confirmEmailChange(token);
      if (result?.user && isAuthenticated) {
        applyMeUser(result.user as MeUser);
        await refreshProfile().catch(() => null);
      }
      setStatus('success');
      setMessage('Your email was updated.');
    } catch (err) {
      setStatus('error');
      setMessage(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'This link is invalid or has expired. Request a new email change.',
      );
    }
  }, [applyMeUser, isAuthenticated, refreshProfile, status, token]);

  if (status === 'success') {
    return (
      <div className="auth-page">
        <PageMeta title="Email changed | Rent Your Ride" noindex />
        <div className="auth-card auth-card--reset-success">
          <img
            className="auth-reset-success-icon"
            src="/profile/email-change-success.png"
            alt=""
            width={180}
            height={180}
          />
          <h1 className="auth-reset-success-title">
            <span className="auth-reset-success-highlight">Email</span> change
            successful
          </h1>
          <button
            type="button"
            className="auth-cta"
            onClick={() =>
              navigate(
                isAuthenticated ? '/profile/contact-information' : '/login',
              )
            }
          >
            Ok
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <PageMeta title="Confirm email change | Rent Your Ride" noindex />
      <div className="auth-card auth-card--reset-success">
        <img
          className="auth-reset-success-icon"
          src="/profile/email-change-success.png"
          alt=""
          width={180}
          height={180}
        />
        <h1 className="auth-reset-success-title">
          <span className="auth-reset-success-highlight">Email</span> change
          successful
        </h1>
        <p
          className={
            status === 'error' || status === 'missing'
              ? 'auth-error auth-error--banner'
              : 'auth-note'
          }
        >
          {message}
        </p>
        {status === 'missing' || status === 'error' ? (
          <p className="auth-footer">
            <Link className="auth-link-btn" to="/login">
              Log in
            </Link>
            {' · '}
            <Link className="auth-link-btn" to="/profile/contact-information">
              Account settings
            </Link>
          </p>
        ) : (
          <button
            type="button"
            className="auth-cta"
            disabled={status === 'working'}
            onClick={() => void onOk()}
          >
            {status === 'working' ? 'Updating…' : 'Ok'}
          </button>
        )}
      </div>
    </div>
  );
}
