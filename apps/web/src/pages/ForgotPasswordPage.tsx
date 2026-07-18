import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/auth';
import { ApiError } from '../api/http';
import { validateEmail } from '../auth/validation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setDone(false);

    const emailErr = validateEmail(email.trim());
    setFieldError(emailErr ?? null);
    if (emailErr) return;

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setDone(true);
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Request failed',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <h1 className="auth-caption">Forgot Password</h1>
        <p className="auth-note">
          Enter your email and we’ll send reset instructions if an account
          exists.
        </p>

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
          {fieldError ? <span className="auth-error">{fieldError}</span> : null}
        </div>

        {formError ? (
          <p className="auth-error auth-error--banner">{formError}</p>
        ) : null}
        {done ? (
          <p className="auth-success">
            If that email is registered, check your inbox for a reset link.
          </p>
        ) : null}

        <button className="auth-cta" type="submit" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>

        <p className="auth-footer">
          <Link className="auth-link-btn" to="/login">
            Back to log in
          </Link>
        </p>
      </form>
    </div>
  );
}
