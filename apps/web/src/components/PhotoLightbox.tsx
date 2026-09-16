import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ListingMediaItem } from '../api/listings';

type Props = {
  photos: Array<string | ListingMediaItem>;
  index: number;
  title?: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

function normalizeItem(item: string | ListingMediaItem): ListingMediaItem {
  if (typeof item === 'string') {
    const isVideo = /\.(mp4|mov|m4v|webm)(\?|$)/i.test(item);
    return { url: item, type: isVideo ? 'video' : 'image' };
  }
  return item;
}

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

/** Full-screen media viewer (photos + muted-by-default listing videos). */
export default function PhotoLightbox({
  photos,
  index,
  title,
  onIndexChange,
  onClose,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const items = photos.map(normalizeItem);
  const total = items.length;

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

  const current = items[index] || items[0];
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
            aria-label="Previous"
          >
            <Chevron direction="left" />
          </button>
        ) : null}

        {current.type === 'video' ? (
          <video
            key={current.url}
            className="lightbox-image lightbox-video"
            src={current.url}
            controls
            playsInline
            muted
            preload="metadata"
          />
        ) : (
          <img className="lightbox-image" src={current.url} alt={title || ''} />
        )}

        {total > 1 ? (
          <button
            type="button"
            className="lightbox-nav lightbox-nav--next"
            onClick={() => onIndexChange((index + 1) % total)}
            aria-label="Next"
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
            {items.map((item, i) => (
              <button
                key={item.url + i}
                type="button"
                className={`lightbox-thumb${i === index ? ' active' : ''}`}
                onClick={() => onIndexChange(i)}
                aria-label={`${item.type === 'video' ? 'Video' : 'Photo'} ${i + 1}`}
              >
                {item.type === 'video' ? (
                  <span className="lightbox-thumb-video">Video</span>
                ) : (
                  <img src={item.url} alt="" />
                )}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
