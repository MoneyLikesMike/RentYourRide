import type { BookingStatus } from '../entities/booking.entity';

export const MS_PER_HOUR = 60 * 60 * 1000;
export const PENDING_REQUEST_TTL_MS = 8 * MS_PER_HOUR;

/** Statuses that still count as an unanswered request (not calendar-blocking). */
export const PENDING_REQUEST_STATUSES: BookingStatus[] = ['pending_host'];

export function paymentDeadlineMs(failedAtMs: number, pickupMs: number): number {
  const untilPickup = pickupMs - failedAtMs;
  if (untilPickup < 2 * MS_PER_HOUR) {
    return failedAtMs + MS_PER_HOUR;
  }
  return Math.min(failedAtMs + 24 * MS_PER_HOUR, pickupMs - 2 * MS_PER_HOUR);
}

export function isPendingRequestExpired(createdAtMs: number, nowMs: number): boolean {
  return nowMs - createdAtMs >= PENDING_REQUEST_TTL_MS;
}

export type StripePiEventAction =
  | 'noop'
  | 'mark_canceled'
  | 'mark_capturable'
  | 'confirm_if_awaiting';

export function stripePiEventAction(
  eventType: string,
  bookingStatus: string,
): StripePiEventAction {
  if (eventType === 'payment_intent.canceled') return 'mark_canceled';
  if (eventType === 'payment_intent.amount_capturable_updated') {
    return 'mark_capturable';
  }
  if (
    eventType === 'payment_intent.succeeded' &&
    bookingStatus === 'awaiting_payment'
  ) {
    return 'confirm_if_awaiting';
  }
  return 'noop';
}

export function paymentFailureMessage(err: unknown): string {
  if (!err || typeof err !== 'object') {
    return 'Could not authorize payment method';
  }
  const rec = err as {
    code?: string;
    decline_code?: string;
    type?: string;
    rawType?: string;
    message?: string;
  };
  const code = `${rec.code || ''} ${rec.decline_code || ''}`.toLowerCase();
  const message = String(rec.message || '');
  if (code.includes('insufficient') || /insufficient funds/i.test(message)) {
    return 'Your card has insufficient funds. Please use a different payment method.';
  }
  if (
    rec.type === 'StripeCardError' ||
    rec.rawType === 'card_error' ||
    rec.type === 'card_error'
  ) {
    return message.trim() || 'Could not authorize payment method';
  }
  if (message.trim()) return message.trim();
  return 'Could not authorize payment method';
}
