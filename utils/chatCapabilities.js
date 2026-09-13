/** Booking statuses where chat stays text-only (no photos / richer media). */
const CHAT_MEDIA_LOCKED_STATUSES = new Set([
  'pending_host',
  'declined',
  'cancelled',
]);

/**
 * Photos (and future video/voice/location/call) unlock after the host accepts.
 * Instant bookings start as `confirmed` → already unlocked.
 */
export function isChatMediaUnlocked(bookingStatus) {
  const status = String(bookingStatus || '').trim();
  if (!status) return false;
  return !CHAT_MEDIA_LOCKED_STATUSES.has(status);
}

export function chatMediaLockMessage(bookingStatus) {
  if (String(bookingStatus || '') === 'pending_host') {
    return 'Photos unlock after the host accepts this trip. You can still send text.';
  }
  return 'Photos are only available on active trips.';
}
