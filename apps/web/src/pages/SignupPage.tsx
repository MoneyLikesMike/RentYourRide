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
  validatePassword,
  validateRequired,
} from '../auth/validation';
import PageMeta from '../components/PageMeta';
import { AppleLogo, GoogleLogo } from '../components/SocialLogos';

function hasStoredSession(): boolean {
  return !!(getAccessToken() || getRefreshToken());
}

export default function SignupPage() {
  const { isAuthenticated, signUp, signInWithApple, signInWithGoogle } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const authState = (location.state as AuthLocationState | null) ?? {};
  const background = authState.backgroundLocation;

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const busy = loading || appleLoading || googleLoading;

  const closeSignup = () => {
    if (background) {
      navigate(
        `${background.pathname}${background.search}${background.hash}`,
        { replace: true, state: background.state },
      );
      return;
    }
    navigate('/', { replace: true });
  };

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const errors: Record<string, string> = {};
    const emailErr = validateEmail(email.trim());
    const firstErr = validateRequired(firstName, 'First Name');
    const lastErr = validateRequired(lastName, 'Last Name');
    const passwordErr = validatePassword(password);
    if (emailErr) errors.email = emailErr;
    if (firstErr) errors.firstName = firstErr;
    if (lastErr) errors.lastName = lastErr;
    if (passwordErr) errors.password = passwordErr;
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setLoading(true);
    try {
      await signUp({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Sign up failed',
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
      if (hasStoredSession()) navigate('/', { replace: true });
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
      if (hasStoredSession()) navigate('/', { replace: true });
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
      <PageMeta title="Sign up | Rent Your Ride" noindex />
      <form
        className="auth-card auth-card--signup"
        onSubmit={onSubmit}
        noValidate
      >
        <button
          type="button"
          className="auth-close"
          onClick={closeSignup}
          aria-label="Close"
        >
          <img src="/close.png" alt="" />
        </button>

        <h1 className="auth-caption">Sign Up</h1>

        <p className="auth-divider-text auth-divider-text--top">Sign up with</p>

        <button
          type="button"
          className="auth-apple"
          onClick={onApple}
          disabled={busy}
        >
          <AppleLogo />
          <span>{appleLoading ? 'Continuing…' : 'Sign up with Apple'}</span>
        </button>
        <button
          type="button"
          className="auth-google"
          onClick={onGoogle}
          disabled={busy}
        >
          <GoogleLogo />
          <span>{googleLoading ? 'Continuing…' : 'Sign up with Google'}</span>
        </button>

        <div className="auth-or-row">
          <div className="line" />
          <span>Or sign up using email</span>
          <div className="line" />
        </div>

        <div className="auth-field">
          <input
            className="auth-input"
            type="email"
            name="email"
            autoComplete="email"
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
            type="text"
            name="firstName"
            autoComplete="given-name"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          {fieldErrors.firstName ? (
            <span className="auth-error">{fieldErrors.firstName}</span>
          ) : null}
        </div>

        <div className="auth-field">
          <input
            className="auth-input"
            type="text"
            name="lastName"
            autoComplete="family-name"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          {fieldErrors.lastName ? (
            <span className="auth-error">{fieldErrors.lastName}</span>
          ) : null}
        </div>

        <div className="auth-field">
          <input
            className="auth-input"
            type={secure ? 'password' : 'text'}
            name="password"
            autoComplete="new-password"
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

        <p className="auth-note">
          You need to be at least 18. Other people who use Rent Your Ride won’t
          see your birthday
        </p>

        <label className="auth-updates">
          <input type="checkbox" />
          Send me updates, news and deals
        </label>

        {formError ? (
          <p className="auth-error auth-error--banner">{formError}</p>
        ) : null}

        <button className="auth-cta" type="submit" disabled={busy}>
          {loading ? 'Signing up…' : 'SIGN UP'}
        </button>

        <p className="auth-footer">
          Already have an account?
          <Link
            className="auth-link-btn"
            to="/login"
            state={withAuthBackground(location)}
          >
            Log in
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
