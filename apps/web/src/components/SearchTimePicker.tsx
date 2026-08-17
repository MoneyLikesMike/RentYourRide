import { useEffect, useRef, useState } from 'react';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** 15-minute steps — matches legacy react-datepicker timeIntervals. */
export const SEARCH_TIME_OPTIONS: string[] = (() => {
  const opts: string[] = [];
  for (let h = 0; h < 24; h += 1) {
    for (const m of [0, 15, 30, 45]) {
      opts.push(`${pad(h)}:${pad(m)}`);
    }
  }
  return opts;
})();

export function formatSearchTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  let h = Number(hStr);
  const mins = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(mins)) return '';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h %= 12;
  if (h === 0) h = 12;
  return `${h}:${pad(mins)} ${ampm}`;
}

/** Snap arbitrary HH:mm to the nearest 15-minute option. */
export function snapSearchTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '10:00';
  const total = h * 60 + m;
  const snapped = Math.round(total / 15) * 15;
  const clamped = ((snapped % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  'aria-label': string;
  className?: string;
};

/**
 * Custom time menu — native `<input type="time">` pickers often fail to open
 * when the control is visually restyled (home / FYC / listing trip bar).
 */
export default function SearchTimePicker({
  value,
  onChange,
  'aria-label': ariaLabel,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const selected = snapSearchTime(value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const list = listRef.current;
    const el = list.querySelector<HTMLElement>('[data-selected="true"]');
    if (!el) return;
    // Scroll only inside the menu — never the page (scrollIntoView jumps the window).
    const top =
      el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2;
    list.scrollTop = Math.max(0, top);
  }, [open, selected]);

  return (
    <div
      className={`search-time-picker${className ? ` ${className}` : ''}${open ? ' is-open' : ''}`}
      ref={rootRef}
    >
      <button
        type="button"
        className="search-time-picker-btn"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="search-time-picker-value">
          {formatSearchTime(selected)}
        </span>
        <span className="search-time-picker-chevron" aria-hidden />
      </button>
      {open ? (
        <ul
          className="search-time-picker-menu"
          role="listbox"
          aria-label={ariaLabel}
          ref={listRef}
        >
          {SEARCH_TIME_OPTIONS.map((t) => {
            const isSelected = t === selected;
            return (
              <li key={t} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-selected={isSelected ? 'true' : undefined}
                  className={`search-time-picker-option${isSelected ? ' is-selected' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(t);
                    setOpen(false);
                  }}
                >
                  {formatSearchTime(t)}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
