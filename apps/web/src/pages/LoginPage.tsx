import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/http';
import { getAccessToken, getRefreshToken } from '../api/storage';
import {
  withAuthBackground,
  type AuthLocationState,
} from '../auth/authModal';
import { useAuth } from '../auth/AuthContext';
import { isAppleSignInConfigured } from '../auth/appleSignIn';
import { isGoogleSignInConfigured } from '../auth/googleSignIn';
import {
  validateEmail,
  validateLoginPassword,
} from '../auth/validation';
import PageMeta from '../components/PageMeta';
import { AppleLogo, GoogleLogo } from '../components/SocialLogos';

function hasStoredSession(): boolean {
  return !!(getAccessToken() || getRefreshToken());
}

export default function LoginPage() {
  const { isAuthenticated, signIn, signInWithApple, signInWithGoogle } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const loginReturn = (location.state as AuthLocationState | null) ?? {};
  const from = loginReturn.from ?? '/';
  const returnState = loginReturn.checkout ?? loginReturn.listingDetail;
  const background = loginReturn.backgroundLocation;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const busy = loading || appleLoading || googleLoading;

  const goAfterAuth = () => {
    navigate(from, {
      replace: true,
      state: returnState ?? undefined,
    });
  };

  const closeLogin = () => {
    if (background) {
      navigate(
        `${background.pathname}${background.search}${background.hash}`,
        { replace: true, state: background.state },
      );
      return;
    }
    if (loginReturn.from) {
      navigate(from, { replace: true, state: returnState ?? undefined });
      return;
    }
    navigate('/', { replace: true });
  };

  if (isAuthenticated) {
    return (
      <Navigate to={from} replace state={returnState ?? undefined} />
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const errors: Record<string, string> = {};
    const emailErr = validateEmail(email.trim());
    const passwordErr = validateLoginPassword(password);
    if (emailErr) errors.email = emailErr;
    if (passwordErr) errors.password = passwordErr;
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      goAfterAuth();
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Log in failed',
      );
    } finally {
      setLoading(false);
    }
  };

  const onApple = async () => {
    setFormError(null);
    if (!isAppleSignInConfigured()) {
      setFormError(
        'Apple Sign In is not configured yet (set VITE_APPLE_CLIENT_ID).',
      );
      return;
    }
    setAppleLoading(true);
    try {
      await signInWithApple();
      if (hasStoredSession()) goAfterAuth();
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Apple sign-in failed',
      );
    } finally {
      setAppleLoading(false);
    }
  };

  const onGoogle = async () => {
    setFormError(null);
    if (!isGoogleSignInConfigured()) {
      setFormError(
        'Google Sign In is not configured (set VITE_GOOGLE_CLIENT_ID).',
      );
      return;
    }
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      if (hasStoredSession()) goAfterAuth();
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Google sign-in failed',
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page--modal">
      <PageMeta title="Log in | Rent Your Ride" noindex />
      <form className="auth-card auth-card--login" onSubmit={onSubmit} noValidate>
        <button
          type="button"
          className="auth-close"
          onClick={closeLogin}
          aria-label="Close"
        >
          <img src="/close.png" alt="" />
        </button>

        <h1 className="auth-caption">Log in to continue</h1>

        <div className="auth-field">
          <input
            className="auth-input"
            type="email"
            name="email"
            autoComplete="username"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {fieldErrors.email ? (
            <span className="auth-error">{fieldErrors.email}</span>
          ) : null}
        </div>

        <div className="auth-field">
          <input
            className="auth-input"
            type={secure ? 'password' : 'text'}
            name="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="auth-secure"
            onClick={() => setSecure((s) => !s)}
            aria-label={secure ? 'Show password' : 'Hide password'}
          >
            {secure ? <EyeSlashIcon /> : <EyeIcon />}
          </button>
          {fieldErrors.password ? (
            <span className="auth-error">{fieldErrors.password}</span>
          ) : null}
        </div>

        <div className="auth-options">
          <label className="auth-remember">
            <input type="checkbox" />
            Remember Me
          </label>
          <Link className="auth-link-btn" to="/forgot-password">
            Forgot Password
          </Link>
        </div>

        {formError ? (
          <p className="auth-error auth-error--banner">{formError}</p>
        ) : null}

        <button className="auth-cta" type="submit" disabled={busy}>
          {loading ? 'Logging in…' : 'LOG IN'}
        </button>

        <p className="auth-divider-text">or continue with</p>

        <button
          type="button"
          className="auth-apple"
          onClick={onApple}
          disabled={busy}
        >
          <AppleLogo />
          <span>{appleLoading ? 'Continuing…' : 'Log in with Apple'}</span>
        </button>
        <button
          type="button"
          className="auth-google"
          onClick={onGoogle}
          disabled={busy}
        >
          <GoogleLogo />
          <span>{googleLoading ? 'Continuing…' : 'Log in with Google'}</span>
        </button>

        <p className="auth-footer">
          Don’t have an account?
          <Link
            className="auth-link-btn"
            to="/signup"
            state={withAuthBackground(location)}
          >
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function EyeSlashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none">
      <path
        d="M3 3l18 18M10.5 10.6a2.9 2.9 0 0 0 4 4M7.1 7.3C5.1 8.5 3.6 10.3 2.5 12c0 0 3.5 6.5 9.5 6.5 1.6 0 3-.3 4.3-.9M16.8 15.5c1.5-1 2.7-2.4 3.7-3.5 0 0-3.5-6.5-9.5-6.5-1 0-1.9.1-2.8.4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
