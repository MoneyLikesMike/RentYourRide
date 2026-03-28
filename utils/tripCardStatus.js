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
  if (ext) {
    return { key: 'extended', label: 'Extended' };
  }

  if (nowMs >= endMs) {
    return { key: 'completed', label: '' };
  }

  /** Guest or host long-pressed “start trip” on check-in reminder — show active trip until it ends */
  if (booking?.guestTripStartedAt != null || booking?.hostTripStartedAt != null) {
    if (nowMs >= endMs - H24_MS) {
      return { key: 'ending_soon', label: 'Ending soon' };
    }
    return { key: 'in_progress', label: 'In progress' };
  }

  if (nowMs >= endMs - H24_MS && nowMs < endMs) {
    return { key: 'ending_soon', label: 'Ending soon' };
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

/**
 * Which primary action to show on the card (guest vs host).
 * @param {string} statusKey
 * @param {{ isHost: boolean }} opts
 */
export function getTripCardPrimaryAction(statusKey, { isHost, booking }) {
  if (statusKey === 'extended') {
    return { type: null };
  }
  if (statusKey === 'beginning_soon') {
    if (isHost && booking?.hostCheckedInAt != null) {
      return { type: null };
    }
    if (!isHost && (booking?.guestCheckedInAt != null || booking?.rentalAgreementSignedAt != null)) {
      return { type: null };
    }
    return { type: 'check_in' };
  }
  if (statusKey === 'ending_soon') {
    if (isHost && booking?.hostCheckoutTripEndedAt != null) {
      return { type: null };
    }
    if (!isHost && booking?.guestCheckedOutAt != null) {
      return { type: null };
    }
    return { type: 'checkout' };
  }
  if (statusKey === 'in_progress' && !isHost) {
    return { type: 'extend' };
  }
  return { type: null };
}
