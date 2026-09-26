/**
 * Confirmed-trip cancel → host notify (RYRA-422).
 * Pure decisions so the Njeb × Em regression can run without Nest or Stripe.
 *
 * Root cause this supports: BookingsService.cancel refunded and marked the
 * booking cancelled, but never called NotificationsService (unlike accept/decline).
 * Email, SMS, and push therefore never fired. SMS spend-cap handling is separate
 * and must not gate the other channels.
 */

export const HOST_CANCEL_NOTIFY_EVENT = 'host_confirmed_trip_cancelled';

/** Marketing email opt-out does not apply. See RYRA-343. */
export const HOST_CANCEL_EMAIL_IS_TRANSACTIONAL = true;

export const HOST_CANCEL_CHANNELS = ['in_app', 'push', 'email', 'sms'] as const;
export type HostCancelChannel = (typeof HOST_CANCEL_CHANNELS)[number];

export type DispatchStatus = 'sent' | 'failed' | 'skipped';

/** Statuses that mean the guest had a confirmed trip, not an unanswered request. */
export const CONFIRMED_TRIP_STATUSES = [
  'confirmed',
  'checkin_pending',
  'active',
  'extension_pending',
  'extended',
  'extension_declined',
  'checkout_pending',
] as const;

export function isConfirmedTripStatus(status: string): boolean {
  return (CONFIRMED_TRIP_STATUSES as readonly string[]).includes(status);
}

export type SmsFailureKind = 'spend_cap' | 'provider_error' | 'not_configured';

/** AWS SNS copy when the account monthly spend quota is exhausted. Does not raise the cap. */
export function classifySmsFailure(message: string): SmsFailureKind {
  const text = message.toLowerCase();
  if (
    text.includes('spend limit') ||
    text.includes('spending limit') ||
    text.includes('spending quota') ||
    text.includes('monthly spend') ||
    text.includes('spend quota') ||
    text.includes('quota exceeded') ||
    text.includes('quota left') ||
    text.includes('account spend')
  ) {
    return 'spend_cap';
  }
  if (text.includes('not configured') || text.includes('missing_aws') || text.includes('sms-dev')) {
    return 'not_configured';
  }
  return 'provider_error';
}

export function smsFailureShouldQueue(kind: SmsFailureKind, message: string): boolean {
  if (kind === 'not_configured') return false;
  if (kind === 'spend_cap') return true;
  if (/invalid.*phone|opted ?out|permanent/i.test(message)) return false;
  return true;
}

export const SMS_MAX_ATTEMPTS = 5;
export const SMS_RETRY_BACKOFF_MS = [
  15 * 60 * 1000,
  60 * 60 * 1000,
  6 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
];

/** Delay until the next retry after `failedAttempts` failures. Null means stop. */
export function nextSmsRetryDelayMs(failedAttempts: number): number | null {
  if (failedAttempts >= SMS_MAX_ATTEMPTS) return null;
  const idx = Math.max(0, failedAttempts - 1);
  return SMS_RETRY_BACKOFF_MS[Math.min(idx, SMS_RETRY_BACKOFF_MS.length - 1)];
}

export type PriorClaim = {
  status: 'sending' | 'sent' | 'failed' | 'skipped';
  reason?: string | null;
  updatedAtMs: number;
} | null;

const STALE_SENDING_MS = 2 * 60 * 1000;

/**
 * Second cancel/refund pass must not send a second email, push, or in-app row.
 * A failed SMS that is already queued is not sent again here; the outbox retries it.
 */
export function resolveHostCancelAttempt(input: {
  channel: HostCancelChannel;
  prior: PriorClaim;
  smsQueued: boolean;
  nowMs: number;
}): { action: 'send' | 'skip'; reason?: string } {
  const prior = input.prior;
  if (!prior) return { action: 'send' };
  if (prior.status === 'sending') {
    if (input.nowMs - prior.updatedAtMs < STALE_SENDING_MS) {
      return { action: 'skip', reason: 'in_progress' };
    }
    return { action: 'send' };
  }
  if (prior.status === 'sent') return { action: 'skip', reason: 'already_sent' };
  if (prior.status === 'skipped') {
    return { action: 'skip', reason: prior.reason || 'skipped' };
  }
  if (input.channel === 'sms' && input.smsQueued) {
    return { action: 'skip', reason: 'sms_retry_queued' };
  }
  if (
    input.channel === 'sms' &&
    (prior.reason === 'retries_exhausted' || prior.reason === 'not_configured' || prior.reason === 'missing_phone')
  ) {
    return { action: 'skip', reason: prior.reason };
  }
  return { action: 'send' };
}

export type ChannelPlan = {
  channel: HostCancelChannel;
  action: 'send' | 'skip';
  reason?: string;
};

/**
 * Channel plan never takes marketing prefs or SMS provider state.
 * A spend-cap failure cannot remove email, in-app, or push from this list.
 */
export function planHostCancelNotify(input: {
  hasEmail: boolean;
  hasPhone: boolean;
  pushTokenCount: number;
}): ChannelPlan[] {
  return [
    { channel: 'in_app', action: 'send' },
    input.pushTokenCount > 0
      ? { channel: 'push', action: 'send' }
      : { channel: 'push', action: 'skip', reason: 'no_push_token' },
    input.hasEmail
      ? { channel: 'email', action: 'send' }
      : { channel: 'email', action: 'skip', reason: 'missing_email' },
    input.hasPhone
      ? { channel: 'sms', action: 'send' }
      : { channel: 'sms', action: 'skip', reason: 'missing_phone' },
  ];
}

export async function dispatchIndependentChannels<T>(
  channels: readonly HostCancelChannel[],
  run: (channel: HostCancelChannel) => Promise<T>,
): Promise<Array<{ channel: HostCancelChannel; result?: T; error?: string }>> {
  const out: Array<{ channel: HostCancelChannel; result?: T; error?: string }> = [];
  for (const channel of channels) {
    try {
      out.push({ channel, result: await run(channel) });
    } catch (err) {
      out.push({
        channel,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return out;
}

export function buildHostCancelCopy(input: {
  hostFirstName: string;
  guestFirstName: string;
  vehicle: string;
  startLabel: string;
  endLabel: string;
  listingId: string;
  cancelledBy: string;
  stripeRefundId?: string | null;
}): {
  emailSubject: string;
  emailBody: string;
  sms: string;
  inAppTitle: string;
  inAppBody: string;
  pushTitle: string;
  pushBody: string;
} {
  const hostFirst = input.hostFirstName.trim() || 'there';
  const guestFirst = input.guestFirstName.trim() || 'Your guest';
  const vehicle = input.vehicle.trim() || 'your vehicle';
  const actorLine =
    input.cancelledBy === 'host'
      ? `You cancelled ${guestFirst}'s confirmed trip on your ${vehicle}.`
      : input.cancelledBy === 'guest'
        ? `${guestFirst} cancelled a confirmed trip on your ${vehicle}.`
        : `A confirmed trip on your ${vehicle} was cancelled.`;
  const sms =
    input.cancelledBy === 'host'
      ? `You cancelled ${guestFirst}'s trip on your ${vehicle} (${input.startLabel} to ${input.endLabel}). Those dates are open again.`
      : input.cancelledBy === 'guest'
        ? `${guestFirst} cancelled their confirmed trip on your ${vehicle} (${input.startLabel} to ${input.endLabel}). Those dates are open again.`
        : `A confirmed trip on your ${vehicle} was cancelled (${input.startLabel} to ${input.endLabel}). Those dates are open again.`;
  const emailLines = [
    `Hi ${hostFirst},`,
    '',
    actorLine,
    '',
    input.startLabel,
    input.endLabel,
    'Times shown are America/Winnipeg.',
    '',
    'Those dates are open on your calendar again.',
  ];
  if (input.stripeRefundId) {
    emailLines.push(`Guest refund ${input.stripeRefundId} was submitted.`);
  }
  emailLines.push('', `Listing ${input.listingId}`);
  const emailBody = emailLines.join('\n');

  return {
    emailSubject: `${guestFirst} cancelled a trip on your ${vehicle}`,
    emailBody,
    sms,
    inAppTitle: 'Trip cancelled',
    inAppBody: sms,
    pushTitle: 'Trip cancelled',
    pushBody: sms,
  };
}

export function inAppDedupeKey(bookingId: string, hostMemberId: string): string {
  return `${HOST_CANCEL_NOTIFY_EVENT}:${bookingId}:${hostMemberId}`;
}

export function smsOutboxDedupeKey(bookingId: string): string {
  return `${HOST_CANCEL_NOTIFY_EVENT}:${bookingId}`;
}
