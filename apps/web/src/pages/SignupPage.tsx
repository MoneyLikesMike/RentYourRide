import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/http';
import { getAccessToken, getRefreshToken } from '../api/storage';
import { useAuth } from '../auth/AuthContext';
import { isAppleSignInConfigured } from '../auth/appleSignIn';
import { isGoogleSignInConfigured } from '../auth/googleSignIn';
import {
  validateEmail,
  validatePassword,
  validateRequired,
} from '../auth/validation';
import { AppleLogo, GoogleLogo } from '../components/SocialLogos';

function hasStoredSession(): boolean {
  return !!(getAccessToken() || getRefreshToken());
}

export default function SignupPage() {
  const { isAuthenticated, signUp, signInWithApple, signInWithGoogle } =
    useAuth();
  const navigate = useNavigate();

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
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <h1 className="auth-caption">Sign Up</h1>

        <p className="auth-divider-text" style={{ marginTop: 0 }}>
          Sign up with
        </p>

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
          <span>{googleLoading ? 'Continuing…' : 'Login with Google'}</span>
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
            {secure ? 'Show' : 'Hide'}
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
          {loading ? 'Signing up…' : 'Sign Up'}
        </button>

        <p className="auth-footer">
          Already have an account?
          <Link className="auth-link-btn" to="/login">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
