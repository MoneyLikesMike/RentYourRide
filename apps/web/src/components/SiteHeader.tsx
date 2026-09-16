import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { resolveAvatarUrl } from '../api/users';
import { withAuthBackground } from '../auth/authModal';
import { useAuth } from '../auth/AuthContext';
import { useMessagingUnread } from '../auth/MessagingUnreadContext';

type Props = {
  /** Optional content shown beside the logo (e.g. Find Your Car location search). */
  afterLogo?: ReactNode;
};

export const CONTACT_MAILTO =
  `mailto:support@rentyourride.ca` +
  `?subject=${encodeURIComponent('Rent Your Ride - Support')}` +
  `&body=${encodeURIComponent(
    'Hello,\n\nI need help with Rent Your Ride. Please find my message below:\n\n\n\nThank you,',
  )}`;

export const CONTACT_CHAT_URL = 'https://m.me/rentyourride.ca';

const MENU_LINKS = [
  { label: 'Trips', to: '/profile/trips' },
  { label: 'Profile overview', to: '/profile/overview' },
  { label: 'Edit profile', to: '/profile/edit' },
  { label: 'Contact information', to: '/profile/contact-information' },
  { label: 'Notifications', to: '/profile/notifications' },
  { label: 'Payment information', to: '/profile/payment-information' },
  { label: 'Referrals & Credits', to: '/profile/referrals-credits' },
  { label: 'Your rides', to: '/profile/your-rides' },
  { label: 'Favourites', to: '/profile/favourites' },
  { label: 'List your ride', to: '/profile/list-your-ride' },
] as const;

function SandwichIcon() {
  return (
    <svg
      className="header-sandwich-icon"
      width="22"
      height="16"
      viewBox="0 0 22 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M1 1.5h20M1 8h20M1 14.5h20"
        stroke="#17252a"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function SiteHeader({ afterLogo }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, signOut } = useAuth();
  const { unreadTotal } = useMessagingUnread();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const avatarSrc = resolveAvatarUrl(user?.avatarUrl);
  const avatarAlt = user?.firstName
    ? `${user.firstName}'s profile`
    : 'Profile';
  const authState = withAuthBackground(location);
  const badgeLabel =
    unreadTotal > 99 ? '99+' : unreadTotal > 0 ? String(unreadTotal) : null;

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const onLogout = () => {
    setMenuOpen(false);
    signOut();
    navigate('/');
  };

  return (
    <header
      className={`header-wrapper${afterLogo ? ' header-wrapper--with-search' : ''}`}
    >
      <div className="header-left">
        <Link to="/" className="logo-wrapper">
          <img src="/logo.png" alt="Rent Your Ride" className="logo-image" />
        </Link>
        {afterLogo ? <div className="header-after-logo">{afterLogo}</div> : null}
      </div>
      <nav className="navigation">
        <Link to="/about" className="link">
          About
        </Link>
        <Link to="/learn" className="link">
          Learn
        </Link>
        <Link className="link" to="/contact">
          Contact Us
        </Link>
        <div className="nav-border" />
        {isAuthenticated ? (
          <div className="user-info-wrapper">
            <Link
              to="/messages"
              className="messages-link"
              aria-label={
                badgeLabel ? `Messages, ${unreadTotal} unread` : 'Messages'
              }
            >
              <span className="messages-icon-wrap">
                <img src="/messages.png" alt="" className="messages-icon" />
                {badgeLabel ? (
                  <span className="messages-unread-badge" aria-hidden>
                    {badgeLabel}
                  </span>
                ) : null}
              </span>
              <span className="link message">Messages</span>
            </Link>
            <div className="header-menu" ref={menuRef}>
              <button
                type="button"
                className={`header-profile-btn${menuOpen ? ' is-open' : ''}`}
                aria-label="Account menu"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((v) => !v)}
              >
                <span className="header-sandwich" aria-hidden>
                  <SandwichIcon />
                </span>
                <img
                  src={avatarSrc}
                  alt={avatarAlt}
                  className="user-avatar"
                />
              </button>
              {menuOpen ? (
                <div className="header-menu-panel" role="menu">
                  {MENU_LINKS.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="header-menu-item"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    className="header-menu-item header-menu-item--logout"
                    role="menuitem"
                    onClick={onLogout}
                  >
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <Link to="/signup" className="link" state={authState}>
              Sign up
            </Link>
            <Link to="/login" className="link" state={authState}>
              Log in
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
