/**
 * Booking times are the car's local wall-clock time (like Turo/Airbnb), never the
 * guest's device time. The server turns a trip date + picked time into an exact
 * instant using the listing's timezone.
 */

export const DEFAULT_BOOKING_TZ = 'America/Winnipeg';

/** [province code (exact case), province name, timezone] */
const PROVINCE_TZ: Array<[string, RegExp, string]> = [
  ['MB', /manitoba/i, 'America/Winnipeg'],
  ['ON', /ontario/i, 'America/Toronto'],
  ['QC', /qu[eé]bec/i, 'America/Toronto'],
  ['SK', /saskatchewan/i, 'America/Regina'],
  ['AB', /alberta/i, 'America/Edmonton'],
  ['BC', /british columbia/i, 'America/Vancouver'],
  ['NS', /nova scotia/i, 'America/Halifax'],
  ['NB', /new brunswick/i, 'America/Moncton'],
  ['PE', /prince edward island/i, 'America/Halifax'],
  ['NL', /newfoundland/i, 'America/St_Johns'],
  ['YT', /yukon/i, 'America/Whitehorse'],
  ['NT', /northwest territories/i, 'America/Yellowknife'],
  ['NU', /nunavut/i, 'America/Iqaluit'],
];

function provinceTimeZone(segment: string): string | null {
  const codes: string[] = segment.match(/\b[A-Z]{2}\b/g) ?? [];
  const hit = PROVINCE_TZ.find(([code, name]) => codes.includes(code) || name.test(segment));
  return hit ? hit[2] : null;
}

/** Listing timezone from its address (province), falling back to Winnipeg. */
export function listingTimeZone(
  listing: { pickupAddress?: string | null; city?: string | null } | null | undefined,
): string {
  const parts = [listing?.pickupAddress, listing?.city].filter(
    (p): p is string => typeof p === 'string' && p.trim() !== '',
  );
  for (const text of parts) {
    // Province usually sits right before the postal code / country: "..., Winnipeg, MB R3B 3N2, Canada".
    const segments = text.split(',').map((s) => s.trim()).reverse();
    for (const seg of segments) {
      const tz = provinceTimeZone(seg);
      if (tz) return tz;
    }
  }
  return DEFAULT_BOOKING_TZ;
}

function zonedParts(ms: number, tz: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute') };
}

function offsetMs(ms: number, tz: string): number {
  const p = zonedParts(ms, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - Math.floor(ms / 60000) * 60000;
}

/** Exact instant for a wall-clock date + minutes-after-midnight in `tz`. */
export function zonedWallTimeToUtc(ymd: string, minutes: number, tz: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  const wall = Date.UTC(y, m - 1, d, 0, minutes);
  let guess = wall - offsetMs(wall, tz);
  guess = wall - offsetMs(guess, tz);
  return guess;
}

/** "YYYY-MM-DD" for `ms` in `tz`. */
export function ymdInZone(ms: number, tz: string): string {
  const p = zonedParts(ms, tz);
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

/** "10:00 AM" → 600. Returns null for anything unparseable. */
export function parseTimeLabel(label: unknown): number | null {
  const m = String(label ?? '').trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ampm = m[3]?.toUpperCase();
  if (min > 59 || h > 23 || (ampm && (h < 1 || h > 12))) return null;
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

/** 600 → "10:00 AM" (same format the app uses). */
export function formatTimeLabel(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h24 % 12 || 12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

/** "CT", "ET", "MT", … for display next to a booking time. */
export function timeZoneShortName(tz: string, ms = Date.now()): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortGeneric' })
    .formatToParts(new Date(ms))
    .find((p) => p.type === 'timeZoneName');
  return part?.value ?? '';
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const HALF_HOUR = 30 * 60 * 1000;

/**
 * Trip date the guest picked. New clients send it explicitly; older app builds send
 * midnight of that date in the phone's timezone (02:00–11:00 UTC across North America),
 * otherwise the timestamp is a full date-time and we read its date in the car's timezone.
 */
export function tripDateFromClient(ms: number, explicit: unknown, tz: string): string {
  if (typeof explicit === 'string' && YMD.test(explicit)) return explicit;
  const utcMinutes = new Date(ms).getUTCHours() * 60 + new Date(ms).getUTCMinutes();
  const looksLikeDeviceMidnight = ms % HALF_HOUR === 0 && utcMinutes >= 120 && utcMinutes <= 660;
  if (looksLikeDeviceMidnight) return new Date(ms).toISOString().slice(0, 10);
  return ymdInZone(ms, tz);
}

export interface NormalizedBookingDates {
  start: number;
  end: number;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  timeZone: string;
}

/** Server-authoritative booking dates in the car's timezone. */
export function normalizeBookingDates(
  raw: Record<string, unknown> | null | undefined,
  tz: string,
): NormalizedBookingDates | null {
  const startMs = Number(raw?.start);
  const endMs = Number(raw?.end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  const startDate = tripDateFromClient(startMs, raw?.startDate, tz);
  const endDate = tripDateFromClient(endMs, raw?.endDate, tz);
  const startMin = parseTimeLabel(raw?.startTime) ?? zonedParts(startMs, tz).h * 60 + zonedParts(startMs, tz).min;
  const endMin = parseTimeLabel(raw?.endTime) ?? zonedParts(endMs, tz).h * 60 + zonedParts(endMs, tz).min;
  return {
    start: zonedWallTimeToUtc(startDate, startMin, tz),
    end: zonedWallTimeToUtc(endDate, endMin, tz),
    startTime: formatTimeLabel(startMin),
    endTime: formatTimeLabel(endMin),
    startDate,
    endDate,
    timeZone: tz,
  };
}
