import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  photos: string[];
  index: number;
  title?: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d={direction === 'left' ? 'M15 5 8 12l7 7' : 'M9 5l7 7-7 7'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Full-screen photo viewer, mirroring the gallery in the mobile app. */
export default function PhotoLightbox({
  photos,
  index,
  title,
  onIndexChange,
  onClose,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const total = photos.length;

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onIndexChange((index - 1 + total) % total);
      if (event.key === 'ArrowRight') onIndexChange((index + 1) % total);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [index, total, onClose, onIndexChange]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const current = photos[index] || photos[0];
  if (!current) return null;

  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={title ? `${title} photos` : 'Photos'}
      onClick={onClose}
    >
      <button
        ref={closeRef}
        type="button"
        className="lightbox-close"
        onClick={onClose}
        aria-label="Close photos"
      >
        <svg viewBox="0 0 24 24" aria-hidden focusable="false">
          <path
            d="M6 6l12 12M18 6L6 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
        {total > 1 ? (
          <button
            type="button"
            className="lightbox-nav lightbox-nav--prev"
            onClick={() => onIndexChange((index - 1 + total) % total)}
            aria-label="Previous photo"
          >
            <Chevron direction="left" />
          </button>
        ) : null}

        <img className="lightbox-image" src={current} alt={title || ''} />

        {total > 1 ? (
          <button
            type="button"
            className="lightbox-nav lightbox-nav--next"
            onClick={() => onIndexChange((index + 1) % total)}
            aria-label="Next photo"
          >
            <Chevron direction="right" />
          </button>
        ) : null}
      </div>

      {total > 1 ? (
        <div className="lightbox-footer" onClick={(e) => e.stopPropagation()}>
          <span className="lightbox-count">
            {index + 1} / {total}
          </span>
          <div className="lightbox-thumbs">
            {photos.map((url, i) => (
              <button
                key={url + i}
                type="button"
                className={`lightbox-thumb${i === index ? ' active' : ''}`}
                onClick={() => onIndexChange(i)}
                aria-label={`Photo ${i + 1}`}
              >
                <img src={url} alt="" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
