import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/auth';
import { ApiError } from '../api/http';
import { validatePassword } from '../auth/validation';
import PageMeta from '../components/PageMeta';

/**
 * Completes password recovery from the email link
 * (`/reset-password?token=…`). Matches the mobile “Set up password” → success flow.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(
    () =>
      (
        params.get('token') ||
        params.get('passwordRecoveryVerificationToken') ||
        ''
      ).trim(),
    [params],
  );

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!token) {
      setFormError(
        'This reset link is missing a token. Request a new one from Forgot Password.',
      );
      return;
    }

    const pwdErr = validatePassword(newPassword);
    setNewError(pwdErr ?? null);
    const matchErr =
      confirmPassword !== newPassword ? 'Passwords do not match' : undefined;
    setConfirmError(matchErr ?? null);
    if (pwdErr || matchErr) return;

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setDone(true);
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'This link is invalid or has expired. Request a new reset email.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="auth-page">
        <PageMeta title="Password changed | Rent Your Ride" noindex />
        <div className="auth-card auth-card--reset-success">
          <img
            className="auth-reset-success-icon"
            src="/car-lock-icon.png"
            alt=""
            width={180}
            height={180}
          />
          <h1 className="auth-reset-success-title">
            <span className="auth-reset-success-highlight">Password</span>{' '}
            change successful
          </h1>
          <button
            type="button"
            className="auth-cta"
            onClick={() => navigate('/login')}
          >
            Ok
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <PageMeta title="Set up password | Rent Your Ride" noindex />
      <form className="auth-card auth-card--setup-password" onSubmit={onSubmit} noValidate>
        <Link className="auth-close auth-close--left" to="/login" aria-label="Close">
          <img className="close-x-img" src="/close.png" alt="" />
        </Link>
        <h1 className="auth-caption auth-caption--left">Set up password</h1>

        {!token ? (
          <p className="auth-error auth-error--banner">
            This reset link is missing a token. Request a new one from{' '}
            <Link className="auth-link-btn" to="/forgot-password">
              Forgot Password
            </Link>
            .
          </p>
        ) : null}

        <div className="auth-field">
          <label className="auth-field-label" htmlFor="reset-new-password">
            New password
          </label>
          <input
            id="reset-new-password"
            className="auth-input"
            type={showNew ? 'text' : 'password'}
            name="newPassword"
            autoComplete="new-password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          {newPassword ? (
            <button
              type="button"
              className="auth-secure"
              onClick={() => setShowNew((v) => !v)}
            >
              {showNew ? 'Hide' : 'Show'}
            </button>
          ) : null}
          {newError ? <span className="auth-error">{newError}</span> : null}
        </div>

        <div className="auth-field">
          <label className="auth-field-label" htmlFor="reset-confirm-password">
            Re-enter password
          </label>
          <input
            id="reset-confirm-password"
            className="auth-input"
            type={showConfirm ? 'text' : 'password'}
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {confirmPassword ? (
            <button
              type="button"
              className="auth-secure"
              onClick={() => setShowConfirm((v) => !v)}
            >
              {showConfirm ? 'Hide' : 'Show'}
            </button>
          ) : null}
          {confirmError ? <span className="auth-error">{confirmError}</span> : null}
        </div>

        {formError ? (
          <p className="auth-error auth-error--banner">{formError}</p>
        ) : null}

        <button
          className="auth-cta auth-cta--bottom"
          type="submit"
          disabled={loading || !token}
        >
          {loading ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  );
}
