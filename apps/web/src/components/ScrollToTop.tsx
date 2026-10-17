import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Router navigation keeps the previous page's scroll offset, so a link placed
 * far down a page (home "Read More") used to open the next page mid-content.
 */
export default function ScrollToTop() {
  const { pathname, hash, state } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    // Back/forward should land where the user left off.
    if (navigationType === 'POP') return;
    // Auth modals render over the page behind them — leave it where it is.
    const overlay = (state as { backgroundLocation?: unknown } | null)
      ?.backgroundLocation;
    if (overlay) return;

    if (hash) {
      const id = decodeURIComponent(hash.replace(/^#/, ''));
      if (!id) return;
      // SPA content mounts after navigation; retry once if the target isn't ready.
      const scrollToHash = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return true;
        }
        return false;
      };
      if (!scrollToHash()) {
        requestAnimationFrame(() => {
          scrollToHash();
        });
      }
      return;
    }

    window.scrollTo(0, 0);
  }, [pathname, hash, state, navigationType]);

  return null;
}
