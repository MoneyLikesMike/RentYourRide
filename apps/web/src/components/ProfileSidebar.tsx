import { NavLink } from 'react-router-dom';
import { resolveAvatarUrl, type MeUser } from '../api/users';

export type OverviewStats = {
  rides: number;
  rating: number;
  reviews: number;
};

type Props = {
  me: MeUser | null;
  mode?: 'nav' | 'overview';
  overviewStats?: OverviewStats;
};

function verificationStepsLeft(me: MeUser | null): number {
  if (!me) return 3;
  let n = 0;
  if (!me.emailVerified) n += 1;
  if (!me.phoneVerified) n += 1;
  if (!me.licenseVerified) n += 1;
  return n;
}

function joinedLabel(me: MeUser | null): string | null {
  if (!me?.createdAt) return null;
  const y = new Date(me.createdAt).getFullYear();
  if (!Number.isFinite(y)) return null;
  return `Joined in ${y}`;
}

export default function ProfileSidebar({
  me,
  mode = 'nav',
  overviewStats,
}: Props) {
  const name = me?.fullName || me?.firstName || 'Account';
  const from =
    [me?.addressCity, me?.addressCountry]
      .filter(Boolean)
      .join(', ')
      .toUpperCase() || 'CANADA';
  const joined = joinedLabel(me);
  const stepsLeft = verificationStepsLeft(me);
  const progress = Math.round(((3 - stepsLeft) / 3) * 100);
  const rides = overviewStats?.rides ?? 0;
  const rating = overviewStats?.rating ?? 0;
  const reviews = overviewStats?.reviews ?? 0;

  return (
    <aside className="profile-sidebar">
      <div className="profile-sidebar-user">
        <img
          src={resolveAvatarUrl(me?.avatarUrl)}
          alt=""
          className="profile-sidebar-avatar"
        />
        <div className="profile-sidebar-user-info">
          <span className="profile-sidebar-name">{name}</span>
          {mode === 'overview' && joined ? (
            <span className="profile-sidebar-joined">{joined}</span>
          ) : null}
          <span className="profile-sidebar-from">{from}</span>
        </div>
      </div>

      {mode === 'overview' ? (
        <div className="profile-sidebar-overview">
          <div className="profile-sidebar-verify">
            <div className="profile-sidebar-verify-row">
              <span>EMAIL</span>
              {me?.emailVerified ? (
                <img
                  src="/profile/check.png"
                  alt="Verified"
                  className="profile-sidebar-check"
                />
              ) : (
                <NavLink
                  to="/profile/contact-information"
                  className="profile-sidebar-action"
                >
                  Verify
                </NavLink>
              )}
            </div>
            <div className="profile-sidebar-verify-row">
              <span>MOBILE PHONE</span>
              {me?.phoneVerified ? (
                <img
                  src="/profile/check.png"
                  alt="Verified"
                  className="profile-sidebar-check"
                />
              ) : (
                <NavLink
                  to="/profile/contact-information"
                  className="profile-sidebar-action"
                >
                  Verify
                </NavLink>
              )}
            </div>
            <div className="profile-sidebar-verify-row">
              <span>LICENSE</span>
              {me?.licenseVerified ? (
                <img
                  src="/profile/check.png"
                  alt="Verified"
                  className="profile-sidebar-check"
                />
              ) : (
                <NavLink
                  to="/profile/contact-information"
                  className="profile-sidebar-action"
                >
                  Verify
                </NavLink>
              )}
            </div>
          </div>

          <div className="profile-sidebar-stats">
            <div className="profile-sidebar-stat">
              <img src="/profile/car.png" alt="" />
              <span>
                {rides} RIDE{rides === 1 ? '' : 'S'}
              </span>
            </div>
            <div className="profile-sidebar-stat">
              <img src="/profile/star.png" alt="" />
              <span>
                {rating > 0 ? `${rating.toFixed(1)} / 5` : '— / 5'}
              </span>
            </div>
            <div className="profile-sidebar-stat">
              <img src="/profile/reviews.png" alt="" />
              <span>
                {reviews} REVIEW{reviews === 1 ? '' : 'S'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <nav className="profile-sidebar-nav">
          {stepsLeft > 0 ? (
            <div className="profile-sidebar-progress">
              <span className="profile-sidebar-steps">
                {stepsLeft} step{stepsLeft === 1 ? '' : 's'} left
              </span>
              <span className="profile-sidebar-bar">
                <span
                  className="profile-sidebar-bar-fill"
                  style={{ width: `${progress}%` }}
                />
              </span>
              <span className="profile-sidebar-progress-copy">
                Verify your email, phone, and licence to book or list a ride.
              </span>
            </div>
          ) : null}

          <span className="profile-sidebar-section">Profile</span>
          <ul>
            <li>
              <NavLink to="/profile/overview">Profile overview</NavLink>
            </li>
            <li>
              <NavLink to="/profile/edit">Edit profile</NavLink>
            </li>
          </ul>

          <span className="profile-sidebar-section">Account settings</span>
          <ul>
            <li>
              <NavLink to="/profile/contact-information">
                Contact information
              </NavLink>
            </li>
            <li>
              <NavLink to="/profile/notifications">Notifications</NavLink>
            </li>
            <li>
              <NavLink to="/profile/payment-information">
                Payment information
              </NavLink>
            </li>
            <li>
              <NavLink to="/profile/referrals-credits">
                Referrals &amp; Credits
              </NavLink>
            </li>
          </ul>

          <span className="profile-sidebar-section">Listing</span>
          <ul>
            <li>
              <NavLink to="/profile/trips">Trips</NavLink>
            </li>
            <li>
              <NavLink to="/profile/your-rides">Your rides</NavLink>
            </li>
            <li>
              <NavLink to="/profile/favourites">Favourites</NavLink>
            </li>
            <li>
              <NavLink to="/profile/list-your-ride">+ List your ride</NavLink>
            </li>
          </ul>
        </nav>
      )}
    </aside>
  );
}
