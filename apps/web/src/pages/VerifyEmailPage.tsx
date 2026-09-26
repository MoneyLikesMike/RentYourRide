import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { verifyEmailWithToken } from '../api/auth';
import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthContext';
import PageMeta from '../components/PageMeta';

type Status = 'working' | 'success' | 'error' | 'missing';

/**
 * One-click email verification (Airbnb / Turo style):
 * open link from inbox → page calls API with token → account marked verified.
 * Works whether or not the user is already signed in on this browser.
 */
export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isAuthenticated, refreshProfile } = useAuth();
  const [status, setStatus] = useState<Status>('working');
  const [message, setMessage] = useState('Verifying your email…');

  const token = (
    params.get('token') ||
    params.get('emailVerificationToken') ||
    ''
  ).trim();

  useEffect(() => {
    if (!token) {
      setStatus('missing');
      setMessage(
        'This verification link is missing a token. Request a new email from your account settings.',
      );
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await verifyEmailWithToken(token);
        if (cancelled) return;
        if (isAuthenticated) {
          await refreshProfile();
        }
        if (cancelled) return;
        setStatus('success');
        setMessage('Your email is verified. You’re all set.');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'This link is invalid or has expired. Request a new verification email.',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, isAuthenticated, refreshProfile]);

  return (
    <div className="auth-page">
      <PageMeta title="Verify email | Rent Your Ride" noindex />
      <div className="auth-card auth-card--compact">
        <h1 className="auth-caption">Email verification</h1>
        <p
          className={
            status === 'success'
              ? 'auth-success'
              : status === 'error' || status === 'missing'
                ? 'auth-error auth-error--banner'
                : 'auth-note'
          }
        >
          {message}
        </p>

        {status === 'success' ? (
          <button
            type="button"
            className="auth-cta"
            onClick={() =>
              navigate(
                isAuthenticated ? '/profile/contact-information' : '/login',
              )
            }
          >
            {isAuthenticated ? 'Continue' : 'Log in'}
          </button>
        ) : null}

        {status === 'error' || status === 'missing' ? (
          <p className="auth-footer">
            <Link className="auth-link-btn" to="/login">
              Back to log in
            </Link>
            {' · '}
            <Link className="auth-link-btn" to="/profile/contact-information">
              Account settings
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
