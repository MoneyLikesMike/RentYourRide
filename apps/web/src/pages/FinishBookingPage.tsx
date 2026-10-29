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

const STEPS = ['legal', 'account', 'phone', 'licence', 'card', 'review'] as const;

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

  const load = async () => {
    const data = await getFinishSession(token);
    setSession(data);
    if (isAuthenticated) {
      try {
        setMe(await getMe());
      } catch {
        setMe(null);
      }
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

  return (
    <>
      <PageMeta title="Finish your booking" />
      <SiteHeader />
      <main className="finish-page">
        <h1>Finish your booking</h1>
        {session ? (
          <p className="finish-muted">
            Hi {session.leadFirstName}. This secure Rent Your Ride link expires{' '}
            {new Date(session.expiresAt).toLocaleString()}.
          </p>
        ) : null}
        {error ? <p className="finish-error">{error}</p> : null}

        {session ? (
          <div className="finish-steps">
            {STEPS.map((s) => (
              <span
                key={s}
                className={`finish-step${session.checklist[s] ? ' is-done' : ''}${step === s ? ' is-current' : ''}`}
              >
                {s}
              </span>
            ))}
          </div>
        ) : null}

        {doneId || session?.bookingId ? (
          <div className="finish-card">
            <p>Your booking request is in. The host will respond in the app or on the website.</p>
            <Link to={`/profile/trips/${doneId || session?.bookingId}`}>View trip</Link>
          </div>
        ) : null}

        {session && step === 'legal' ? (
          <div className="finish-card">
            <p>
              Before we continue, please accept Rent Your Ride’s{' '}
              <Link to="/terms-conditions">Terms</Link> (v{session.legalVersions.terms}) and{' '}
              <Link to="/terms-conditions">Privacy Policy</Link> (v{session.legalVersions.privacy}).
            </p>
            <div className="finish-actions">
              <button
                type="button"
                className="trips-btn trips-btn--primary"
                disabled={busy}
                onClick={() => run(() => acceptFinishLegal(token, ['terms', 'privacy']))}
              >
                I agree
              </button>
            </div>
          </div>
        ) : null}

        {session && step === 'account' ? (
          <div className="finish-card">
            <p>Create your own Rent Your Ride account on this device. Staff cannot set a password for you.</p>
            <div className="finish-actions">
              <button type="button" onClick={() => setMode('register')}>
                Create account
              </button>
              <button type="button" onClick={() => setMode('login')}>
                Sign in
              </button>
            </div>
            {mode === 'register' ? (
              <form
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  void run(() =>
                    finishRegister(token, {
                      email,
                      password,
                      firstName,
                      lastName,
                    }),
                  );
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
                <div className="finish-actions">
                  <button type="submit" className="trips-btn trips-btn--primary" disabled={busy}>
                    Create account
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  void run(() => finishLogin(token, { email, password }));
                }}
              >
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <label>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <div className="finish-actions">
                  <button type="submit" className="trips-btn trips-btn--primary" disabled={busy}>
                    Sign in
                  </button>
                </div>
              </form>
            )}
            <div className="finish-actions">
              {isGoogleSignInConfigured() ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const g = await signInWithGoogleWeb();
                      await finishGoogle(token, { idToken: g.idToken, firstName: g.firstName, lastName: g.lastName });
                    })
                  }
                >
                  Continue with Google
                </button>
              ) : null}
              {isAppleSignInConfigured() ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
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
                  Continue with Apple
                </button>
              ) : null}
            </div>
            {isAuthenticated && me && !me.emailVerified ? (
              <p>
                Check your inbox, then{' '}
                <button type="button" onClick={() => void startEmailVerification()}>
                  resend verification
                </button>
                .
              </p>
            ) : null}
          </div>
        ) : null}

        {session && step === 'phone' ? (
          <div className="finish-card">
            <p>Verify your mobile number. We’ll text a one-time code to you, not to staff.</p>
            <button type="button" className="trips-btn trips-btn--primary" onClick={() => setPhoneOpen(true)}>
              Verify phone
            </button>
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
          </div>
        ) : null}

        {session && step === 'licence' && me ? (
          <div className="finish-card">
            <p>Upload your driver’s licence through Didit’s secure flow.</p>
            <button type="button" className="trips-btn trips-btn--primary" onClick={() => setLicenceOpen(true)}>
              Verify licence
            </button>
            <LicenseVerificationModal
              open={licenceOpen}
              onClose={() => setLicenceOpen(false)}
              me={me}
              reload={async () => {
                await load();
              }}
            />
          </div>
        ) : null}

        {session && step === 'card' ? (
          <div className="finish-card">
            <p>Add your card on this device. Card numbers never go to Rent Your Ride staff or this page’s server logs.</p>
            <AddCardPanel
              onSaved={() => {
                void load();
              }}
              onCancel={() => undefined}
            />
          </div>
        ) : null}

        {session && step === 'review' ? (
          <div className="finish-card">
            <h2>{session.draft.title}</h2>
            <p>
              {session.draft.city} · total{' '}
              {typeof session.draft.quote.grandTotal === 'number'
                ? `$${session.draft.quote.grandTotal.toFixed(2)}`
                : '—'}
            </p>
            <p>
              I agree to the rental agreement (v{session.legalVersions.rental_agreement}) for this trip.
            </p>
            <div className="finish-actions">
              <button
                type="button"
                className="trips-btn trips-btn--primary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await acceptFinishLegal(token, ['rental_agreement']);
                    const booking = (await acceptFinishBooking(token)) as { id?: string };
                    if (booking?.id) setDoneId(booking.id);
                  })
                }
              >
                Accept and send request
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}
