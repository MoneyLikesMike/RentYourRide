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

/** True once either party has entered the check-in / trip-started lifecycle. */
function hasEnteredTripLifecycle(booking) {
  const status = booking?.status;
  if (
    status === 'checkin_pending' ||
    status === 'active' ||
    status === 'checkout_pending' ||
    status === 'extended' ||
    status === 'extension_pending' ||
    status === 'extension_declined'
  ) {
    return true;
  }
  return (
    booking?.guestCheckedInAt != null ||
    booking?.hostCheckedInAt != null ||
    booking?.guestTripStartedAt != null ||
    booking?.hostTripStartedAt != null ||
    booking?.rentalAgreementSignedAt != null
  );
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

  // Checkout / "ending soon" only after check-in has started. Otherwise short trips
  // (≤24h) look "ending soon" for their entire window and skip check-in entirely.
  if (nowMs >= endMs - H24_MS && hasEnteredTripLifecycle(booking)) {
    return { key: 'ending_soon', label: 'Ending soon' };
  }

  /** Guest or host long-pressed “start trip” on check-in reminder — show active trip until it ends */
  if (booking?.guestTripStartedAt != null || booking?.hostTripStartedAt != null) {
    return { key: 'in_progress', label: 'In progress' };
  }

  if (nowMs >= startMs - H24_MS && nowMs < startMs) {
    return { key: 'beginning_soon', label: 'Beginning soon' };
  }

  // In progress within the scheduled trip window (including short trips that never
  // qualify for the post-check-in ending-soon badge above).
  if (nowMs >= startMs && nowMs < endMs) {
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
  // Never offer checkout before this party has checked in (short-trip / late-accept safety).
  if (
    (statusKey === 'ending_soon' ||
      statusKey === 'beginning_soon' ||
      statusKey === 'in_progress') &&
    !hasCheckedIn(booking, isHost)
  ) {
    return { type: 'check_in' };
  }
  if (statusKey === 'ending_soon') {
    return { type: 'checkout' };
  }
  if (statusKey === 'in_progress' && !isHost) {
    return { type: 'extend' };
  }
  return { type: null };
}
