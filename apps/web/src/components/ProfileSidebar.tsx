import { NavLink } from 'react-router-dom';
import { resolveAvatarUrl, type MeUser } from '../api/users';

type Props = {
  me: MeUser | null;
  mode?: 'nav' | 'overview';
};

function verificationStepsLeft(me: MeUser | null): number {
  if (!me) return 3;
  let n = 0;
  if (!me.emailVerified) n += 1;
  if (!me.phoneVerified) n += 1;
  if (!me.licenseVerified) n += 1;
  return n;
}

export default function ProfileSidebar({ me, mode = 'nav' }: Props) {
  const name = me?.fullName || me?.firstName || 'Account';
  const from = [me?.addressCity, me?.addressCountry]
    .filter(Boolean)
    .join(', ')
    .toUpperCase() || 'CANADA';
  const stepsLeft = verificationStepsLeft(me);
  const progress = Math.round(((3 - stepsLeft) / 3) * 100);

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
          <span className="profile-sidebar-from">{from}</span>
        </div>
      </div>

      {mode === 'overview' ? (
        <div className="profile-sidebar-verify">
          <div className="profile-sidebar-verify-row">
            <span>EMAIL</span>
            {me?.emailVerified ? (
              <span className="profile-sidebar-ok">Verified</span>
            ) : (
              <NavLink to="/profile/contact-information" className="profile-sidebar-action">
                Verify
              </NavLink>
            )}
          </div>
          <div className="profile-sidebar-verify-row">
            <span>MOBILE PHONE</span>
            {me?.phoneVerified ? (
              <span className="profile-sidebar-ok">Verified</span>
            ) : (
              <NavLink to="/profile/contact-information" className="profile-sidebar-action">
                Verify
              </NavLink>
            )}
          </div>
          <div className="profile-sidebar-verify-row">
            <span>LICENCE</span>
            {me?.licenseVerified ? (
              <span className="profile-sidebar-ok">Verified</span>
            ) : (
              <NavLink to="/profile/contact-information" className="profile-sidebar-action">
                Verify
              </NavLink>
            )}
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
              <NavLink to="/profile/edit">Edit Profile</NavLink>
            </li>
            <li>
              <NavLink to="/profile/overview">Profile Overview</NavLink>
            </li>
          </ul>

          <span className="profile-sidebar-section">Account settings</span>
          <ul>
            <li>
              <NavLink to="/profile/contact-information">
                Contact Information
              </NavLink>
            </li>
            <li>
              <span className="profile-sidebar-muted">Notifications</span>
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
              <NavLink to="/profile/your-rides">Your rides</NavLink>
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
