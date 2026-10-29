import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  acceptFinishBooking,
  acceptFinishLegal,
  finishApple,
  finishGoogle,
  finishLogin,
  finishRegister,
  getFinishSession,
  type FinishSession,
} from '../api/assisted';
import { ApiError } from '../api/http';
import { getAccessToken } from '../api/storage';
import { startEmailVerification } from '../api/users';
import { getMe, type MeUser } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import { isAppleSignInConfigured, signInWithAppleWeb } from '../auth/appleSignIn';
import { isGoogleSignInConfigured, signInWithGoogleWeb } from '../auth/googleSignIn';
import AddCardPanel from '../components/AddCardPanel';
import LicenseVerificationModal from '../components/LicenseVerificationModal';
import PageMeta from '../components/PageMeta';
import PhoneVerificationModal from '../components/PhoneVerificationModal';
import SiteHeader from '../components/SiteHeader';
import { AppleLogo, GoogleLogo } from '../components/SocialLogos';

function LegalAgree({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="finish-legal">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        I agree to the Rent Your Ride{' '}
        <Link to="/terms-conditions?section=terms-of-service" target="_blank" rel="noreferrer">
          Terms of Service
        </Link>
        ,{' '}
        <Link to="/terms-conditions?section=terms-conditions" target="_blank" rel="noreferrer">
          Terms &amp; Conditions
        </Link>
        , and{' '}
        <Link to="/terms-conditions?section=privacy" target="_blank" rel="noreferrer">
          Privacy Policy
        </Link>
        .
      </span>
    </label>
  );
}

function money(n: number | undefined): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  return `$${n.toFixed(2)}`;
}

function formatDraftWhen(dates: Record<string, unknown>, which: 'start' | 'end'): string {
  const ms = Number(dates[which]);
  const timeKey = which === 'start' ? 'startTime' : 'endTime';
  const time = typeof dates[timeKey] === 'string' ? String(dates[timeKey]) : '';
  if (!Number.isFinite(ms) || ms <= 0) return time || '—';
  const day = new Date(ms).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return time ? `${day} · ${time}` : day;
}

export default function FinishBookingPage() {
  const { token = '' } = useParams();
  const { refreshProfile, isAuthenticated } = useAuth();
  const [session, setSession] = useState<FinishSession | null>(null);
  const [me, setMe] = useState<MeUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [licenceOpen, setLicenceOpen] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [agreedLegal, setAgreedLegal] = useState(false);
  const [agreedRental, setAgreedRental] = useState(false);

  const load = async () => {
    const data = await getFinishSession(token);
    setSession(data);
    setError(null);
    if (getAccessToken()) {
      try {
        setMe(await getMe());
      } catch {
        setMe(null);
      }
    } else {
      setMe(null);
    }
    return data;
  };

  useEffect(() => {
    void load().catch((err) => {
      setError(err instanceof ApiError ? err.message : 'This link is invalid or expired.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAuthenticated]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refreshProfile();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const step = session?.nextStep ?? 'legal';
  const legalDone = Boolean(session?.legal.terms && session?.legal.privacy);
  const booked = Boolean(doneId || session?.bookingId);
  const showAccount = Boolean(session && !booked && (step === 'legal' || step === 'account'));
  const showComplete = Boolean(session && !booked && !showAccount);
  const phase = booked ? 2 : showAccount ? 1 : 2;
  const progressRatio = booked ? 1 : showAccount ? 0.5 : 0.85;

  const phoneDone = me?.phoneVerified === true && Boolean(me.phone);
  const licenceDone = me?.licenseVerified === true;
  const cardDone = Boolean(session?.checklist.card);

  const ensureLegalAccepted = async () => {
    if (legalDone) return;
    if (!agreedLegal) {
      throw new Error(
        'Please agree to the Terms of Service, Terms & Conditions, and Privacy Policy.',
      );
    }
    await acceptFinishLegal(token, ['terms', 'privacy']);
  };

  return (
    <>
      <PageMeta title="Finish your booking" />
      <SiteHeader />
      <main className="finish-page">
        <h1>Finish your booking</h1>
        {session ? (
          <p className="finish-muted">
            Hi {session.leadFirstName} — this {session.draft.title} is held for you until{' '}
            {new Date(session.expiresAt).toLocaleString()}.
          </p>
        ) : null}

        {session ? (
          <section className="finish-ride" aria-label="Trip details">
            {session.draft.photoUri ? (
              <img
                className="finish-ride-cover"
                src={session.draft.photoUri}
                alt={session.draft.title}
              />
            ) : (
              <div className="finish-ride-cover" aria-hidden />
            )}
            <h2 className="finish-ride-title">{session.draft.title}</h2>
            <p className="finish-ride-row">
              {session.draft.city || '—'}
              {session.draft.hostName ? ` · ${session.draft.hostName}` : ''}
            </p>
            <p className="finish-ride-row">
              <span className="finish-ride-label">Pick up</span>
              {formatDraftWhen(session.draft.bookingDates, 'start')}
            </p>
            <p className="finish-ride-row">
              <span className="finish-ride-label">Drop off</span>
              {formatDraftWhen(session.draft.bookingDates, 'end')}
            </p>
            <p className="finish-ride-row finish-ride-total">
              <span className="finish-ride-label">Total</span>
              {money(session.draft.quote.grandTotal)}
            </p>
          </section>
        ) : null}
        {error ? <p className="finish-error">{error}</p> : null}

        {session && !booked ? (
          <div className="finish-progress" aria-label={`Step ${phase} of 2`}>
            <div className="finish-progress-track">
              <div
                className="finish-progress-fill"
                style={{ width: `${Math.round(progressRatio * 100)}%` }}
              />
            </div>
            <p className="finish-progress-label">
              {showAccount ? 'Step 1 of 2 · Account' : 'Step 2 of 2 · Send request'}
            </p>
          </div>
        ) : null}

        {doneId || session?.bookingId ? (
          <div className="finish-card">
            <p>Your booking request is in. The host will respond in the app or on the website.</p>
            <Link to={`/profile/trips/${doneId || session?.bookingId}`}>View trip</Link>
          </div>
        ) : null}

        {showAccount ? (
          <div className="finish-card">
            <h2 className="finish-card-title">Create your account</h2>
            <p>Takes a minute. You will use this same login in the app later.</p>
            <div className="finish-actions">
              <button
                type="button"
                className={`trips-btn ${mode === 'register' ? 'trips-btn--primary' : 'trips-btn--ghost'}`}
                onClick={() => setMode('register')}
              >
                Create account
              </button>
              <button
                type="button"
                className={`trips-btn ${mode === 'login' ? 'trips-btn--primary' : 'trips-btn--ghost'}`}
                onClick={() => setMode('login')}
              >
                Sign in
              </button>
            </div>
            {!legalDone ? <LegalAgree checked={agreedLegal} onChange={setAgreedLegal} /> : null}
            <div className="finish-social">
              {isAppleSignInConfigured() ? (
                <button
                  type="button"
                  className="auth-apple"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await ensureLegalAccepted();
                      const a = await signInWithAppleWeb();
                      await finishApple(token, {
                        identityToken: a.identityToken,
                        email: a.email,
                        firstName: a.firstName,
                        lastName: a.lastName,
                      });
                    })
                  }
                >
                  <AppleLogo />
                  <span>
                    {busy
                      ? 'Continuing…'
                      : mode === 'login'
                        ? 'Log in with Apple'
                        : 'Sign up with Apple'}
                  </span>
                </button>
              ) : null}
              {isGoogleSignInConfigured() ? (
                <button
                  type="button"
                  className="auth-google"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await ensureLegalAccepted();
                      const g = await signInWithGoogleWeb();
                      await finishGoogle(token, {
                        idToken: g.idToken,
                        firstName: g.firstName,
                        lastName: g.lastName,
                      });
                    })
                  }
                >
                  <GoogleLogo />
                  <span>
                    {busy
                      ? 'Continuing…'
                      : mode === 'login'
                        ? 'Log in with Google'
                        : 'Sign up with Google'}
                  </span>
                </button>
              ) : null}
            </div>
            <p className="auth-note">or use email</p>
            {mode === 'register' ? (
              <form
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  void run(async () => {
                    await ensureLegalAccepted();
                    await finishRegister(token, {
                      email,
                      password,
                      firstName,
                      lastName,
                    });
                  });
                }}
              >
                <label>First name</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                <label>Last name</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <label>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                <p className="auth-note">You must be 18 or older to use Rent Your Ride.</p>
                <button className="auth-cta" type="submit" disabled={busy}>
                  {busy ? 'Signing up…' : 'SIGN UP'}
                </button>
              </form>
            ) : (
              <form
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  void run(async () => {
                    await ensureLegalAccepted();
                    await finishLogin(token, { email, password });
                  });
                }}
              >
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <label>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button className="auth-cta" type="submit" disabled={busy}>
                  {busy ? 'Logging in…' : 'LOG IN'}
                </button>
              </form>
            )}
            {isAuthenticated && me && !me.emailVerified ? (
              <p>
                Check your inbox, then{' '}
                <button type="button" className="auth-link-btn" onClick={() => void startEmailVerification()}>
                  resend verification
                </button>
                .
              </p>
            ) : null}
          </div>
        ) : null}

        {showComplete && session ? (
          <div className="finish-card">
            <h2 className="finish-card-title">Send this request</h2>
            <p>Only what’s left. You can do these on this page without leaving the car.</p>

            <div className={`finish-task${phoneDone ? ' is-done' : ''}`}>
              <div>
                <strong>Phone</strong>
                <p>{phoneDone ? 'Verified' : 'A one-time code to your phone — not to staff.'}</p>
              </div>
              {phoneDone ? (
                <span className="finish-task-ok">Done</span>
              ) : (
                <button type="button" className="trips-btn trips-btn--primary" onClick={() => setPhoneOpen(true)}>
                  Verify
                </button>
              )}
            </div>
            <PhoneVerificationModal
              open={phoneOpen}
              onClose={() => setPhoneOpen(false)}
              onVerified={async () => {
                setPhoneOpen(false);
                await load();
              }}
              initialCountryCode="CA"
              initialCallingCode="1"
              initialNationalPhone=""
            />

            <div className={`finish-task${licenceDone ? ' is-done' : ''}`}>
              <div>
                <strong>Licence</strong>
                <p>{licenceDone ? 'Verified' : 'Secure Didit check on this device.'}</p>
              </div>
              {licenceDone ? (
                <span className="finish-task-ok">Done</span>
              ) : (
                <button
                  type="button"
                  className="trips-btn trips-btn--primary"
                  disabled={!me}
                  onClick={() => setLicenceOpen(true)}
                >
                  Verify
                </button>
              )}
            </div>
            {me ? (
              <LicenseVerificationModal
                open={licenceOpen}
                onClose={() => setLicenceOpen(false)}
                me={me}
                reload={async () => {
                  await load();
                }}
              />
            ) : null}

            <div className={`finish-task${cardDone ? ' is-done' : ''}`}>
              <div>
                <strong>Card</strong>
                <p>{cardDone ? 'Saved' : 'Added on your device. Staff never see the number.'}</p>
              </div>
              {cardDone ? <span className="finish-task-ok">Done</span> : null}
            </div>
            {!cardDone ? (
              <AddCardPanel
                onSaved={() => {
                  void load();
                }}
              />
            ) : null}

            <label className="finish-legal">
              <input
                type="checkbox"
                checked={agreedRental || session.legal.rentalAgreement}
                onChange={(e) => setAgreedRental(e.target.checked)}
              />
              <span>
                I agree to the{' '}
                <Link to="/terms-conditions?section=terms-conditions" target="_blank" rel="noreferrer">
                  rental agreement
                </Link>{' '}
                for this trip.
              </span>
            </label>
            <button
              type="button"
              className="auth-cta"
              disabled={
                busy ||
                !phoneDone ||
                !licenceDone ||
                !cardDone ||
                !(agreedRental || session.legal.rentalAgreement)
              }
              onClick={() =>
                run(async () => {
                  if (!(agreedRental || session.legal.rentalAgreement)) {
                    throw new Error('Please agree to the rental agreement.');
                  }
                  await acceptFinishLegal(token, ['rental_agreement']);
                  const booking = (await acceptFinishBooking(token)) as { id?: string };
                  if (booking?.id) setDoneId(booking.id);
                })
              }
            >
              {busy ? 'Sending…' : 'SEND BOOKING REQUEST'}
            </button>
          </div>
        ) : null}
      </main>
    </>
  );
}
