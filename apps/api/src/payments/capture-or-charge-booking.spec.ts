import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PaymentsService } from './payments.service';
import {
  bookingCaptureIdempotencyKey,
  bookingChargeIdempotencyKey,
  bookingHoldCancelIdempotencyKey,
} from './booking-payment-keys';

function makePaymentsService(): PaymentsService {
  return new PaymentsService(
    { get: () => undefined } as never,
    {} as never,
    {} as never,
  );
}

describe('captureOrChargeBooking idempotency', () => {
  const bookingId = 'booking-uuid-1';
  let creates: Array<{ body: unknown; opts: unknown }>;
  let cancels: Array<{ id: string; opts: unknown }>;
  let captures: Array<{ id: string; opts: unknown }>;
  let store: Map<string, Record<string, unknown>>;

  beforeEach(() => {
    creates = [];
    cancels = [];
    captures = [];
    store = new Map();
    store.set('pi_hold', {
      id: 'pi_hold',
      status: 'requires_capture',
      amount: 100,
      customer: 'cus_1',
      payment_method: {
        id: 'pm_1',
        card: { funding: 'credit' },
      },
      metadata: { funding: 'credit', bookingId },
      latest_charge: 'ch_hold',
    });
  });

  function mockStripe() {
    return {
      paymentIntents: {
        retrieve: async (id: string) => {
          const pi = store.get(id);
          if (!pi) throw new Error(`missing ${id}`);
          return { ...pi };
        },
        cancel: async (id: string, _params?: unknown, opts?: unknown) => {
          cancels.push({ id, opts });
          const pi = store.get(id);
          if (pi) pi.status = 'canceled';
          return pi;
        },
        create: async (body: Record<string, unknown>, opts?: unknown) => {
          creates.push({ body, opts });
          const id = `pi_charge_${creates.length}`;
          const pi = {
            id,
            status: 'succeeded',
            amount: body.amount,
            amount_received: body.amount,
            latest_charge: `ch_${id}`,
            metadata: body.metadata,
          };
          store.set(id, pi);
          return pi;
        },
        capture: async (id: string, _params?: unknown, opts?: unknown) => {
          captures.push({ id, opts });
          const pi = store.get(id)!;
          pi.status = 'succeeded';
          pi.amount_received = pi.amount;
          return pi;
        },
        update: async () => ({}),
      },
      refunds: { create: async () => ({ id: 're_1' }) },
    };
  }

  it('credit path: one create + hold cancel with expected idempotency keys; retry reuses PI', async () => {
    const svc = makePaymentsService();
    svc._setStripeForTests(mockStripe() as never);

    let persisted: string | null = null;
    const first = await svc.captureOrChargeBooking({
      paymentIntentId: 'pi_hold',
      fullAmountCents: 59400,
      description: 'Rental',
      paymentMethodId: 'pm_1',
      bookingId,
      onCapturePaymentIntentId: async (piId) => {
        persisted = piId;
      },
    });

    assert.equal(creates.length, 1);
    assert.equal(cancels.length, 1);
    assert.deepEqual(cancels[0].opts, {
      idempotencyKey: bookingHoldCancelIdempotencyKey(bookingId),
    });
    assert.deepEqual(creates[0].opts, {
      idempotencyKey: bookingChargeIdempotencyKey(bookingId),
    });
    assert.equal(persisted, first.paymentIntentId);

    // Simulate hold already canceled + capture PI persisted (retry after timeout).
    const second = await svc.captureOrChargeBooking({
      paymentIntentId: 'pi_hold',
      fullAmountCents: 59400,
      description: 'Rental',
      paymentMethodId: 'pm_1',
      bookingId,
      existingCapturePaymentIntentId: first.paymentIntentId,
    });

    assert.equal(second.paymentIntentId, first.paymentIntentId);
    assert.equal(creates.length, 1, 'must not create a second full charge');
    assert.equal(cancels.length, 1);
  });

  it('debit path: capture with booking capture idempotency key', async () => {
    const svc = makePaymentsService();
    store.set('pi_debit', {
      id: 'pi_debit',
      status: 'requires_capture',
      amount: 59400,
      customer: 'cus_1',
      payment_method: {
        id: 'pm_1',
        card: { funding: 'debit' },
      },
      metadata: { funding: 'debit', bookingId },
      latest_charge: 'ch_debit',
    });
    svc._setStripeForTests(mockStripe() as never);

    const result = await svc.captureOrChargeBooking({
      paymentIntentId: 'pi_debit',
      fullAmountCents: 59400,
      description: 'Rental',
      bookingId,
    });

    assert.equal(result.paymentIntentId, 'pi_debit');
    assert.equal(creates.length, 0);
    assert.equal(captures.length, 1);
    assert.deepEqual(captures[0].opts, {
      idempotencyKey: bookingCaptureIdempotencyKey(bookingId),
    });
  });
});
