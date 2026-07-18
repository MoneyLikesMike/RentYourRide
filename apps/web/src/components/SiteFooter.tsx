import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const GET_STARTED_LINKS = [
  { title: 'Contact Us', path: '/contact-us' },
  { title: 'Rent a car', path: '/find-your-car' },
  { title: 'List a car', path: '/profile/list-your-ride' },
] as const;

const LEARN_MORE_LINKS = [
  { title: 'About', path: '/about' },
  { title: 'Terms & Conditions', path: '/terms-conditions' },
  { title: 'Privacy Policy', path: '/privacy-policy' },
  { title: 'Insurance', path: '/insurance' },
] as const;

export default function SiteFooter() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const isHome =
    location.pathname === '/' || location.pathname === '/home';
  const backgroundImage = isHome
    ? '/footer/homeFooter.png'
    : '/footer/footer.png';

  const go = (path: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (
      !isAuthenticated &&
      (path === '/find-your-car' || path === '/profile/list-your-ride')
    ) {
      navigate('/login', { state: { from: path } });
      return;
    }
    navigate(path);
  };

  const openHowItWorks = () => {
    if (isHome) {
      window.dispatchEvent(new CustomEvent('ryr:how-it-works'));
      return;
    }
    navigate('/', { state: { openHowItWorks: true } });
  };

  return (
    <footer className="site-footer">
      <img src={backgroundImage} className="site-footer-image" alt="" />
      <div className="site-footer-wrapper">
        <div className="site-footer-left">
          <div className="site-footer-brand">
            <Link to="/">
              <img src="/logo.png" alt="RentYourRide" className="site-footer-logo" />
            </Link>
            <span className="site-footer-company">
              © 2026 RentYourRide Ltd. - All Rights Reserved
            </span>
          </div>

          <div className="site-footer-nav">
            <div className="site-footer-links">
              <span className="site-footer-links-caption">Get started</span>
              {GET_STARTED_LINKS.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  className="site-footer-link"
                  onClick={() => go(item.path)}
                >
                  {item.title}
                </button>
              ))}
              <button
                type="button"
                className="site-footer-link"
                onClick={openHowItWorks}
              >
                How it works?
              </button>
            </div>

            <div className="site-footer-links">
              <span className="site-footer-links-caption">Learn more</span>
              {LEARN_MORE_LINKS.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  className="site-footer-link"
                  onClick={() => go(item.path)}
                >
                  {item.title}
                </button>
              ))}
            </div>
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
          </div>
        </div>
      </div>
    </footer>
  );
}
