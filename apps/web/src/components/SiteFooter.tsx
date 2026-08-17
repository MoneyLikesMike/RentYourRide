import { Link, useLocation, useNavigate } from 'react-router-dom';
import { withAuthBackground } from '../auth/authModal';
import { useAuth } from '../auth/AuthContext';
import { goToHomeTop } from '../utils/goToHomeTop';
import { CONTACT_MAILTO } from './SiteHeader';
import { AppStoreBadge, GooglePlayBadge } from './StoreBadges';

const APP_STORE_URL =
  'https://apps.apple.com/us/app/rent-your-ride/id1495074000';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.rentyourrideca';

const HOME_TOP = '__home_top__';

const FOOTER_COLUMNS = [
  {
    caption: 'Get started',
    links: [
      { title: 'Rent a Ride', path: HOME_TOP },
      { title: 'List a Ride', path: '/profile/list-your-ride' },
    ],
  },
  {
    caption: 'Company',
    links: [{ title: 'About', path: '/about' }],
  },
  {
    caption: 'Learn more',
    links: [
      { title: 'Learn', path: '/learn' },
      { title: 'News', path: '/news' },
      { title: 'How It Works', path: '/how-it-works' },
      { title: 'FAQ', path: '/faq' },
      { title: 'Insurance', path: '/insurance' },
      { title: 'Policies', path: '/terms-conditions' },
    ],
  },
  {
    caption: 'Support',
    links: [{ title: 'Contact Us', path: '/contact' }],
  },
] as const;

const AUTH_GATED = new Set(['/profile/list-your-ride']);

export default function SiteFooter() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const backgroundImage = '/footer/footer.png';

  const go = (path: string) => {
    if (path === HOME_TOP) {
      goToHomeTop(navigate, location.pathname);
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!isAuthenticated && AUTH_GATED.has(path)) {
      navigate('/login', {
        state: withAuthBackground(location, { from: path }),
      });
      return;
    }
    navigate(path);
  };

  return (
    <footer className="site-footer">
      <img src={backgroundImage} className="site-footer-image" alt="" />
      <div className="site-footer-wrapper">
        <div className="site-footer-left">
          <div className="site-footer-brand">
            <Link to="/">
              <img src="/logo.png" alt="Rent Your Ride" className="site-footer-logo" />
            </Link>
            <span className="site-footer-company">
              © 2026 RentYourRide Ltd. - All Rights Reserved
            </span>
            <div className="site-footer-stores">
              <a
                href={APP_STORE_URL}
                className="site-footer-store-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <AppStoreBadge className="site-footer-store-badge" />
              </a>
              <a
                href={PLAY_STORE_URL}
                className="site-footer-store-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GooglePlayBadge className="site-footer-store-badge" />
              </a>
            </div>
          </div>

          <div className="site-footer-nav">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.caption} className="site-footer-links">
                <span className="site-footer-links-caption">{column.caption}</span>
                {column.links.map((item) => (
                  <button
                    key={`${column.caption}-${item.title}`}
                    type="button"
                    className="site-footer-link"
                    onClick={() => go(item.path)}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="site-footer-share">
          <span className="site-footer-share-caption">Stay in touch</span>
          <div className="site-footer-share-links">
            <a
              className="site-footer-share-btn"
              href="https://instagram.com/rentyourride.ca?igshid=1miw2561m1v5o"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <img src="/footer/instagram.png" alt="" className="site-footer-social" />
            </a>
            <a
              className="site-footer-share-btn"
              href="https://www.facebook.com/rentyourride.ca/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <img
                src="/footer/facebook.png"
                alt=""
                className="site-footer-social facebook"
              />
            </a>
            <a
              className="site-footer-share-btn"
              href="https://x.com/rentyourride"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X"
            >
              <img src="/footer/x.svg" alt="" className="site-footer-social" />
            </a>
            <a
              className="site-footer-share-btn"
              href="https://www.tiktok.com/@rentyourride"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
            >
              <img src="/footer/tiktok.svg" alt="" className="site-footer-social" />
            </a>
            <a
              className="site-footer-share-btn"
              href="https://www.youtube.com/@rentyourride"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
            >
              <img
                src="/footer/youtube.svg"
                alt=""
                className="site-footer-social youtube"
              />
            </a>
            <a
              className="site-footer-share-btn"
              href={CONTACT_MAILTO}
              aria-label="Email"
            >
              <img
                src="/footer/email.svg"
                alt=""
                className="site-footer-social email"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
