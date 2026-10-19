import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PaymentsService } from './payments.service';
import {
  bookingApplePayHoldIdempotencyKey,
  bookingCaptureIdempotencyKey,
  bookingChargeIdempotencyKey,
} from './booking-payment-keys';

function makePaymentsService(): PaymentsService {
  return new PaymentsService(
    { get: () => 'sk_test_x' } as never,
    {
      requireById: async () => ({
        id: 'guest-1',
        email: 'g@example.com',
        firstName: 'G',
        lastName: 'Uest',
        stripeCustomerId: 'cus_1',
      }),
      ensureStripeCustomerId: async () => undefined,
    } as never,
    {} as never,
  );
}

describe('Apple Pay booking hold', () => {
  let creates: Array<{ body: Record<string, unknown>; opts: unknown }>;
  let captures: Array<{ id: string; opts: unknown }>;
  let store: Map<string, Record<string, unknown>>;
  let payments: PaymentsService;

  beforeEach(() => {
    creates = [];
    captures = [];
    store = new Map();
    payments = makePaymentsService();
    payments._setStripeForTests?.({
      customers: {
        create: async () => ({ id: 'cus_1' }),
      },
      paymentIntents: {
        create: async (body: Record<string, unknown>, opts?: unknown) => {
          creates.push({ body, opts });
          const id = `pi_ap_${creates.length}`;
          const confirmed = body.confirm === true;
          const pi = {
            id,
            client_secret: `${id}_secret_x`,
            status: confirmed ? 'succeeded' : 'requires_payment_method',
            amount: body.amount,
            amount_received: confirmed ? body.amount : 0,
            customer: body.customer,
            metadata: body.metadata,
            capture_method: body.capture_method,
            setup_future_usage: body.setup_future_usage,
            off_session: body.off_session,
            confirm: body.confirm,
            latest_charge: confirmed ? `ch_${id}` : null,
            payment_method: body.payment_method || null,
          };
          store.set(id, pi);
          return pi;
        },
        retrieve: async (id: string) => {
          const pi = store.get(id);
          if (!pi) throw new Error(`missing ${id}`);
          return { ...pi };
        },
        capture: async (id: string, params?: unknown, opts?: unknown) => {
          captures.push({ id, opts });
          const pi = store.get(id)!;
          pi.status = 'succeeded';
          pi.amount_received = (params as { amount_to_capture?: number })?.amount_to_capture
            || pi.amount;
          pi.latest_charge = `ch_${id}`;
          return pi;
        },
        update: async () => ({}),
      },
    } as never);
  });

  it('creates manual-capture hold with setup_future_usage and idempotency key', async () => {
    const result = await payments.createApplePayBookingHold('guest-1', {
      amountCents: 37000,
      attemptKey: 'list-1|start|end',
      attempt: '1',
      metadata: { listingId: 'list-1' },
    });
    assert.ok(result.paymentIntentId);
    assert.equal(creates.length, 1);
    assert.equal(creates[0].body.capture_method, 'manual');
    assert.equal(creates[0].body.setup_future_usage, 'off_session');
    assert.equal(
      (creates[0].body.metadata as { purpose: string }).purpose,
      'apple_pay_hold',
    );
    assert.deepEqual(creates[0].opts, {
      idempotencyKey: bookingApplePayHoldIdempotencyKey('list-1|start|end', '1'),
    });
  });

  it('idempotent create returns same Stripe call key on retry', async () => {
    await payments.createApplePayBookingHold('guest-1', {
      amountCents: 37000,
      attemptKey: 'same-key',
      attempt: '2',
    });
    await payments.createApplePayBookingHold('guest-1', {
      amountCents: 37000,
      attemptKey: 'same-key',
      attempt: '2',
    });
    assert.equal(creates.length, 2);
    assert.equal(
      (creates[0].opts as { idempotencyKey: string }).idempotencyKey,
      (creates[1].opts as { idempotencyKey: string }).idempotencyKey,
    );
  });

  it('captures Apple Pay hold on accept', async () => {
    store.set('pi_hold', {
      id: 'pi_hold',
      status: 'requires_capture',
      amount: 37000,
      customer: 'cus_1',
      payment_method: { id: 'pm_apple', card: { funding: 'credit' } },
      metadata: { purpose: 'apple_pay_hold', funding: 'apple_pay' },
      latest_charge: 'ch_auth',
    });
    const out = await payments.captureOrChargeBooking({
      paymentIntentId: 'pi_hold',
      fullAmountCents: 37000,
      description: 'Rental',
      bookingId: 'booking-ap-1',
    });
    assert.equal(out.paymentIntentId, 'pi_hold');
    assert.equal(captures.length, 1);
    assert.deepEqual(captures[0].opts, {
      idempotencyKey: bookingCaptureIdempotencyKey('booking-ap-1'),
    });
  });

  it('double capture is idempotent (succeeded short-circuit)', async () => {
    store.set('pi_hold', {
      id: 'pi_hold',
      status: 'succeeded',
      amount: 37000,
      amount_received: 37000,
      customer: 'cus_1',
      payment_method: { id: 'pm_apple', card: { funding: 'credit' } },
      metadata: { purpose: 'apple_pay_hold' },
      latest_charge: 'ch_1',
    });
    const a = await payments.captureOrChargeBooking({
      paymentIntentId: 'pi_hold',
      fullAmountCents: 37000,
      description: 'Rental',
      bookingId: 'booking-ap-2',
    });
    const b = await payments.captureOrChargeBooking({
      paymentIntentId: 'pi_hold',
      fullAmountCents: 37000,
      description: 'Rental',
      bookingId: 'booking-ap-2',
      existingCapturePaymentIntentId: 'pi_hold',
    });
    assert.equal(a.paymentIntentId, b.paymentIntentId);
    assert.equal(captures.length, 0);
  });

  it('expired auth falls back to off-session charge', async () => {
    store.set('pi_hold', {
      id: 'pi_hold',
      status: 'canceled',
      amount: 37000,
      customer: 'cus_1',
      payment_method: { id: 'pm_apple', card: { funding: 'debit' } },
      metadata: { purpose: 'apple_pay_hold' },
      latest_charge: null,
    });
    const out = await payments.captureOrChargeBooking({
      paymentIntentId: 'pi_hold',
      fullAmountCents: 37000,
      description: 'Rental',
      bookingId: 'booking-ap-3',
      paymentMethodId: 'pm_apple',
    });
    assert.ok(out.paymentIntentId.startsWith('pi_ap_'));
    assert.equal(creates.length, 1);
    assert.equal(creates[0].body.off_session, true);
    assert.equal(creates[0].body.confirm, true);
    assert.deepEqual(creates[0].opts, {
      idempotencyKey: bookingChargeIdempotencyKey('booking-ap-3'),
    });
  });
});
