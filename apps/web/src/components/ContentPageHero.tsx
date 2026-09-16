import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

type Props = {
  crumb: string;
};

/** Fraction of the scroll distance the artwork drifts by. */
const PARALLAX_SPEED = 0.55;
/** Slack above and below the banner, as a fraction of its height. Mirrors the
 * `top`/`height` of `.content-hero-image`. */
const PARALLAX_OVERFLOW = 0.5;

/** Full-bleed banner + Main › Page breadcrumb (Zeplin About / Terms). */
export default function ContentPageHero({ crumb }: Props) {
  const heroRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const image = imageRef.current;
    if (!hero || !image) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const scrolled = Math.max(0, -hero.getBoundingClientRect().top);
      const slack = hero.offsetHeight * PARALLAX_OVERFLOW;
      const shift = Math.min(scrolled * PARALLAX_SPEED, slack);
      image.style.transform = `translate3d(0, ${shift}px, 0)`;
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className="content-hero" ref={heroRef}>
      <img
        src="/roads-illustration.png"
        alt=""
        className="content-hero-image"
        ref={imageRef}
      />
      <div className="content-hero-scrim" aria-hidden />
      <nav className="content-hero-crumb" aria-label="Breadcrumb">
        <Link to="/" className="content-hero-crumb-link">
          Main
        </Link>
        <span className="content-hero-crumb-sep" aria-hidden>
          ›
        </span>
        <span className="content-hero-crumb-current">{crumb}</span>
      </nav>
    </div>
  );
}
