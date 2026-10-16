/**
 * Shared trip date rules for guest search / booking (RYRA-440, RYRA-441).
 * Uses the guest's local clock for web pickers and client-side clamps.
 */

export type TripDatesIssue = 'invalid' | 'past_start' | 'end_before_start';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** YYYY-MM-DD for `<input type="date" min>` in local time. */
export function todayDateInput(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toTimeInputValue(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Default “next hour on the hour” slot used by home search. */
export function nextValidTripStart(now = new Date()): Date {
  const d = new Date(now);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

export function validateTripDates(
  start: Date,
  end: Date,
  now = new Date(),
): TripDatesIssue | null {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'invalid';
  }
  if (start.getTime() < now.getTime()) return 'past_start';
  if (end.getTime() <= start.getTime()) return 'end_before_start';
  return null;
}

export function tripDatesErrorMessage(issue: TripDatesIssue): string {
  switch (issue) {
    case 'past_start':
      return 'Start must be in the future.';
    case 'end_before_start':
      return 'End must be after start.';
    default:
      return 'Choose valid start and end dates.';
  }
}

export function clampTripStart(start: Date, now = new Date()): Date {
  if (Number.isNaN(start.getTime()) || start.getTime() < now.getTime()) {
    return nextValidTripStart(now);
  }
  return start;
}

/** Clamp a past start (and end if needed) so search never quotes a past trip. */
export function ensureTripDatesNotPast(
  start: Date,
  end: Date,
  now = new Date(),
): { start: Date; end: Date; clamped: boolean } {
  const nextStart = clampTripStart(start, now);
  let nextEnd = end;
  let clamped = nextStart.getTime() !== start.getTime();
  if (Number.isNaN(nextEnd.getTime()) || nextEnd.getTime() <= nextStart.getTime()) {
    nextEnd = new Date(nextStart);
    nextEnd.setDate(nextEnd.getDate() + 1);
    clamped = true;
  }
  return { start: nextStart, end: nextEnd, clamped };
}
