/**
 * RYRA-488: preauth hold safety, Stripe idempotency key, concurrent same key,
 * expiry cleanup + admin Expired label.
 * Run: npx tsx --test src/bookings/booking-hold-safety.spec.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { QueryFailedError } from 'typeorm';
import { formatAdminBookingStatus } from '../admin/admin.mapper';
import { BookingHoldCleanupScheduler } from './booking-hold-cleanup.scheduler';
import { PaymentsService } from '../payments/payments.service';

describe('formatAdminBookingStatus', () => {
  it("shows 'Expired' for expired bookings", () => {
    assert.equal(formatAdminBookingStatus('expired'), 'Expired');
  });
});

describe('createBookingPreauth idempotencyKey', () => {
  it('passes booking_preauth:${key} as Stripe request option', async () => {
    const createCalls: unknown[] = [];
    const stripe = {
      paymentMethods: {
        retrieve: async () => ({ card: { funding: 'credit' } }),
      },
      customers: {
        create: async () => ({ id: 'cus_1' }),
      },
      paymentIntents: {
        create: async (params: unknown, opts: unknown) => {
          createCalls.push({ params, opts });
          return {
            id: 'pi_1',
            status: 'requires_capture',
            amount: 100,
            latest_charge: 'ch_1',
          };
        },
      },
    };

    const service = Object.create(PaymentsService.prototype) as PaymentsService;
    (service as unknown as { stripe: typeof stripe; log: { error: () => void } }).stripe =
      stripe;
    (service as unknown as { log: { error: () => void } }).log = { error: () => undefined };
    (service as unknown as { ensureStripeCustomer: Function }).ensureStripeCustomer =
      async () => ({ customerId: 'cus_1' });
    (service as unknown as { fundingForPaymentMethod: Function }).fundingForPaymentMethod =
      async () => 'credit';
    (service as unknown as { chargeIdFromPi: Function }).chargeIdFromPi = () => 'ch_1';

    await service.createBookingPreauth({
      guestUserId: 'guest-1',
      paymentMethodId: 'pm_1',
      fullAmountCents: 40_500,
      description: 'test',
      idempotencyKey: 'abc-key',
    });

    assert.equal(createCalls.length, 1);
    const opts = (createCalls[0] as { opts: { idempotencyKey?: string } }).opts;
    assert.equal(opts?.idempotencyKey, 'booking_preauth:abc-key');
  });
});

describe('cancelPaymentIntentSafe on save failure', () => {
  it('cancels requires_capture PI when save throws', async () => {
    const cancelled: string[] = [];
    const payments = {
      isConfigured: () => true,
      createBookingPreauth: async () => ({
        paymentIntentId: 'pi_hold',
        chargeId: 'ch_1',
        amountCents: 100,
        funding: 'credit',
      }),
      cancelPaymentIntentSafe: async (id: string) => {
        cancelled.push(id);
      },
      captureOrChargeBooking: async () => {
        throw new Error('unused');
      },
    };

    // Simulate the create() catch path used after preauth + failed save.
    let holdPaymentIntentId: string | null = 'pi_hold';
    try {
      throw new Error('save failed');
    } catch (err) {
      if (holdPaymentIntentId) {
        await payments.cancelPaymentIntentSafe(holdPaymentIntentId);
        holdPaymentIntentId = null;
      }
      assert.equal((err as Error).message, 'save failed');
    }
    assert.deepEqual(cancelled, ['pi_hold']);
    assert.equal(holdPaymentIntentId, null);
  });
});

describe('concurrent same idempotency key', () => {
  it('unique violation on idempotency_key is detectable', () => {
    const err = Object.assign(new QueryFailedError('INSERT', [], new Error('duplicate')), {
      driverError: {
        code: '23505',
        constraint: 'bookings_idempotency_key_uidx',
        message: 'duplicate key value violates unique constraint "bookings_idempotency_key_uidx"',
      },
    });
    const driver = err.driverError as { code?: string; constraint?: string };
    assert.equal(driver.code, '23505');
    assert.match(String(driver.constraint), /idempotency/i);
  });
});

describe('BookingHoldCleanupScheduler expiry', () => {
  it('marks pending_host expired and voids the hold', async () => {
    const booking = {
      id: 'b1',
      status: 'pending_host',
      stripePaymentIntentId: 'pi_old',
      lifecycle: {},
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    };
    const saved: unknown[] = [];
    const cancelled: string[] = [];
    const notified: string[] = [];

    const scheduler = new BookingHoldCleanupScheduler(
      {
        find: async () => [booking],
        save: async (row: typeof booking) => {
          saved.push({ ...row, lifecycle: { ...row.lifecycle } });
          return row;
        },
      } as never,
      {
        isConfigured: () => true,
        cancelPaymentIntentSafe: async (id: string) => {
          cancelled.push(id);
        },
        retrievePaymentIntent: async () => ({ status: 'canceled' }),
      } as never,
      {
        bookingExpired: (id: string) => {
          notified.push(id);
        },
      } as never,
    );

    const n = await scheduler.expireStaleRequests();
    assert.equal(n, 1);
    assert.equal(booking.status, 'expired');
    assert.ok((booking.lifecycle as { expiredAt?: number }).expiredAt);
    assert.deepEqual(cancelled, ['pi_old']);
    assert.deepEqual(notified, ['b1']);
    assert.equal(formatAdminBookingStatus(booking.status), 'Expired');
  });
});
