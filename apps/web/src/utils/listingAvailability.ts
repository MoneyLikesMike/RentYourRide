export type ApiAvailabilityRange = { start: string; end: string };

export type CalendarBlockedRange = { start: number; end: number };

export type ListRideCalendarData = {
  blockedRanges: CalendarBlockedRange[];
  hoursOpen?: string;
  hoursClose?: string;
  open24Hours?: boolean;
};

/** Map calendar blocked ranges (ms timestamps) to API availability windows (ISO strings). */
export function calendarDataToApiRanges(
  calendarData: ListRideCalendarData | null | undefined,
): ApiAvailabilityRange[] {
  const ranges = calendarData?.blockedRanges;
  if (!Array.isArray(ranges) || ranges.length === 0) return [];
  return ranges
    .filter((r) => r?.start != null && r?.end != null)
    .map((r) => ({
      start: new Date(r.start).toISOString(),
      end: new Date(r.end).toISOString(),
    }));
}

/** Map API availability to in-app calendarData shape. */
export function apiRangesToCalendarData(
  availability: ApiAvailabilityRange[] | null | undefined,
): ListRideCalendarData | null {
  if (!Array.isArray(availability) || availability.length === 0) return null;
  const blockedRanges = availability
    .filter((r) => r?.start && r?.end)
    .map((r) => ({
      start: new Date(r.start).getTime(),
      end: new Date(r.end).getTime(),
    }));
  if (blockedRanges.length === 0) return null;
  return { blockedRanges };
}

/** Prefer listing.calendarData / blockedRanges from public detail DTO. */
export function listingToBlockedCalendarData(listing: {
  calendarData?: {
    blockedRanges?: Array<{ start: number | string; end: number | string }>;
  } | null;
  blockedRanges?: ApiAvailabilityRange[] | null;
  availability?: ApiAvailabilityRange[] | null;
}): ListRideCalendarData | null {
  const fromCalendar = listing.calendarData?.blockedRanges;
  if (Array.isArray(fromCalendar) && fromCalendar.length > 0) {
    const blockedRanges = fromCalendar
      .filter((r) => r?.start != null && r?.end != null)
      .map((r) => ({
        start:
          typeof r.start === 'number' ? r.start : Date.parse(String(r.start)),
        end: typeof r.end === 'number' ? r.end : Date.parse(String(r.end)),
      }))
      .filter((r) => Number.isFinite(r.start) && Number.isFinite(r.end));
    if (blockedRanges.length === 0) return null;
    return { blockedRanges };
  }
  const fromBlocked = apiRangesToCalendarData(listing.blockedRanges);
  if (fromBlocked) return fromBlocked;
  return apiRangesToCalendarData(listing.availability);
}

export function tripOverlapsBlocked(
  startMs: number,
  endMs: number,
  calendar: ListRideCalendarData | null | undefined,
): boolean {
  const ranges = calendar?.blockedRanges;
  if (!ranges?.length) return false;
  return ranges.some((r) => startMs <= r.end && r.start <= endMs);
}
