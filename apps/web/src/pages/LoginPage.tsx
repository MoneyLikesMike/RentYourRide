import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/http';
import { getAccessToken, getRefreshToken } from '../api/storage';
import { useAuth } from '../auth/AuthContext';
import { isAppleSignInConfigured } from '../auth/appleSignIn';
import { isGoogleSignInConfigured } from '../auth/googleSignIn';
import { validateEmail, validatePassword } from '../auth/validation';
import { AppleLogo, GoogleLogo } from '../components/SocialLogos';

function hasStoredSession(): boolean {
  return !!(getAccessToken() || getRefreshToken());
}

export default function LoginPage() {
  const { isAuthenticated, signIn, signInWithApple, signInWithGoogle } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const loginReturn = (location.state as {
    from?: string;
    listingDetail?: unknown;
    checkout?: unknown;
  } | null) ?? {};
  const from = loginReturn.from ?? '/';
  const returnState = loginReturn.checkout ?? loginReturn.listingDetail;

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

  if (isAuthenticated) {
    return (
      <Navigate
        to={from}
        replace
        state={returnState ?? undefined}
      />
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const errors: Record<string, string> = {};
    const emailErr = validateEmail(email.trim());
    const passwordErr = validatePassword(password);
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
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
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
            {secure ? 'Show' : 'Hide'}
          </button>
          {fieldErrors.password ? (
            <span className="auth-error">{fieldErrors.password}</span>
          ) : null}
        </div>

        <div className="auth-options">
          <label className="auth-remember">
            <input type="checkbox" />
            Remember me
          </label>
          <Link className="auth-link-btn" to="/forgot-password">
            Forgot Password
          </Link>
        </div>

        {formError ? (
          <p className="auth-error auth-error--banner">{formError}</p>
        ) : null}

        <button className="auth-cta" type="submit" disabled={busy}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>

        <p className="auth-divider-text">or continue with</p>

        <button
          type="button"
          className="auth-apple"
          onClick={onApple}
          disabled={busy}
        >
          <AppleLogo />
          <span>{appleLoading ? 'Continuing…' : 'Login with Apple'}</span>
        </button>
        <button
          type="button"
          className="auth-google"
          onClick={onGoogle}
          disabled={busy}
        >
          <GoogleLogo />
          <span>{googleLoading ? 'Continuing…' : 'Login with Google'}</span>
        </button>

        <p className="auth-footer">
          Don’t have an account?
          <Link className="auth-link-btn" to="/signup">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
