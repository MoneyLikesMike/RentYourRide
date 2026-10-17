import type { MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { withAuthBackground } from '../auth/authModal';
import { useAuth } from '../auth/AuthContext';
import { APP_STORE_URL } from '../constants/appStore';
import { goToHomeTop } from '../utils/goToHomeTop';
import { CONTACT_MAILTO } from './SiteHeader';
import { AppStoreBadge } from './StoreBadges';

type FooterNavItem = {
  title: string;
  to: string;
  /** Scroll to home search hero instead of a normal navigation. */
  homeTop?: boolean;
};

const FOOTER_COLUMNS: { caption: string; links: FooterNavItem[] }[] = [
  {
    caption: 'Get started',
    links: [
      { title: 'Rent a Ride', to: '/', homeTop: true },
      { title: 'List a Ride', to: '/profile/list-your-ride' },
    ],
  },
  {
    caption: 'Company',
    links: [{ title: 'About', to: '/about' }],
  },
  {
    caption: 'Learn more',
    links: [
      { title: 'Learn', to: '/learn' },
      { title: 'News', to: '/news' },
      { title: 'How It Works', to: '/how-it-works' },
      { title: 'FAQ', to: '/insurance#faq' },
      { title: 'Insurance', to: '/insurance' },
      { title: 'Policies', to: '/terms-conditions' },
    ],
  },
  {
    caption: 'Support',
    links: [{ title: 'Contact Us', to: '/contact' }],
  },
];

const AUTH_GATED = new Set(['/profile/list-your-ride']);

function isPlainLeftClick(e: MouseEvent) {
  return (
    e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
  );
}

export default function SiteFooter() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const backgroundImage = '/footer/footer.png';

  const onNavClick = (e: MouseEvent, item: FooterNavItem) => {
    if (!isPlainLeftClick(e)) return;

    if (item.homeTop) {
      e.preventDefault();
      goToHomeTop(navigate, location.pathname);
      return;
    }

    const pathOnly = item.to.split('#')[0] || item.to;
    if (!isAuthenticated && AUTH_GATED.has(pathOnly)) {
      e.preventDefault();
      navigate('/login', {
        state: withAuthBackground(location, { from: pathOnly }),
      });
    }
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
            </div>
          </div>

          <div className="site-footer-nav">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.caption} className="site-footer-links">
                <span className="site-footer-links-caption">{column.caption}</span>
                {column.links.map((item) => (
                  <Link
                    key={`${column.caption}-${item.title}`}
                    to={item.to}
                    className="site-footer-link"
                    onClick={(e) => onNavClick(e, item)}
                  >
                    {item.title}
                  </Link>
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
