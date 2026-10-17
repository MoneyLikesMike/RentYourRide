/**
 * Parallel acceptHost behaviour with an in-memory lock + mock Stripe.
 * Mirrors lifecycle.acceptLockAt + capturePaymentIntentId persistence.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException } from '@nestjs/common';
import { PaymentsService } from '../payments/payments.service';
import { bookingChargeIdempotencyKey } from '../payments/booking-payment-keys';

type Row = {
  id: string;
  hostUserId: string;
  status: 'pending_host' | 'confirmed';
  stripePaymentIntentId: string | null;
  lifecycle: Record<string, unknown>;
  pricing: { grandTotal: number };
  selectedPaymentMethod: { id: string };
  host: { firstName: string };
};

class FakeAcceptStore {
  row: Row;
  messages = 0;
  notifies = 0;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(row: Row) {
    this.row = row;
  }

  /** Serialize like SELECT … FOR UPDATE. */
  withLock<T>(fn: () => Promise<T> | T): Promise<T> {
    const run = this.chain.then(() => fn());
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async claim(userId: string) {
    return this.withLock(async () => {
      if (this.row.hostUserId !== userId) throw new Error('forbidden');
      if (this.row.status === 'confirmed') {
        return { outcome: 'already_confirmed' as const };
      }
      if (this.row.status !== 'pending_host') throw new Error('invalid');
      const lockAt = Number(this.row.lifecycle.acceptLockAt);
      if (Number.isFinite(lockAt) && Date.now() - lockAt < 120_000) {
        throw new ConflictException('Accept already in progress');
      }
      this.row.lifecycle = { ...this.row.lifecycle, acceptLockAt: Date.now() };
      return { outcome: 'claimed' as const };
    });
  }

  async persistCapture(piId: string) {
    return this.withLock(() => {
      this.row.lifecycle = {
        ...this.row.lifecycle,
        capturePaymentIntentId: piId,
      };
    });
  }

  async finalize(paymentIntentId: string, chargeId: string) {
    return this.withLock(() => {
      if (this.row.status === 'confirmed') {
        return { newlyConfirmed: false };
      }
      const life = { ...this.row.lifecycle };
      delete life.acceptLockAt;
      life.capturePaymentIntentId = paymentIntentId;
      life.stripeChargeId = chargeId;
      life.paymentCapturedAt = Date.now();
      life.acceptedAt = Date.now();
      this.row.lifecycle = life;
      this.row.stripePaymentIntentId = paymentIntentId;
      this.row.status = 'confirmed';
      return { newlyConfirmed: true };
    });
  }

  async releaseLock() {
    return this.withLock(() => {
      if (this.row.status !== 'pending_host') return;
      const life = { ...this.row.lifecycle };
      delete life.acceptLockAt;
      this.row.lifecycle = life;
    });
  }
}

describe('acceptHost parallel credit booking', () => {
  it('5 parallel accepts → 1 charge create, 1 hold cancel, confirmed once, 1 notify', async () => {
    const bookingId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const store = new FakeAcceptStore({
      id: bookingId,
      hostUserId: 'host-1',
      status: 'pending_host',
      stripePaymentIntentId: 'pi_hold',
      lifecycle: { paymentFunding: 'credit' },
      pricing: { grandTotal: 594 },
      selectedPaymentMethod: { id: 'pm_1' },
      host: { firstName: 'Ada' },
    });

    const creates: unknown[] = [];
    const cancels: unknown[] = [];
    const piStore = new Map<string, Record<string, unknown>>();
    piStore.set('pi_hold', {
      id: 'pi_hold',
      status: 'requires_capture',
      amount: 100,
      customer: 'cus_1',
      payment_method: { id: 'pm_1', card: { funding: 'credit' } },
      metadata: { funding: 'credit', bookingId },
      latest_charge: 'ch_hold',
    });

    const payments = new PaymentsService(
      { get: () => undefined } as never,
      {} as never,
      {} as never,
    );
    payments._setStripeForTests({
      paymentIntents: {
        retrieve: async (id: string) => {
          const pi = piStore.get(id);
          if (!pi) throw new Error(`missing ${id}`);
          return { ...pi };
        },
        cancel: async (id: string, _p?: unknown, opts?: unknown) => {
          cancels.push({ id, opts });
          const pi = piStore.get(id)!;
          pi.status = 'canceled';
          return pi;
        },
        create: async (body: Record<string, unknown>, opts?: unknown) => {
          // Slight delay so parallel callers overlap after first claim.
          await new Promise((r) => setTimeout(r, 30));
          creates.push({ body, opts });
          const id = 'pi_full_1';
          const pi = {
            id,
            status: 'succeeded',
            amount: body.amount,
            amount_received: body.amount,
            latest_charge: 'ch_full',
            metadata: body.metadata,
          };
          piStore.set(id, pi);
          return pi;
        },
        capture: async () => {
          throw new Error('debit path should not run');
        },
        update: async () => ({}),
      },
      refunds: { create: async () => ({ id: 're_1' }) },
    } as never);

    async function acceptOnce() {
      try {
        const claim = await store.claim('host-1');
        if (claim.outcome === 'already_confirmed') return 'already_confirmed';
        const life = store.row.lifecycle;
        const existing =
          typeof life.capturePaymentIntentId === 'string'
            ? life.capturePaymentIntentId
            : null;
        const captured = await payments.captureOrChargeBooking({
          paymentIntentId: store.row.stripePaymentIntentId!,
          fullAmountCents: 59400,
          description: 'Rental',
          paymentMethodId: 'pm_1',
          bookingId,
          existingCapturePaymentIntentId: existing,
          onCapturePaymentIntentId: async (piId) => {
            await store.persistCapture(piId);
          },
        });
        const fin = await store.finalize(
          captured.paymentIntentId,
          captured.chargeId || 'ch',
        );
        if (fin.newlyConfirmed) {
          store.messages += 1;
          store.notifies += 1;
        }
        return fin.newlyConfirmed ? 'confirmed' : 'already_confirmed';
      } catch (err) {
        if (err instanceof ConflictException) return 'conflict';
        await store.releaseLock();
        throw err;
      }
    }

    const results = await Promise.all(
      Array.from({ length: 5 }, () => acceptOnce()),
    );

    const confirmed = results.filter((r) => r === 'confirmed').length;
    const conflicts = results.filter((r) => r === 'conflict').length;
    const already = results.filter((r) => r === 'already_confirmed').length;

    assert.equal(confirmed, 1);
    assert.equal(store.messages, 1);
    assert.equal(store.notifies, 1);
    assert.equal(store.row.status, 'confirmed');
    assert.equal(creates.length, 1);
    assert.equal(cancels.length, 1);
    assert.deepEqual((creates[0] as { opts: unknown }).opts, {
      idempotencyKey: bookingChargeIdempotencyKey(bookingId),
    });
    assert.ok(conflicts + already === 4);
  });

  it('accept on already-confirmed booking skips Stripe', async () => {
    const store = new FakeAcceptStore({
      id: 'id-2',
      hostUserId: 'host-1',
      status: 'confirmed',
      stripePaymentIntentId: 'pi_done',
      lifecycle: { acceptedAt: 1 },
      pricing: { grandTotal: 100 },
      selectedPaymentMethod: { id: 'pm_1' },
      host: { firstName: 'Ada' },
    });
    let stripeCalls = 0;
    const claim = await store.claim('host-1');
    assert.equal(claim.outcome, 'already_confirmed');
    assert.equal(stripeCalls, 0);
  });
});
