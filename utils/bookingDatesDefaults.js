import { formatTripDateTime } from './guestBookingFormat';

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const DEFAULT_TRIP_DAY_SPAN = 6;

export function getTimeToMinutes(timeStr) {
  const [clock, ampmRaw] = String(timeStr).split(' ');
  const [hStr, mStr] = clock.split(':');
  const ampm = ampmRaw?.toUpperCase();
  let h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

export function timeStringFromMinutes(totalMins) {
  const capped = Math.min(Math.max(0, totalMins), 23 * 60 + 30);
  const h24 = Math.floor(capped / 60);
  const m = capped % 60;
  const hour12 = h24 % 12 || 12;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const minStr = m === 0 ? '00' : String(m);
  return `${hour12}:${minStr} ${ampm}`;
}

/** Next 30-minute slot from now (e.g. 4:47 PM → 5:00 PM). */
export function defaultTripStartTime() {
  const now = new Date();
  const totalMins = now.getHours() * 60 + now.getMinutes();
  const rounded = Math.min(Math.ceil(totalMins / 30) * 30, 23 * 60 + 30);
  return timeStringFromMinutes(rounded);
}

export function defaultTripEndTime(startTime = defaultTripStartTime()) {
  const startMins = getTimeToMinutes(startTime);
  const preferredEnd = getTimeToMinutes('10:30 PM');
  if (preferredEnd > startMins) return '10:30 PM';
  const endMins = Math.min(
    Math.max(Math.ceil((startMins + 8 * 60) / 30) * 30, startMins + 30),
    23 * 60 + 30,
  );
  return timeStringFromMinutes(endMins);
}

export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Default guest trip: today through six days later, with current start/end times. */
export function createDefaultBookingDates({ tripDaySpan = DEFAULT_TRIP_DAY_SPAN } = {}) {
  const start = startOfDay(new Date());
  const end = startOfDay(new Date());
  end.setDate(end.getDate() + tripDaySpan);
  const startTime = defaultTripStartTime();
  return {
    start: start.getTime(),
    end: end.getTime(),
    startTime,
    endTime: defaultTripEndTime(startTime),
  };
}

export function resolveBookingDates(routeDates) {
  if (routeDates?.start != null && routeDates?.end != null) return routeDates;
  return createDefaultBookingDates();
}

export function formatVehicleDetailDateLine(timestamp, timeStr) {
  const { dateLine, timeLine } = formatTripDateTime(timestamp, timeStr);
  if (!dateLine) return '';
  return `${dateLine} - ${timeLine}`;
}

export function formatSearchDateRangeShort(bookingDates) {
  if (bookingDates?.start == null || bookingDates?.end == null) return '';
  const start = new Date(bookingDates.start);
  const end = new Date(bookingDates.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  return `${MONTH_NAMES_SHORT[start.getMonth()]} ${start.getDate()} - ${MONTH_NAMES_SHORT[end.getMonth()]} ${end.getDate()}`;
}

export function formatSearchDatesDetail(bookingDates) {
  if (bookingDates?.start == null || bookingDates?.end == null) return '';
  const start = new Date(bookingDates.start);
  const end = new Date(bookingDates.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  return `${MONTH_NAMES_SHORT[start.getMonth()]} ${start.getDate()}, ${bookingDates.startTime || defaultTripStartTime()} - ${MONTH_NAMES_SHORT[end.getMonth()]} ${end.getDate()}, ${bookingDates.endTime || defaultTripEndTime()}`;
}

export function isTodayDate(d) {
  if (!d) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
