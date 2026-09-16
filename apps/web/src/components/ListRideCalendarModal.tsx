import { useEffect, useMemo, useState } from 'react';
import type { ListRideCalendarData } from '../utils/listingAvailability';
import '../styles/list-ride-calendar-modal.css';

type DateRange = { start: Date; end: Date };

type Props = {
  open: boolean;
  initial: ListRideCalendarData | null;
  onClose: () => void;
  onSave: (data: ListRideCalendarData) => void;
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TIME_OPTIONS = (() => {
  const opts: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour12 = h % 12 || 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      const minStr = m === 0 ? '00' : String(m);
      opts.push(`${hour12}:${minStr} ${ampm}`);
    }
  }
  return opts;
})();

const getOrdinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const formatBlockedRange = (start: Date, end: Date) => {
  const month = MONTH_NAMES[start.getMonth()].toUpperCase();
  const startDay = getOrdinal(start.getDate());
  const endDay = getOrdinal(end.getDate());
  const year = start.getFullYear();
  if (start.getTime() === end.getTime()) {
    return `${month} ${startDay}, ${year} - ${month} ${endDay}, ${year}`;
  }
  const endMonth = MONTH_NAMES[end.getMonth()].toUpperCase();
  const endYear = end.getFullYear();
  return `${month} ${startDay}, ${year} - ${endMonth} ${endDay}, ${endYear}`;
};

const getDaysInMonth = (year: number, month: number) => {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const daysInMonth = last.getDate();
  const startWeekday = first.getDay();
  const offset = startWeekday === 0 ? 6 : startWeekday - 1;
  return { daysInMonth, offset };
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isInRange = (d: Date, start: Date, end: Date) => {
  const t = d.getTime();
  return t >= start.getTime() && t <= end.getTime();
};

const rangesOverlap = (a: DateRange, b: DateRange) =>
  a.start.getTime() <= b.end.getTime() && b.start.getTime() <= a.end.getTime();

const mergeBlockedRanges = (
  prev: DateRange[],
  newStart: Date,
  newEnd: Date,
): DateRange[] => {
  const newRange = { start: newStart, end: newEnd };
  const overlapping = prev.filter((r) => rangesOverlap(r, newRange));
  const nonOverlapping = prev.filter((r) => !rangesOverlap(r, newRange));
  if (overlapping.length === 0) {
    return [...prev, { start: newStart, end: newEnd }];
  }
  const all = [...overlapping, newRange];
  const mergedStart = new Date(Math.min(...all.map((x) => x.start.getTime())));
  const mergedEnd = new Date(Math.max(...all.map((x) => x.end.getTime())));
  return [...nonOverlapping, { start: mergedStart, end: mergedEnd }];
};

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const parseInitial = (saved: ListRideCalendarData | null): DateRange[] => {
  if (!saved?.blockedRanges?.length) return [];
  return saved.blockedRanges.map((r) => ({
    start: new Date(r.start),
    end: new Date(r.end),
  }));
};

export default function ListRideCalendarModal({
  open,
  initial,
  onClose,
  onSave,
}: Props) {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [blockedRanges, setBlockedRanges] = useState<DateRange[]>([]);
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);
  const [hoursOpen, setHoursOpen] = useState('9:00 AM');
  const [hoursClose, setHoursClose] = useState('5:00 PM');
  const [open24Hours, setOpen24Hours] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBlockedRanges(parseInitial(initial));
    setHoursOpen(initial?.hoursOpen ?? '9:00 AM');
    setHoursClose(initial?.hoursClose ?? '5:00 PM');
    setOpen24Hours(initial?.open24Hours ?? false);
    setSelectionStart(null);
    setSelectionEnd(null);
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const { daysInMonth, offset } = useMemo(
    () => getDaysInMonth(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const calendarRows = useMemo(() => {
    const blanks = Array(offset).fill(null) as (number | null)[];
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const all = [...blanks, ...days];
    const rows: (number | null)[][] = [];
    for (let i = 0; i < all.length; i += 7) {
      const row = all.slice(i, i + 7);
      while (row.length < 7) row.push(null);
      rows.push(row);
    }
    return rows;
  }, [offset, daysInMonth]);

  if (!open) return null;

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDatePress = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    const todayStartMs = startOfDay(new Date());
    if (startOfDay(date) < todayStartMs) return;

    if (!selectionStart) {
      setSelectionStart(date);
      setSelectionEnd(null);
      return;
    }
    if (selectionEnd) {
      setSelectionStart(date);
      setSelectionEnd(null);
      return;
    }
    const start =
      selectionStart.getTime() <= date.getTime() ? selectionStart : date;
    const end =
      selectionStart.getTime() <= date.getTime() ? date : selectionStart;
    if (startOfDay(start) < todayStartMs) return;
    setBlockedRanges((prev) => mergeBlockedRanges(prev, start, end));
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const removeBlockedRange = (index: number) => {
    setBlockedRanges((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBlock = () => {
    let finalBlocked = blockedRanges;
    if (selectionStart) {
      const end = selectionEnd || selectionStart;
      const s =
        selectionStart.getTime() <= end.getTime() ? selectionStart : end;
      const e =
        selectionStart.getTime() <= end.getTime() ? end : selectionStart;
      if (startOfDay(s) >= startOfDay(new Date())) {
        finalBlocked = mergeBlockedRanges(blockedRanges, s, e);
      }
    }
    onSave({
      blockedRanges: finalBlocked.map((r) => ({
        start: r.start.getTime(),
        end: r.end.getTime(),
      })),
      hoursOpen,
      hoursClose,
      open24Hours,
    });
  };

  const getDateState = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    const selStart = selectionStart && isSameDay(date, selectionStart);
    const selEnd = selectionEnd && isSameDay(date, selectionEnd);
    const inSelectionRange = Boolean(
      selectionStart &&
        (selStart ||
          selEnd ||
          isInRange(date, selectionStart, selectionEnd || selectionStart)),
    );
    const isSelectionStart = Boolean(
      selectionStart && isSameDay(date, selectionStart),
    );
    const isSelectionEnd = selectionEnd
      ? isSameDay(date, selectionEnd)
      : Boolean(selectionStart && isSameDay(date, selectionStart));
    const inSelectionMiddle =
      inSelectionRange && !isSelectionStart && !isSelectionEnd;

    const blockedRange = blockedRanges.find((r) =>
      isInRange(date, r.start, r.end),
    );
    const inBlockedRange = !!blockedRange;
    const isBlockedStart = Boolean(
      blockedRange && isSameDay(date, blockedRange.start),
    );
    const isBlockedEnd = Boolean(
      blockedRange && isSameDay(date, blockedRange.end),
    );
    const inBlockedMiddle = inBlockedRange && !isBlockedStart && !isBlockedEnd;
    const isSundayDate = date.getDay() === 0;
    const isPastDate = startOfDay(date) < startOfDay(new Date());

    return {
      inSelectionRange,
      isSelectionStart,
      isSelectionEnd,
      inSelectionMiddle,
      inBlockedRange,
      isBlockedStart,
      isBlockedEnd,
      inBlockedMiddle,
      isSundayDate,
      isPastDate,
    };
  };

  return (
    <div
      className="lyr-cal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="lyr-cal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lyr-cal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="lyr-cal-header">
          <button
            type="button"
            className="lyr-cal-back"
            onClick={onClose}
            aria-label="Close calendar"
          >
            <svg width="23" height="23" viewBox="0 0 48 48" fill="none">
              <path
                d="M31 8L17 24L31 40"
                stroke="#FFB131"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h2 id="lyr-cal-title" className="lyr-cal-title">
            Calendar
          </h2>
          <span className="lyr-cal-header-spacer" aria-hidden />
        </header>

        <div className="lyr-cal-body">
          <div className="lyr-cal-month-bar">
            <button
              type="button"
              className="lyr-cal-month-arrow"
              onClick={prevMonth}
              aria-label="Previous month"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="#9B9B9B"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className="lyr-cal-month-center">
              <img
                src="/list-ride/calendar-icon.png"
                alt=""
                width={18}
                height={18}
              />
              <span>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
            </div>
            <button
              type="button"
              className="lyr-cal-month-arrow"
              onClick={nextMonth}
              aria-label="Next month"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 18l6-6-6-6"
                  stroke="#9B9B9B"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className="lyr-cal-grid">
            <div className="lyr-cal-weekdays">
              {WEEKDAYS.map((d) => (
                <span key={d} className="lyr-cal-weekday">
                  {d}
                </span>
              ))}
            </div>
            {calendarRows.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="lyr-cal-week">
                {row.map((day, colIndex) => {
                  if (day === null) {
                    return (
                      <span
                        key={`e-${rowIndex}-${colIndex}`}
                        className="lyr-cal-day is-empty"
                      />
                    );
                  }
                  const state = getDateState(day);
                  const useSelection = state.inSelectionRange;
                  const useBlocked = state.inBlockedRange && !useSelection;
                  const isStart = useSelection
                    ? state.isSelectionStart
                    : useBlocked && state.isBlockedStart;
                  const isEnd = useSelection
                    ? state.isSelectionEnd
                    : useBlocked && state.isBlockedEnd;
                  const isMiddle = useSelection
                    ? state.inSelectionMiddle
                    : useBlocked && state.inBlockedMiddle;
                  const isSingle = Boolean(isStart && isEnd);

                  const classes = [
                    'lyr-cal-day',
                    state.isPastDate ? 'is-past' : '',
                    state.isSundayDate && !useSelection && !useBlocked
                      ? 'is-sunday'
                      : '',
                    useSelection && isSingle ? 'is-select-single' : '',
                    useSelection && isStart && !isEnd ? 'is-select-start' : '',
                    useSelection && isEnd && !isStart ? 'is-select-end' : '',
                    useSelection && isMiddle ? 'is-select-middle' : '',
                    useBlocked && isSingle ? 'is-block-single' : '',
                    useBlocked && isStart && !isEnd ? 'is-block-start' : '',
                    useBlocked && isEnd && !isStart ? 'is-block-end' : '',
                    useBlocked && isMiddle ? 'is-block-middle' : '',
                    (isStart || isEnd) && (useSelection || useBlocked)
                      ? 'is-endpoint'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <button
                      key={day}
                      type="button"
                      className={classes}
                      disabled={state.isPastDate}
                      onClick={() => handleDatePress(day)}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <section className="lyr-cal-dates">
            <h3 className="lyr-cal-section-title">Dates</h3>
            {blockedRanges.length === 0 && !selectionStart ? (
              <p className="lyr-cal-empty">No blocked dates</p>
            ) : null}
            {blockedRanges.map((range, index) => (
              <div key={`${range.start.getTime()}-${index}`} className="lyr-cal-blocked-row">
                <button
                  type="button"
                  className="lyr-cal-blocked-x"
                  onClick={() => removeBlockedRange(index)}
                  aria-label="Remove blocked range"
                >
                  ✕
                </button>
                <span>{formatBlockedRange(range.start, range.end)}</span>
              </div>
            ))}
            {selectionStart ? (
              <div className="lyr-cal-blocked-row is-pending">
                <span>
                  {formatBlockedRange(
                    selectionStart,
                    selectionEnd || selectionStart,
                  )}
                </span>
              </div>
            ) : null}
          </section>

          <section className="lyr-cal-hours">
            <h3 className="lyr-cal-section-title">Hours of operation</h3>
            <p className="lyr-cal-hours-desc">
              Set the hours when your vehicle is available. Bookings outside
              these hours will be prevented.
            </p>
            <label className="lyr-cal-hours-toggle">
              <span>Available 24 hours a day</span>
              <input
                type="checkbox"
                className="lyr-cal-switch"
                checked={open24Hours}
                onChange={(e) => setOpen24Hours(e.target.checked)}
              />
            </label>
            {!open24Hours ? (
              <div className="lyr-cal-hours-row">
                <label className="lyr-cal-hours-field">
                  <span>From</span>
                  <select
                    className="lyr-cal-hours-select"
                    value={hoursOpen}
                    onChange={(e) => setHoursOpen(e.target.value)}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={`open-${t}`} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="lyr-cal-hours-field">
                  <span>To</span>
                  <select
                    className="lyr-cal-hours-select"
                    value={hoursClose}
                    onChange={(e) => setHoursClose(e.target.value)}
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={`close-${t}`} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
          </section>
        </div>

        <footer className="lyr-cal-footer">
          <button type="button" className="lyr-cal-block-btn" onClick={handleBlock}>
            BLOCK
          </button>
        </footer>
      </div>
    </div>
  );
}
