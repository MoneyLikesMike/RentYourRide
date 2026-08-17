import { useEffect, useState } from 'react';
import TextDecorator from './TextDecorator';
import { APP_STORE_FIVE_STAR_REVIEWS } from '../content/appStoreReviews';

/** Keep the carousel readable — newest five-star reviews only. */
const REVIEWS = APP_STORE_FIVE_STAR_REVIEWS.slice(0, 10);
const AUTO_MS = 5500;

export default function CommunityExperiences() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = REVIEWS.length;
  const review = REVIEWS[index];

  useEffect(() => {
    if (paused || total <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % total);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused, total]);

  if (!review || total === 0) return null;

  const prev = () => setIndex((i) => (i - 1 + total) % total);
  const next = () => setIndex((i) => (i + 1) % total);

  return (
    <section className="experiences-section" aria-label="Community experiences">
      <div className="experiences-inner">
        <div className="experiences-heading-wrap">
          <img
            src="/home/circle.png"
            alt=""
            className="experiences-circle experiences-circle--a"
          />
          <img
            src="/home/circle.png"
            alt=""
            className="experiences-circle experiences-circle--b"
          />
          <img
            src="/home/small-circle.png"
            alt=""
            className="experiences-circle experiences-circle--c"
          />
          <h2 className="block-caption experiences-heading">
            <TextDecorator title="Experiences" width="11rem" /> from our{' '}
            <TextDecorator title="community" width="10rem" />
          </h2>
          <p className="experiences-lead">
            Real stories from hosts and guests who are earning extra cash,
            finding the perfect ride, and connecting across Canada — one trip
            at a time.
          </p>
        </div>

        <div
          className="experiences-carousel"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setPaused(false);
            }
          }}
        >
          <button
            type="button"
            className="experiences-nav experiences-nav--prev"
            onClick={prev}
            aria-label="Previous review"
          >
            ‹
          </button>

          <article
            className="experiences-review"
            key={`${review.author}-${review.updated}`}
          >
            <h3 className="experiences-review-title">{review.title}</h3>
            <div className="experiences-stars" aria-label="5 out of 5 stars">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} aria-hidden>
                  ★
                </span>
              ))}
            </div>
            <p className="experiences-review-body">{review.body}</p>
            <span className="experiences-review-author">{review.author}</span>
          </article>

          <button
            type="button"
            className="experiences-nav experiences-nav--next"
            onClick={next}
            aria-label="Next review"
          >
            ›
          </button>

          <div className="experiences-dots" role="tablist" aria-label="Reviews">
            {REVIEWS.map((r, i) => (
              <button
                key={`${r.author}-${r.updated}`}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Review ${i + 1} of ${total}`}
                className={
                  i === index
                    ? 'experiences-dot experiences-dot--active'
                    : 'experiences-dot'
                }
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
