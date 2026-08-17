import { useCallback, useState } from 'react';
import {
  clearStudioSession,
  getStudioUser,
  studioLogin,
  studioManagesProduction,
} from '../api/studio';
import type { AuthUser } from '../api/types';
import PageMeta from '../components/PageMeta';
import ArticlesPanel from '../components/studio/ArticlesPanel';
import { errorMessage } from '../components/studio/helpers';
import TeamPanel from '../components/studio/TeamPanel';
import '../styles/studio.css';

type Tab = 'articles' | 'team';

const managesProduction = studioManagesProduction();

function StudioLogin({ onSignedIn }: { onSignedIn: (user: AuthUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await studioLogin(email.trim(), password));
    } catch (err) {
      setError(errorMessage(err, 'Sign in failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="studio-login">
      <form className="studio-login-card" onSubmit={submit}>
        <h1 className="studio-login-title">Studio</h1>
        <p className="studio-login-copy">
          Sign in with your admin account to manage articles and the team.
        </p>
        {managesProduction ? (
          <p className="studio-live-notice">
            Live production Studio — published changes appear on rentyourride.ca
            without a website deployment.
          </p>
        ) : null}

        <label className="studio-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            autoComplete="username"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="studio-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error ? <p className="studio-error">{error}</p> : null}

        <button className="studio-button studio-button--primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

export default function StudioPage() {
  const [user, setUser] = useState<AuthUser | null>(() => getStudioUser());
  const [tab, setTab] = useState<Tab>('articles');

  const signOut = useCallback(() => {
    clearStudioSession();
    setUser(null);
  }, []);

  if (!user) {
    return (
      <>
        <PageMeta title="Studio | Rent Your Ride" noindex />
        <StudioLogin onSignedIn={setUser} />
      </>
    );
  }

  return (
    <div className="studio">
      <PageMeta title="Studio | Rent Your Ride" noindex />

      <header className="studio-topbar">
        <div>
          <div className="studio-brand-row">
            <h1 className="studio-brand">Studio</h1>
            {managesProduction ? (
              <span className="studio-live-badge">Live production</span>
            ) : null}
          </div>
          <p className="studio-account">{user.email}</p>
        </div>

        <nav className="studio-tabs" aria-label="Studio sections">
          <button
            type="button"
            className={`studio-tab${tab === 'articles' ? ' is-active' : ''}`}
            onClick={() => setTab('articles')}
          >
            Articles
          </button>
          <button
            type="button"
            className={`studio-tab${tab === 'team' ? ' is-active' : ''}`}
            onClick={() => setTab('team')}
          >
            Team
          </button>
        </nav>

        <div className="studio-topbar-actions">
          <a
            className="studio-button"
            href={`https://www.rentyourride.ca${tab === 'team' ? '/about' : '/news'}`}
            target="_blank"
            rel="noreferrer"
          >
            View live site
          </a>
          <button type="button" className="studio-button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      {tab === 'articles' ? (
        <ArticlesPanel onUnauthorized={signOut} />
      ) : (
        <TeamPanel onUnauthorized={signOut} />
      )}
    </div>
  );
}
