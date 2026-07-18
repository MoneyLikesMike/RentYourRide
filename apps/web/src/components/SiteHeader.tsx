import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

type Props = {
  onHowItWorks?: () => void;
};

export default function SiteHeader({ onHowItWorks }: Props) {
  const { isAuthenticated, user, signOut } = useAuth();

  return (
    <header className="header-wrapper">
      <Link to="/" className="logo-wrapper">
        <img src="/logo.png" alt="RentYourRide" className="logo-image" />
      </Link>
      <nav className="navigation">
        <Link to="/" className="link">
          Home
        </Link>
        <button type="button" className="link" onClick={onHowItWorks}>
          How it works?
        </button>
        <span className="link link--muted">Insurance</span>
        <div className="nav-border" />
        {isAuthenticated ? (
          <div className="user-info-wrapper">
            <Link to="/profile/edit" className="link user-name">
              {user?.firstName || user?.email || 'Account'}
            </Link>
            <button type="button" className="link logout" onClick={signOut}>
              Logout
            </button>
          </div>
        ) : (
          <>
            <Link to="/signup" className="link">
              Sign up
            </Link>
            <Link to="/login" className="link">
              Log in
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
