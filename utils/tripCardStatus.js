import { hasPartyCheckedOut } from './bookingCompletion';

const H24_MS = 24 * 60 * 60 * 1000;

/**
 * @returns {{ startMs: number, endMs: number } | null}
 */
export function getTripBoundsMs(booking) {
  const bd = booking?.bookingDates || {};
  const start = bd.start != null ? new Date(bd.start) : null;
  const end = bd.end != null ? new Date(bd.end) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  return { startMs: start.getTime(), endMs: end.getTime() };
}

/**
 * @returns {{ key: string, label: string }}
 */
export function getTripCardStatus(booking, nowMs = Date.now()) {
  const bounds = getTripBoundsMs(booking);
  if (!bounds) {
    return { key: 'unknown', label: '' };
  }

  const { startMs, endMs } = bounds;
  const ext = booking?.tripExtended === true && booking?.extensionApprovedByHost === true;
  const apiExtended = booking?.status === 'extended';
  if (ext || apiExtended) {
    return { key: 'extended', label: 'Extended' };
  }
  if (booking?.status === 'extension_pending') {
    return { key: 'extension_pending', label: 'Extension pending' };
  }

  // Trip fully done on the server, or past the post-trip checkout grace window.
  // Per-party checkout (guest done / host not) does NOT mark the whole trip completed.
  if (booking?.status === 'completed' || nowMs >= endMs + H24_MS) {
    return { key: 'completed', label: '' };
  }

  // Checkout window: 24h before end through 24h after end (unless completed above).
  if (nowMs >= endMs - H24_MS) {
    return { key: 'ending_soon', label: 'Ending soon' };
  }

  /** Guest or host long-pressed “start trip” on check-in reminder — show active trip until it ends */
  if (booking?.guestTripStartedAt != null || booking?.hostTripStartedAt != null) {
    return { key: 'in_progress', label: 'In progress' };
  }

  if (nowMs >= startMs - H24_MS && nowMs < startMs) {
    return { key: 'beginning_soon', label: 'Beginning soon' };
  }

  // In progress only within the scheduled trip window (not before start, even if guest checked in early).
  if (nowMs >= startMs && nowMs < endMs - H24_MS) {
    return { key: 'in_progress', label: 'In progress' };
  }

  if (nowMs < startMs - H24_MS) {
    return { key: 'scheduled', label: '' };
  }

  return { key: 'unknown', label: '' };
}

/** Has this party finished their check-in flow? */
function hasCheckedIn(booking, isHost) {
  if (isHost) {
    return booking?.hostCheckedInAt != null || booking?.hostTripStartedAt != null;
  }
  return (
    booking?.guestCheckedInAt != null ||
    booking?.rentalAgreementSignedAt != null ||
    booking?.guestTripStartedAt != null
  );
}

/**
 * Which primary action to show on the card (guest vs host).
 * @param {string} statusKey
 * @param {{ isHost: boolean }} opts
 */
export function getTripCardPrimaryAction(statusKey, { isHost, booking }) {
  if (statusKey === 'extended' || statusKey === 'extension_pending') {
    return { type: null };
  }
  if (statusKey === 'completed' || hasPartyCheckedOut(booking, isHost)) {
    return { type: null };
  }
  if (statusKey === 'ending_soon') {
    return { type: 'checkout' };
  }
  // Check-in stays available from the pre-trip window through the active trip
  // until this party completes it.
  if (statusKey === 'beginning_soon' || statusKey === 'in_progress') {
    if (!hasCheckedIn(booking, isHost)) {
      return { type: 'check_in' };
    }
    if (statusKey === 'in_progress' && !isHost) {
      return { type: 'extend' };
    }
    return { type: null };
  }
  return { type: null };
}
