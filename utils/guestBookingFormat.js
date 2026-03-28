const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ordinal(n) {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

export function formatCardDateRange(bookingDates) {
  const start = bookingDates?.start;
  const end = bookingDates?.end;
  if (start == null || end == null) return '';
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '';
  const startStr = formatBookingLineFromDate(s, bookingDates?.startTime);
  const endStr = formatBookingLineFromDate(e, bookingDates?.endTime);
  return `From ${startStr} - ${endStr}`;
}

function formatBookingLineFromDate(d, timeOverride) {
  const mon = MONTHS[d.getMonth()];
  const day = ordinal(d.getDate());
  if (timeOverride && typeof timeOverride === 'string') {
    return `${mon} ${day} ${timeOverride.replace(/\s/g, '')}`;
  }
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const minP = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${mon} ${day} ${hours}:${minP}${ampm}`;
}

/** Check-in intro line, e.g. "Jan 26th, 2019 - 9:00 AM" */
export function formatCheckInTripStart(bookingDates) {
  const start = bookingDates?.start;
  if (start == null) return '';
  const d = new Date(start);
  if (Number.isNaN(d.getTime())) return '';
  const mon = MONTHS[d.getMonth()];
  const day = ordinal(d.getDate());
  const year = d.getFullYear();
  let timePart = '';
  if (bookingDates?.startTime && typeof bookingDates.startTime === 'string') {
    timePart = bookingDates.startTime.replace(/\s/g, '');
  } else {
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minP = minutes < 10 ? `0${minutes}` : `${minutes}`;
    timePart = `${hours}:${minP}${ampm}`;
  }
  return `${mon} ${day}, ${year} - ${timePart}`;
}

/** Trip end line for checkout intro, e.g. "Mar 31st, 2026 - 10:30PM" (same shape as formatCheckInTripStart). */
export function formatCheckInTripEnd(bookingDates) {
  const end = bookingDates?.end;
  if (end == null) return '';
  const d = new Date(end);
  if (Number.isNaN(d.getTime())) return '';
  const mon = MONTHS[d.getMonth()];
  const day = ordinal(d.getDate());
  const year = d.getFullYear();
  let timePart = '';
  if (bookingDates?.endTime && typeof bookingDates.endTime === 'string') {
    timePart = bookingDates.endTime.replace(/\s/g, '');
  } else {
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minP = minutes < 10 ? `0${minutes}` : `${minutes}`;
    timePart = `${hours}:${minP}${ampm}`;
  }
  return `${mon} ${day}, ${year} - ${timePart}`;
}

export function formatTripDateTime(ts, timeFallback) {
  if (ts == null || ts === '') return { dateLine: '', timeLine: '' };
  let ms = ts;
  if (typeof ts === 'string') {
    const t = ts.trim();
    if (/^\d+$/.test(t)) {
      ms = Number(t);
    } else {
      ms = t;
    }
  }
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return { dateLine: '', timeLine: '' };
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dayOrd = ordinal(d.getDate());
  const dateLine = `${months[d.getMonth()]} ${dayOrd.toUpperCase()}, ${d.getFullYear()}`;
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const minP = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const fromClock = `${hours}:${minP} ${ampm}`;
  /** Booked trip times from calendar (startTime / endTime strings); ignore empty / whitespace */
  let booked = '';
  if (typeof timeFallback === 'string' && timeFallback.trim()) {
    booked = timeFallback.trim();
  }
  const timeLine = booked || fromClock;
  return { dateLine, timeLine };
}
