import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const REVEAL =
  '.block-wrapper, .get-started-section, .experiences-section, .learn-card, .news-card, .about-row, .team-card, .help-topic, .help-contact-card, .trips-tile, .trips-card, .fyc-car-wrapper, .car-photos-column';

/**
 * Fade in content that is still below the fold. Anything already on screen
 * is left alone so it never flashes out and back in.
 */
export default function MotionObserver() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target;
          if (!(el instanceof HTMLElement)) continue;
          if (el.dataset.motion === 'done') continue;

          if (entry.intersectionRatio === 0) {
            const rect = el.getBoundingClientRect();
            const inView =
              rect.bottom > 8 && rect.top < window.innerHeight - 8;
            if (inView) {
              el.dataset.motion = 'done';
              io.unobserve(el);
              continue;
            }
            el.classList.add('motion-reveal');
            el.dataset.motion = 'hidden';
            continue;
          }

          if (el.dataset.motion === 'hidden') {
            el.classList.add('is-in');
            el.dataset.motion = 'in';
            el.addEventListener(
              'animationend',
              () => {
                el.classList.remove('motion-reveal', 'is-in');
                el.dataset.motion = 'done';
              },
              { once: true },
            );
          } else {
            el.dataset.motion = 'done';
          }
          io.unobserve(el);
        }
      },
      { threshold: [0, 0.08] },
    );

    const watch = (el: Element) => {
      if (!(el instanceof HTMLElement)) return;
      if (el.dataset.motion) return;
      el.dataset.motion = 'watch';
      io.observe(el);
    };

    const scan = () => {
      document.querySelectorAll(REVEAL).forEach(watch);
    };

    scan();
    const mo = new MutationObserver(scan);
    const root = document.getElementById('root');
    if (root) mo.observe(root, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}
