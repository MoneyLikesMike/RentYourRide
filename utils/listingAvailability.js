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

/**
 * Guest/host calendar payload for a listing.
 * Prefer public calendarData/blockedRanges; fall back to host availability.
 */
export function resolveListingCalendarData(listing) {
  if (!listing || typeof listing !== 'object') return null;
  if (listing.calendarData?.blockedRanges?.length) return listing.calendarData;
  const fromBlocked = apiRangesToCalendarData(listing.blockedRanges);
  if (fromBlocked) return fromBlocked;
  return apiRangesToCalendarData(listing.availability);
}

const startOfLocalDayMs = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** Inclusive day-range overlap (same semantics as CalendarScreen / Nest booking checks). */
export function dayRangesOverlapMs(aStart, aEnd, bStart, bEnd) {
  const aS = startOfLocalDayMs(aStart);
  const aE = startOfLocalDayMs(aEnd);
  const bS = startOfLocalDayMs(bStart);
  const bE = startOfLocalDayMs(bEnd);
  if (aS == null || aE == null || bS == null || bE == null) return false;
  const aLo = Math.min(aS, aE);
  const aHi = Math.max(aS, aE);
  const bLo = Math.min(bS, bE);
  const bHi = Math.max(bS, bE);
  return aLo <= bHi && bLo <= aHi;
}

/** True when guest bookingDates overlap any host blocked range on the listing. */
export function bookingOverlapsListingBlocks(bookingDates, listingOrCalendarData) {
  if (bookingDates?.start == null || bookingDates?.end == null) return false;
  const calendarData = resolveListingCalendarData(listingOrCalendarData);
  const ranges = calendarData?.blockedRanges;
  if (!Array.isArray(ranges) || ranges.length === 0) return false;
  return ranges.some((r) => dayRangesOverlapMs(bookingDates.start, bookingDates.end, r.start, r.end));
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
