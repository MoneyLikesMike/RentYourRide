import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DATE_BLOCKING_BOOKING_STATUSES } from '../bookings/booking-date-ranges';
import {
  HOST_CANCEL_EMAIL_IS_TRANSACTIONAL,
  buildHostCancelCopy,
  classifySmsFailure,
  dispatchIndependentChannels,
  isConfirmedTripStatus,
  nextSmsRetryDelayMs,
  planHostCancelNotify,
  resolveHostCancelAttempt,
  smsFailureShouldQueue,
} from './host-cancel-notify';

/**
 * Njeb A × Em Miranda, 2018 Mercedes-Benz GLC-Class.
 * Guest cancelled a confirmed trip; Stripe refund succeeded; host was not notified.
 */
const NJEB_EM = {
  listingId: '48a42d6d-03a1-48ce-9e77-d2b623fb834b',
  hostMemberId: '5c10afaf-483d-40b9-b4b8-4277e388ecd4',
  guestMemberId: '8e301788-0d32-4eba-96ab-32bdfad51a1e',
  hostFirstName: 'Em',
  guestFirstName: 'Njeb',
  hostEmail: 'emmedson_m@hotmail.com',
  hostPhone: '+12048999151',
  guestEmail: 'njeb186@icloud.com',
  vehicle: '2018 Mercedes-Benz GLC-Class',
  startLabel: 'Sep 19, 2026, 5:00 PM',
  endLabel: 'Sep 20, 2026, 11:30 PM',
  stripeChargeId: 'ch_3UGJ3pBeaPQAEbXm1HmxHIbl',
  stripePaymentIntentId: 'pi_3UGJ3pBeaPQAEbXm1FL5d1sj',
  stripeRefundId: 're_3UGJ3pBeaPQAEbXm1OgrA6zf',
  previousStatus: 'confirmed',
};

describe('RYRA-422 confirmed-trip cancel host notify', () => {
  it('treats a confirmed trip as notifiable and a pending request as not', () => {
    assert.equal(isConfirmedTripStatus(NJEB_EM.previousStatus), true);
    assert.equal(isConfirmedTripStatus('pending_host'), false);
    assert.equal(isConfirmedTripStatus('cancelled'), false);
  });

  it('plans in-app, push, email, and SMS independently of the SMS spend cap', () => {
    const cap = classifySmsFailure('Monthly spend limit exceeded for account');
    assert.equal(cap, 'spend_cap');
    assert.equal(smsFailureShouldQueue(cap, 'Monthly spend limit exceeded'), true);
    assert.equal(HOST_CANCEL_EMAIL_IS_TRANSACTIONAL, true);

    const plan = planHostCancelNotify({
      hasEmail: true,
      hasPhone: true,
      pushTokenCount: 1,
    });
    assert.deepEqual(
      plan.map((row) => row.channel),
      ['in_app', 'push', 'email', 'sms'],
    );
    assert.ok(plan.every((row) => row.action === 'send'));
  });

  it('does not drop email or in-app when the SMS sender throws', async () => {
    const calls: string[] = [];
    const results = await dispatchIndependentChannels(
      ['in_app', 'push', 'email', 'sms'],
      async (channel) => {
        calls.push(channel);
        if (channel === 'sms') throw new Error('Monthly spend limit exceeded');
        return 'sent';
      },
    );
    assert.deepEqual(calls, ['in_app', 'push', 'email', 'sms']);
    assert.equal(results.find((row) => row.channel === 'email')?.result, 'sent');
    assert.equal(results.find((row) => row.channel === 'in_app')?.result, 'sent');
    assert.match(results.find((row) => row.channel === 'sms')?.error ?? '', /spend limit/);
  });

  it('builds host copy for the Njeb × Em trip including the Stripe refund id', () => {
    const copy = buildHostCancelCopy({
      hostFirstName: NJEB_EM.hostFirstName,
      guestFirstName: NJEB_EM.guestFirstName,
      vehicle: NJEB_EM.vehicle,
      startLabel: NJEB_EM.startLabel,
      endLabel: NJEB_EM.endLabel,
      listingId: NJEB_EM.listingId,
      cancelledBy: 'guest',
      stripeRefundId: NJEB_EM.stripeRefundId,
    });
    assert.match(copy.emailSubject, /Njeb/);
    assert.match(copy.emailBody, /Hi Em/);
    assert.match(copy.emailBody, /2018 Mercedes-Benz GLC-Class/);
    assert.match(copy.emailBody, /Sep 19, 2026, 5:00 PM/);
    assert.match(copy.emailBody, /Sep 20, 2026, 11:30 PM/);
    assert.match(copy.emailBody, new RegExp(NJEB_EM.listingId));
    assert.match(copy.emailBody, new RegExp(NJEB_EM.stripeRefundId));
    assert.match(copy.sms, /Njeb/);
    assert.match(copy.inAppBody, /open again/);
    assert.equal(copy.pushTitle, 'Trip cancelled');
  });

  it('is idempotent when cancel or refund handling runs twice', () => {
    assert.deepEqual(
      resolveHostCancelAttempt({
        channel: 'email',
        prior: { status: 'sent', updatedAtMs: 1 },
        smsQueued: false,
        nowMs: 10,
      }),
      { action: 'skip', reason: 'already_sent' },
    );
    assert.deepEqual(
      resolveHostCancelAttempt({
        channel: 'sms',
        prior: { status: 'failed', reason: 'spend_cap', updatedAtMs: 1 },
        smsQueued: true,
        nowMs: 10,
      }),
      { action: 'skip', reason: 'sms_retry_queued' },
    );
    assert.equal(
      resolveHostCancelAttempt({
        channel: 'email',
        prior: { status: 'failed', reason: 'email_provider_error', updatedAtMs: 1 },
        smsQueued: false,
        nowMs: 10,
      }).action,
      'send',
    );
  });

  it('queues capped SMS with a backoff and stops after the attempt limit', () => {
    assert.equal(nextSmsRetryDelayMs(1), 15 * 60 * 1000);
    assert.equal(nextSmsRetryDelayMs(5), null);
    assert.equal(classifySmsFailure('sms-dev SNS client missing'), 'not_configured');
    assert.equal(smsFailureShouldQueue('not_configured', 'sms-dev'), false);
    assert.equal(smsFailureShouldQueue('provider_error', 'Invalid phone number'), false);
  });

  it('reopens listing dates when the Njeb × Em booking is cancelled', () => {
    assert.equal(DATE_BLOCKING_BOOKING_STATUSES.includes('cancelled'), false);
    assert.equal(DATE_BLOCKING_BOOKING_STATUSES.includes('confirmed'), true);
    const bookings = [
      {
        id: 'njeb-em-glc',
        status: 'cancelled',
        listingId: NJEB_EM.listingId,
        hostMemberId: NJEB_EM.hostMemberId,
        guestMemberId: NJEB_EM.guestMemberId,
      },
      {
        id: 'still-held',
        status: 'confirmed',
        listingId: 'other-listing',
      },
    ];
    const stillBlocked = bookings.filter((booking) =>
      (DATE_BLOCKING_BOOKING_STATUSES as readonly string[]).includes(booking.status),
    );
    assert.deepEqual(
      stillBlocked.map((booking) => booking.id),
      ['still-held'],
    );
  });
});
