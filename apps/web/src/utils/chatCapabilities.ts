/** Shared with mobile `utils/chatCapabilities.js` — keep in sync. */
const CHAT_MEDIA_LOCKED_STATUSES = new Set([
  'pending_host',
  'declined',
  'cancelled',
]);

export function isChatMediaUnlocked(bookingStatus?: string | null): boolean {
  const status = String(bookingStatus || '').trim();
  if (!status) return false;
  return !CHAT_MEDIA_LOCKED_STATUSES.has(status);
}

export function chatMediaLockMessage(bookingStatus?: string | null): string {
  if (String(bookingStatus || '') === 'pending_host') {
    return 'Photos unlock after the host accepts this trip. You can still send text.';
  }
  return 'Photos are only available on active trips.';
}
