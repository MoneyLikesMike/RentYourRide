/** Map calendar blocked ranges (ms timestamps) to API availability windows (ISO strings). */
export function calendarDataToApiRanges(calendarData) {
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
export function apiRangesToCalendarData(availability) {
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

export function buildListingAvailabilityPatch({
  advanceNotice,
  shortestTrip,
  longestTrip,
  dailyKm,
  existingExtras,
}) {
  return {
    instantBooking: advanceNotice === 'Instant booking',
    dailyKm: dailyKm || null,
    extras: {
      ...(existingExtras && typeof existingExtras === 'object' ? existingExtras : {}),
      advanceNotice: advanceNotice || '',
      shortestTrip: shortestTrip || '',
      longestTrip: longestTrip || '',
    },
  };
}
