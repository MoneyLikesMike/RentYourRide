/** Map booking-update API errors to user-facing copy (RYRA-489). */
export function messageForBookingUpdateError(e) {
  const status = e?.status;
  const raw = typeof e?.message === 'string' ? e.message : '';
  if (status === 401 || e?.body?.code === 'SESSION_EXPIRED') {
    return 'Your session has expired. Please sign in again.';
  }
  if (status === 403) {
    return "You don't have access to this trip.";
  }
  if (/^unauthorized$/i.test(raw.trim())) {
    return 'Your session has expired. Please sign in again.';
  }
  if (/^forbidden$/i.test(raw.trim())) {
    return "You don't have access to this trip.";
  }
  return raw || 'Try again later.';
}
