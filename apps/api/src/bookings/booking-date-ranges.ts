import { BookingStatus } from '../entities/booking.entity';

/** Statuses that reserve listing dates for other guests. */
export const DATE_BLOCKING_BOOKING_STATUSES: BookingStatus[] = [
  'pending_host',
  'confirmed',
  'checkin_pending',
  'active',
  'extension_pending',
  'extended',
  'extension_declined',
  'checkout_pending',
];

export type DateRangeMs = { start: number; end: number };

const DEFAULT_TZ = 'America/Winnipeg';

/** Calendar-day key in the product timezone (UTC midnight for that civil date). */
function dayKeyMs(ms: number, tz = DEFAULT_TZ): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(ms));
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const d = Number(parts.find((p) => p.type === 'day')?.value);
  if (!y || !m || !d) return Number.NaN;
  return Date.UTC(y, m - 1, d);
}

/** Normalize booking/manual ranges to inclusive calendar-day timestamps. */
export function toDayRangeMs(startRaw: unknown, endRaw: unknown): DateRangeMs | null {
  const startMs = Number(startRaw);
  const endMs = Number(endRaw);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  const start = dayKeyMs(startMs);
  const end = dayKeyMs(endMs);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return { start, end };
}

/** Inclusive day-range overlap (same semantics as mobile CalendarScreen). */
export function dayRangesOverlap(a: DateRangeMs, b: DateRangeMs): boolean {
  return a.start <= b.end && b.start <= a.end;
}

export function bookingDatesToDayRange(
  bookingDates: Record<string, unknown> | null | undefined,
): DateRangeMs | null {
  if (!bookingDates) return null;
  return toDayRangeMs(bookingDates.start, bookingDates.end);
}

export function manualAvailabilityToDayRanges(
  availability: Array<{ start?: string; end?: string }> | null | undefined,
): DateRangeMs[] {
  if (!Array.isArray(availability)) return [];
  const out: DateRangeMs[] = [];
  for (const r of availability) {
    if (!r?.start || !r?.end) continue;
    const startMs = Date.parse(r.start);
    const endMs = Date.parse(r.end);
    const range = toDayRangeMs(startMs, endMs);
    if (range) out.push(range);
  }
  return out;
}

export function dayRangesToIso(ranges: DateRangeMs[]): Array<{ start: string; end: string }> {
  return ranges.map((r) => ({
    start: new Date(r.start).toISOString(),
    end: new Date(r.end).toISOString(),
  }));
}
