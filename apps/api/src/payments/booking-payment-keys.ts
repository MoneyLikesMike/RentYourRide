/** Stable Stripe Idempotency-Key values derived from a booking id. */

export function bookingPreauthIdempotencyKey(bookingId: string): string {
  return `booking:${bookingId}:preauth`;
}

/** Apple Pay on-session hold (manual capture) before host accept. */
export function bookingApplePayHoldIdempotencyKey(
  bookingIdOrAttempt: string,
  attempt = '1',
): string {
  const id = String(bookingIdOrAttempt || 'unknown')
    .trim()
    .slice(0, 80);
  const att = String(attempt || '1')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '')
    .slice(0, 32) || '1';
  return `booking:${id}:apple-pay-hold:${att}`;
}

export function bookingApplePayInstantIdempotencyKey(
  listingId: string,
  attemptKey: string,
): string {
  const lid = String(listingId || 'listing')
    .trim()
    .slice(0, 64);
  const att = String(attemptKey || '1')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '')
    .slice(0, 48) || '1';
  return `booking:apple-pay-instant:${lid}:${att}`;
}

export function bookingHoldCancelIdempotencyKey(bookingId: string): string {
  return `booking:${bookingId}:hold-cancel`;
}

export function bookingChargeIdempotencyKey(bookingId: string): string {
  return `booking:${bookingId}:charge:v1`;
}

export function bookingCaptureIdempotencyKey(bookingId: string): string {
  return `booking:${bookingId}:capture`;
}

export function bookingRefundIdempotencyKey(
  bookingId: string,
  reason: string,
): string {
  const safe = String(reason || 'default')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .slice(0, 40);
  return `booking:${bookingId}:refund:${safe || 'default'}`;
}
