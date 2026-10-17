/** Stable Stripe Idempotency-Key values derived from a booking id. */

export function bookingPreauthIdempotencyKey(bookingId: string): string {
  return `booking:${bookingId}:preauth`;
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
