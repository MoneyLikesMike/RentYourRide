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
    // Anchor links target their own element.
    if (hash) return;
    // Auth modals render over the page behind them — leave it where it is.
    const overlay = (state as { backgroundLocation?: unknown } | null)
      ?.backgroundLocation;
    if (overlay) return;

    window.scrollTo(0, 0);
  }, [pathname, hash, state, navigationType]);

  return null;
}
