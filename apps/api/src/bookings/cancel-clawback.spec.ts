import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BookingsService } from './bookings.service';
import { PaymentsService } from '../payments/payments.service';
import { StripeWebhookService } from '../payments/stripe-webhook.service';
import type { BookingEntity } from '../entities/booking.entity';
import { computeCancellationOutcome } from './cancellation-policy';

const MS_H = 60 * 60 * 1000;
const MS_D = 24 * MS_H;
const start = Date.now() + 3 * MS_D;
const end = start + 3 * MS_D;

function pricing() {
  return {
    tripDays: 3,
    pricePerDay: 100,
    discountedTripSubtotal: 300,
    tripFee: 30,
    selectedDeliveryFee: 40,
    unlimitedKmFee: 0,
    prepaidFuelFee: 0,
    prepaidCleanFee: 0,
    subtotal: 340,
    taxes: 0,
    grandTotal: 370,
    serviceFeeRate: 0.25,
    serviceFeeBase: 'discounted',
    hostReceiveTotal: 265,
  };
}

function makeBooking(over: Partial<BookingEntity> & { lifecycle?: Record<string, unknown> } = {}) {
  const life = { ...(over.lifecycle || {}) };
  return {
    id: 'booking-1',
    guestUserId: 'guest-1',
    hostUserId: 'host-1',
    status: 'confirmed',
    stripePaymentIntentId: 'pi_test_1',
    pricing: pricing(),
    bookingDates: { start, end },
    lifecycle: life,
    createdAt: new Date(Date.now() - 10 * MS_D),
    host: { firstName: 'H', lastName: 'Ost' },
    listing: null,
    toMobileDto() {
      return {
        id: this.id,
        status: this.status,
        pricing: this.pricing,
        listingSnapshot: {},
      };
    },
    ...over,
    lifecycle: life,
  } as unknown as BookingEntity;
}

function buildService(opts: {
  booking: BookingEntity;
  payments: PaymentsService;
  onSave?: (b: BookingEntity) => void;
  payouts?: { scheduleCancellationPayout: (id: string, cents: number) => Promise<unknown> };
}) {
  return new BookingsService(
    {
      findOne: async () => opts.booking,
      save: async (b: BookingEntity) => {
        opts.onSave?.(b);
        return b;
      },
    } as never,
    { find: async () => [] } as never,
    {} as never,
    {} as never,
    {} as never,
    { postBookingSystemMessage: async () => undefined } as never,
    { notifyHostConfirmedTripCancelled: async () => undefined } as never,
    opts.payments,
    (opts.payouts || {
      scheduleCancellationPayout: async () => ({ ok: true, stub: true }),
      scheduleForCompletedBooking: async () => ({ ok: true, stub: true }),
    }) as never,
    { sendSimpleAdminEmail: async () => undefined } as never,
  );
}

describe('cancel — V2 late refund + transfer reversal', () => {
  it('partial-refunds guest and reverses excess host transfer', async () => {
    const booking = makeBooking({
      lifecycle: {
        policyVersion: 'v2',
        hostTransferId: 'tr_test_1',
        hostTransferAmountCents: 26500,
        stripeChargeId: 'ch_test_1',
      },
    });

    const stripeCalls: {
      refunds: Array<Record<string, unknown>>;
      reversals: Array<Record<string, unknown>>;
    } = { refunds: [], reversals: [] };

    const payments = new PaymentsService(
      { get: () => 'sk_test_x' } as never,
      {} as never,
      {} as never,
    );
    payments._setStripeForTests({
      paymentIntents: {
        retrieve: async () => ({
          id: 'pi_test_1',
          status: 'succeeded',
          amount: 37000,
          amount_received: 37000,
        }),
        update: async () => ({}),
        cancel: async () => ({}),
      },
      refunds: {
        create: async (
          params: Record<string, unknown>,
          opts?: { idempotencyKey?: string },
        ) => {
          stripeCalls.refunds.push({ ...params, ...opts });
          return { id: 're_test_1', amount: params.amount ?? 37000 };
        },
      },
      transfers: {
        createReversal: async (
          transferId: string,
          params: Record<string, unknown>,
          opts?: { idempotencyKey?: string },
        ) => {
          stripeCalls.reversals.push({ transferId, ...params, ...opts });
          return { id: 'trr_test_1', amount: params.amount };
        },
      },
      webhooks: { constructEvent: () => { throw new Error('unused'); } },
    } as never);

    let saved: BookingEntity | null = null;
    const scheduled: number[] = [];
    const service = buildService({
      booking,
      payments,
      onSave: (b) => {
        saved = b;
      },
      payouts: {
        scheduleCancellationPayout: async (_id, cents) => {
          scheduled.push(cents);
          return { ok: true, stub: true };
        },
      },
    });

    const cancelledAt = start - 23 * MS_H;
    const expected = computeCancellationOutcome(
      {
        pricing: {
          dailyRate: 100,
          billingDays: 3,
          tripPrice: 300,
          tripFee: 30,
          deliveryFee: 40,
          taxes: 0,
          totalPaid: 370,
        },
        startMs: start,
        createdAtMs: booking.createdAt.getTime(),
        cancelledAtMs: cancelledAt,
        actor: 'guest',
        reason: 'standard',
        policyVersion: 'v2',
      },
      {},
    );

    const origNow = Date.now;
    Date.now = () => cancelledAt;
    try {
      const result = await service.cancel('guest-1', 'booking-1');
      assert.equal(result.status, 'cancelled');
      assert.equal(result.cancelOutcome.guestRefundCents, expected.guestRefundCents);
      assert.equal(result.cancelOutcome.guestChargeCents, expected.guestChargeCents);
      assert.equal(result.cancelOutcome.tier, 'late');
      assert.equal(result.stripeRefundId, 're_test_1');
      assert.equal(stripeCalls.refunds.length, 1);
      assert.equal(stripeCalls.refunds[0].amount, expected.guestRefundCents);
      assert.equal(stripeCalls.reversals.length, 1);
      assert.equal(stripeCalls.reversals[0].transferId, 'tr_test_1');
      assert.equal(
        stripeCalls.reversals[0].amount,
        26500 - expected.hostShareCents,
      );
      assert.equal(scheduled[0], expected.hostShareCents);
      assert.ok(saved);
      const lifeSaved = (saved as BookingEntity).lifecycle as Record<string, unknown>;
      assert.ok(lifeSaved.paymentRefundedAt);
      assert.equal(lifeSaved.hostTransferReversalId, 'trr_test_1');
    } finally {
      Date.now = origNow;
    }
  });

  it('captures partial amount on uncaptured hold', async () => {
    const booking = makeBooking({
      lifecycle: { policyVersion: 'v2' },
    });
    const captures: Array<Record<string, unknown>> = [];
    const payments = new PaymentsService(
      { get: () => 'sk_test_x' } as never,
      {} as never,
      {} as never,
    );
    payments._setStripeForTests({
      paymentIntents: {
        retrieve: async () => ({
          id: 'pi_test_1',
          status: 'requires_capture',
          amount: 37000,
          amount_received: 0,
        }),
        update: async () => ({}),
        cancel: async () => ({}),
        capture: async (
          id: string,
          params: { amount_to_capture: number },
          opts?: { idempotencyKey?: string },
        ) => {
          captures.push({ id, ...params, ...opts });
          return {
            id,
            status: 'succeeded',
            amount_received: params.amount_to_capture,
            latest_charge: 'ch_partial',
          };
        },
      },
      refunds: {
        create: async () => {
          throw new Error('should not refund uncaptured');
        },
      },
      transfers: { createReversal: async () => ({}) },
    } as never);

    const service = buildService({ booking, payments });
    const cancelledAt = start - 23 * MS_H;
    const origNow = Date.now;
    Date.now = () => cancelledAt;
    try {
      const result = await service.cancel('guest-1', 'booking-1');
      assert.equal(result.status, 'cancelled');
      assert.equal(result.cancelOutcome.tier, 'late');
      assert.equal(captures.length, 1);
      assert.equal(captures[0].amount_to_capture, result.cancelOutcome.guestChargeCents);
      assert.equal(result.stripeRefundId, null);
    } finally {
      Date.now = origNow;
    }
  });

  it('cancels hold when free cancel (charge 0)', async () => {
    const booking = makeBooking({ lifecycle: { policyVersion: 'v2' } });
    let cancelled = false;
    const payments = new PaymentsService(
      { get: () => 'sk_test_x' } as never,
      {} as never,
      {} as never,
    );
    payments._setStripeForTests({
      paymentIntents: {
        retrieve: async () => ({
          id: 'pi_test_1',
          status: 'requires_capture',
          amount: 37000,
        }),
        update: async () => ({}),
        cancel: async () => {
          cancelled = true;
          return {};
        },
        capture: async () => {
          throw new Error('should not capture 0');
        },
      },
      refunds: { create: async () => ({}) },
      transfers: { createReversal: async () => ({}) },
    } as never);

    const service = buildService({ booking, payments });
    const cancelledAt = start - 25 * MS_H; // free window
    const origNow = Date.now;
    Date.now = () => cancelledAt;
    try {
      const result = await service.cancel('guest-1', 'booking-1');
      assert.equal(result.cancelOutcome.tier, 'free');
      assert.equal(result.cancelOutcome.guestChargeCents, 0);
      assert.equal(cancelled, true);
    } finally {
      Date.now = origNow;
    }
  });

  it('surfaces Stripe refund errors (does not swallow)', async () => {
    const booking = makeBooking({
      lifecycle: { policyVersion: 'v2' },
    });
    const payments = new PaymentsService(
      { get: () => 'sk_test_x' } as never,
      {} as never,
      {} as never,
    );
    payments._setStripeForTests({
      paymentIntents: {
        retrieve: async () => ({
          id: 'pi_test_1',
          status: 'succeeded',
          amount: 37000,
          amount_received: 37000,
        }),
        update: async () => ({}),
      },
      refunds: {
        create: async () => {
          throw new Error('stripe_refund_boom');
        },
      },
      transfers: { createReversal: async () => ({}) },
    } as never);

    const service = buildService({ booking, payments });
    const cancelledAt = start - 23 * MS_H;
    const origNow = Date.now;
    Date.now = () => cancelledAt;
    try {
      await assert.rejects(
        () => service.cancel('guest-1', 'booking-1'),
        /stripe_refund_boom/,
      );
      assert.equal(booking.status, 'confirmed');
    } finally {
      Date.now = origNow;
    }
  });

  it('preview matches cancel outcome', async () => {
    const booking = makeBooking({ lifecycle: { policyVersion: 'v2' } });
    const payments = new PaymentsService(
      { get: () => null } as never,
      {} as never,
      {} as never,
    );
    const service = buildService({ booking, payments });
    const cancelledAt = start - 23 * MS_H;
    const origNow = Date.now;
    Date.now = () => cancelledAt;
    try {
      const preview = await service.cancellationPreview('guest-1', 'booking-1');
      const result = await service.cancel('guest-1', 'booking-1');
      assert.equal(
        preview.outcome.guestRefundCents,
        result.cancelOutcome.guestRefundCents,
      );
      assert.equal(preview.outcome.tier, result.cancelOutcome.tier);
    } finally {
      Date.now = origNow;
    }
  });
});

describe('Stripe webhook clawback idempotency', () => {
  it('repeated charge.refunded events do not double-reverse', async () => {
    const life: Record<string, unknown> = {
      hostTransferId: 'tr_wh_1',
      hostTransferAmountCents: 26500,
      stripeChargeId: 'ch_wh_1',
      cancellation: {
        outcome: { hostShareCents: 8500 },
      },
    };
    const booking = {
      id: 'booking-wh',
      pricing: pricing(),
      lifecycle: life,
      stripePaymentIntentId: 'pi_wh_1',
    } as unknown as BookingEntity;

    const reversals: Array<Record<string, unknown>> = [];
    const payments = new PaymentsService(
      {
        get: (k: string) =>
          k === 'STRIPE_WEBHOOK_SECRET' ? 'whsec_test' : 'sk_test_x',
      } as never,
      {} as never,
      {} as never,
    );
    payments._setStripeForTests({
      transfers: {
        createReversal: async (
          transferId: string,
          params: Record<string, unknown>,
          opts?: { idempotencyKey?: string },
        ) => {
          reversals.push({ transferId, ...params, ...opts });
          return { id: `trr_${reversals.length}`, amount: params.amount };
        },
      },
      webhooks: {
        constructEvent: () => ({
          id: 'evt_refund_1',
          type: 'charge.refunded',
          data: {
            object: {
              id: 'ch_wh_1',
              amount_refunded: 25000,
              payment_intent: 'pi_wh_1',
            },
          },
        }),
      },
    } as never);

    const bookingsService = buildService({ booking, payments });

    const savedEvents: string[] = [];
    const webhook = new StripeWebhookService(
      payments,
      bookingsService,
      {
        findOne: async ({ where }: { where: { eventId: string } }) =>
          savedEvents.includes(where.eventId)
            ? { eventId: where.eventId }
            : null,
        create: (row: { eventId: string; eventType: string }) => row,
        save: async (row: { eventId: string }) => {
          savedEvents.push(row.eventId);
          return row;
        },
      } as never,
    );

    await webhook.handleRaw(Buffer.from('{}'), 'sig');
    assert.equal(reversals.length, 1);
    assert.equal(reversals[0].amount, 26500 - 8500);

    await webhook.handleRaw(Buffer.from('{}'), 'sig');
    assert.equal(reversals.length, 1);

    // Already reversed amount recorded → no further reversal for new event.
    payments._setStripeForTests({
      transfers: {
        createReversal: async (
          transferId: string,
          params: Record<string, unknown>,
          opts?: { idempotencyKey?: string },
        ) => {
          reversals.push({ transferId, ...params, ...opts });
          return { id: `trr_${reversals.length}`, amount: params.amount };
        },
      },
      webhooks: {
        constructEvent: () => ({
          id: 'evt_refund_2',
          type: 'charge.refunded',
          data: {
            object: {
              id: 'ch_wh_1',
              amount_refunded: 25000,
              payment_intent: 'pi_wh_1',
            },
          },
        }),
      },
    } as never);
    await webhook.handleRaw(Buffer.from('{}'), 'sig');
    assert.equal(reversals.length, 1);
  });
});
