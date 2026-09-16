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
