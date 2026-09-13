import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ApiError } from '../api/http';
import { getMe, type MeUser } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import PageMeta from './PageMeta';
import ProfileSidebar, { type OverviewStats } from './ProfileSidebar';
import SiteHeader from './SiteHeader';

type Props = {
  children: (me: MeUser, reload: () => Promise<void>) => ReactNode;
  /** Browser tab label for this account screen. */
  title?: string;
  overviewSidebar?: boolean;
  overviewStats?: OverviewStats;
};

export default function ProfileLayout({
  children,
  title,
  overviewSidebar,
  overviewStats,
}: Props) {
  const { isAuthenticated, applyMeUser } = useAuth();
  const location = useLocation();
  const [me, setMe] = useState<MeUser | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setStatus('loading');
    setError(null);
    try {
      const data = await getMe();
      setMe(data);
      applyMeUser(data);
      setStatus('ok');
    } catch (err) {
      setStatus('error');
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not load profile',
      );
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on path change
  }, [isAuthenticated, location.pathname]);

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return (
    <div className="profile-page">
      <PageMeta title={`${title ?? 'Account'} | Rent Your Ride`} noindex />
      <SiteHeader />
      <div className="profile-shell">
        <ProfileSidebar
          me={me}
          mode={overviewSidebar ? 'overview' : 'nav'}
          overviewStats={overviewStats}
        />
        <div className="profile-main">
          {status === 'loading' && !me ? (
            <p className="profile-status">Loading profile…</p>
          ) : null}
          {status === 'error' && !me ? (
            <p className="profile-error">{error}</p>
          ) : null}
          {me ? children(me, load) : null}
        </div>
      </div>
    </div>
  );
}
