import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConflictException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { DATE_BLOCKING_BOOKING_STATUSES } from './booking-date-ranges';
import { listingTimeZone, normalizeBookingDates } from './booking-time';
import {
  MS_PER_HOUR,
  PENDING_REQUEST_TTL_MS,
  isPendingRequestExpired,
  paymentDeadlineMs,
  paymentFailureMessage,
  stripePiEventAction,
} from './booking-payment';
import type { BookingEntity } from '../entities/booking.entity';

const DAY = 24 * MS_PER_HOUR;
const START = Date.now() + 10 * DAY;
const END = START + DAY;
const DATES = normalizeBookingDates(
  { start: START, end: END, startTime: '8:00 PM', endTime: '8:00 PM' },
  listingTimeZone({ city: 'Winnipeg', pickupAddress: '123 Main St, Winnipeg, MB' }),
)!;

function inValues(op: unknown): string[] {
  if (Array.isArray(op)) return op as string[];
  if (op && typeof op === 'object') {
    const rec = op as { value?: unknown; _value?: unknown };
    if (Array.isArray(rec.value)) return rec.value as string[];
    if (Array.isArray(rec._value)) return rec._value as string[];
  }
  return [];
}

function listing() {
  return {
    id: 'listing-1',
    published: true,
    active: true,
    hostUserId: 'host-1',
    instantBooking: false,
    pricePerDay: 100,
    deliveryPrice: 0,
    dailyKm: '200 km/day',
    weeklyDiscount: '0%',
    monthlyDiscount: '0%',
    pickupAddress: '123 Main St, Winnipeg, MB',
    city: 'Winnipeg',
    availability: [],
    host: { firstName: 'Navpreet', lastName: 'S' },
    toDetailDto() {
      return { id: this.id, title: 'Ford Escape' };
    },
  };
}

function bookingRow(over: Partial<BookingEntity> & Record<string, unknown> = {}) {
  return {
    id: 'b-1',
    guestUserId: 'guest-1',
    hostUserId: 'host-1',
    listingId: 'listing-1',
    status: 'pending_host',
    stripePaymentIntentId: 'pi_hold',
    instantBooking: false,
    listingSnapshot: { title: 'Ford Escape' },
    bookingDates: { start: DATES.start, end: DATES.end },
    pickupAddress: 'x',
    dropoffAddress: null,
    deliveryEnabled: false,
    extras: [],
    introMessage: '',
    pricing: { grandTotal: 191.4 },
    selectedPaymentMethod: { id: 'pm_1' },
    lifecycle: {},
    paymentDeadlineAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    listing: listing(),
    host: { firstName: 'Navpreet' },
    guest: { firstName: 'Karanveer' },
    toMobileDto() {
      return {
        id: this.id,
        listingId: this.listingId,
        guestUserId: this.guestUserId,
        hostUserId: this.hostUserId,
        status: this.status,
        listingSnapshot: this.listingSnapshot,
        bookingDates: this.bookingDates,
        pricing: this.pricing,
        lifecycle: this.lifecycle,
        paymentDeadlineAt: this.paymentDeadlineAt
          ? (this.paymentDeadlineAt as Date).getTime()
          : null,
        createdAt: this.createdAt.getTime(),
      };
    },
    ...over,
  } as unknown as BookingEntity;
}

function makeService(opts: {
  blocking?: BookingEntity[];
  pending?: BookingEntity[];
  payments?: Record<string, unknown>;
  notifications?: Record<string, unknown>;
  saved?: BookingEntity[];
  events?: Array<{ eventId: string; eventType: string }>;
} = {}) {
  const blocking = opts.blocking ?? [];
  const pending = opts.pending ?? [];
  const saved = opts.saved ?? [];
  const events = opts.events ?? [];
  const notifications = {
    bookingCreated: () => {},
    bookingApproved: () => {},
    bookingDenied: () => {},
    bookingAwaitingPayment: () => {},
    bookingRequestExpired: () => {},
    bookingPaymentDeadlineMissed: () => {},
    ...(opts.notifications || {}),
  };
  const payments = {
    isConfigured: () => true,
    createBookingPreauth: async () => ({
      paymentIntentId: 'pi_full',
      chargeId: 'ch_1',
      amountCents: 19140,
      funding: 'credit',
    }),
    captureOrChargeBooking: async () => ({
      paymentIntentId: 'pi_full',
      chargeId: 'ch_1',
      amountCents: 19140,
      funding: 'credit',
    }),
    authorizeAndCaptureBooking: async () => ({
      paymentIntentId: 'pi_retry',
      chargeId: 'ch_2',
      amountCents: 19140,
      funding: 'credit',
    }),
    refundBookingPayment: async () => ({ refundId: null }),
    constructWebhookEvent: (raw: Buffer) => JSON.parse(raw.toString()),
    ...(opts.payments || {}),
  };

  const rowsFor = (where: { status?: unknown }) => {
    const statuses = inValues(where.status);
    if (statuses.includes('pending_host')) return pending;
    return blocking;
  };

  const manager = {
    query: async () => [],
    findOne: async () => null,
    find: async (entity: unknown, args: { where: { status?: unknown } }) =>
      rowsFor(args.where),
    create: (_e: unknown, data: BookingEntity) =>
      bookingRow({ id: 'b-new', ...data } as never),
    save: async (row: BookingEntity) => {
      saved.push(row);
      return row;
    },
  };

  const bookingsRepo = {
    find: async (args: { where: { status?: unknown } }) => rowsFor(args.where),
    findOne: async ({ where }: { where: { id?: string; stripePaymentIntentId?: string } }) => {
      const all = [...blocking, ...pending, ...saved];
      if (where.id) return all.find((r) => r.id === where.id) ?? null;
      if (where.stripePaymentIntentId) {
        return all.find((r) => r.stripePaymentIntentId === where.stripePaymentIntentId) ?? null;
      }
      return null;
    },
    save: async (row: BookingEntity) => {
      saved.push(row);
      return row;
    },
  };

  const service = new BookingsService(
    bookingsRepo as never,
    {} as never,
    {
      findOne: async () => listing(),
    } as never,
    {
      findOne: async () => ({
        id: 'guest-1',
        emailVerified: true,
        phoneVerified: true,
        licenseVerified: true,
      }),
    } as never,
    {
      insert: async (row: { eventId: string; eventType: string }) => {
        if (events.some((e) => e.eventId === row.eventId)) {
          throw new Error('duplicate');
        }
        events.push(row);
      },
    } as never,
    {
      transaction: async (fn: (m: typeof manager) => unknown) => fn(manager),
    } as never,
    {
      findOrCreateForBooking: async () => ({}),
      postBookingSystemMessage: async () => ({}),
    } as never,
    notifications as never,
    payments as never,
  );

  return { service, saved, notifications, payments, events, manager };
}

describe('full-amount auth and awaiting payment', () => {
  it('does not block calendar dates for pending_host and does block awaiting_payment', () => {
    assert.equal(DATE_BLOCKING_BOOKING_STATUSES.includes('pending_host'), false);
    assert.equal(DATE_BLOCKING_BOOKING_STATUSES.includes('awaiting_payment'), true);
    const rows = [
      { id: 'req', status: 'pending_host' },
      { id: 'pay', status: 'awaiting_payment' },
      { id: 'ok', status: 'confirmed' },
    ];
    const blocked = rows.filter((r) =>
      (DATE_BLOCKING_BOOKING_STATUSES as readonly string[]).includes(r.status),
    );
    assert.deepEqual(
      blocked.map((r) => r.id),
      ['pay', 'ok'],
    );
  });

  it('computes payment deadlines for 24h, pickup-minus-2h, and under-2h pickup', () => {
    const failed = Date.parse('2026-10-28T12:00:00Z');
    const farPickup = failed + 48 * MS_PER_HOUR;
    assert.equal(paymentDeadlineMs(failed, farPickup), failed + 24 * MS_PER_HOUR);

    const pickup10h = failed + 10 * MS_PER_HOUR;
    assert.equal(paymentDeadlineMs(failed, pickup10h), pickup10h - 2 * MS_PER_HOUR);

    const pickup90m = failed + 1.5 * MS_PER_HOUR;
    assert.equal(paymentDeadlineMs(failed, pickup90m), failed + MS_PER_HOUR);
  });

  it('maps Stripe webhook event types, including no-ops', () => {
    assert.equal(stripePiEventAction('payment_intent.canceled', 'pending_host'), 'mark_canceled');
    assert.equal(
      stripePiEventAction('payment_intent.amount_capturable_updated', 'pending_host'),
      'mark_capturable',
    );
    assert.equal(
      stripePiEventAction('payment_intent.succeeded', 'awaiting_payment'),
      'confirm_if_awaiting',
    );
    assert.equal(stripePiEventAction('payment_intent.succeeded', 'confirmed'), 'noop');
    assert.equal(stripePiEventAction('payment_intent.payment_failed', 'awaiting_payment'), 'noop');
  });

  it('surfaces insufficient-funds auth errors for checkout', () => {
    assert.match(
      paymentFailureMessage({
        type: 'StripeCardError',
        code: 'card_declined',
        decline_code: 'insufficient_funds',
        message: 'Your card has insufficient funds.',
      }),
      /insufficient funds/i,
    );
  });

  it('1. auth failure at submit creates no booking and does not notify the host', async () => {
    const created: string[] = [];
    const { service, saved } = makeService({
      payments: {
        createBookingPreauth: async () => {
          throw Object.assign(new Error('Your card has insufficient funds.'), {
            type: 'StripeCardError',
            code: 'card_declined',
            decline_code: 'insufficient_funds',
          });
        },
      },
      notifications: {
        bookingCreated: () => created.push('host'),
      },
    });
    await assert.rejects(
      () =>
        service.createBooking('guest-1', {
          listingId: 'listing-1',
          bookingDates: { start: START, end: END, startTime: '8:00 PM', endTime: '8:00 PM' },
          selectedPaymentMethod: { id: 'pm_1' },
        }),
      /insufficient funds/i,
    );
    assert.equal(saved.length, 0);
    assert.deepEqual(created, []);
  });

  it('2. pending request is not date-blocking; second guest can overlap; same-guest duplicate is idempotent', async () => {
    const existing = bookingRow({
      id: 'b-pending',
      guestUserId: 'guest-1',
      status: 'pending_host',
    });
    const { service: firstGuestService, saved } = makeService({
      pending: [existing],
    });
    const dup = await firstGuestService.createBooking('guest-1', {
      listingId: 'listing-1',
      bookingDates: { start: START, end: END, startTime: '8:00 PM', endTime: '8:00 PM' },
      selectedPaymentMethod: { id: 'pm_1' },
    });
    assert.equal(dup.id, 'b-pending');
    assert.equal(saved.length, 0);

    const otherPending = bookingRow({
      id: 'b-other',
      guestUserId: 'guest-2',
      status: 'pending_host',
    });
    const { service: second, saved: saved2 } = makeService({
      pending: [otherPending],
    });
    const created = await second.createBooking('guest-1', {
      listingId: 'listing-1',
      bookingDates: { start: START, end: END, startTime: '8:00 PM', endTime: '8:00 PM' },
      selectedPaymentMethod: { id: 'pm_1' },
    });
    assert.equal(created.status, 'pending_host');
    assert.equal(saved2.length, 1);
  });

  it('3. accept blocks dates, rejects taken dates, auto-declines overlapping pending holds', async () => {
    const target = bookingRow({ id: 'b-accept' });
    const overlapPending = bookingRow({
      id: 'b-overlap',
      guestUserId: 'guest-2',
      stripePaymentIntentId: 'pi_other',
    });
    const nonOverlap = bookingRow({
      id: 'b-later',
      guestUserId: 'guest-3',
      bookingDates: { start: DATES.start + 5 * DAY, end: DATES.end + 5 * DAY },
      stripePaymentIntentId: 'pi_later',
    });
    const refunded: string[] = [];
    const denied: string[] = [];
    const { service, saved } = makeService({
      pending: [target, overlapPending, nonOverlap],
      payments: {
        refundBookingPayment: async (id: string) => {
          refunded.push(id);
          return { refundId: null };
        },
      },
      notifications: {
        bookingDenied: (id: string) => denied.push(id),
        bookingApproved: () => {},
      },
    });
    const { manager } = makeService();
    // Override findOne inside transaction via acceptHost's manager from service.
    // acceptHost uses dataSource.transaction manager.findOne — stub by replacing
    // the listings of the service we already built: hook findOne on first call.
    (service as unknown as { dataSource: { transaction: Function } }).dataSource.transaction =
      async (fn: (m: typeof manager) => unknown) => {
        const m = {
          ...manager,
          findOne: async () => target,
          find: async (_e: unknown, args: { where: { status?: unknown } }) => {
            const statuses = inValues(args.where.status);
            if (statuses.includes('pending_host')) {
              return [target, overlapPending, nonOverlap];
            }
            return saved.filter((r) =>
              (DATE_BLOCKING_BOOKING_STATUSES as readonly string[]).includes(r.status),
            );
          },
          save: async (row: BookingEntity) => {
            saved.push(row);
            Object.assign(
              [target, overlapPending, nonOverlap].find((r) => r.id === row.id) || {},
              row,
            );
            return row;
          },
        };
        return fn(m as never);
      };

    const accepted = await service.acceptHost('host-1', 'b-accept');
    assert.equal(accepted.status, 'confirmed');
    assert.equal(overlapPending.status, 'declined');
    assert.equal(nonOverlap.status, 'pending_host');
    assert.deepEqual(refunded, ['pi_other']);
    assert.deepEqual(denied, ['b-overlap']);

    const taken = bookingRow({ id: 'b-taken' });
    const blocker = bookingRow({
      id: 'b-conf',
      status: 'confirmed',
      guestUserId: 'guest-9',
    });
    const { service: takenSvc } = makeService();
    (takenSvc as unknown as { dataSource: { transaction: Function } }).dataSource.transaction =
      async (fn: (m: typeof manager) => unknown) => {
        const m = {
          query: async () => [],
          findOne: async () => taken,
          find: async () => [blocker],
          save: async (row: BookingEntity) => row,
        };
        return fn(m as never);
      };
    await assert.rejects(
      () => takenSvc.acceptHost('host-1', 'b-taken'),
      (err: unknown) => err instanceof ConflictException,
    );
  });

  it('4. capture failure on accept → awaiting_payment, dates blocked, decline rejected, both notified', async () => {
    const target = bookingRow({ id: 'b-pay' });
    const notified: string[] = [];
    const { service, saved } = makeService({
      pending: [target],
      payments: {
        captureOrChargeBooking: async () => {
          throw new Error('Your card has insufficient funds.');
        },
      },
      notifications: {
        bookingAwaitingPayment: (id: string) => notified.push(id),
      },
    });
    (service as unknown as { dataSource: { transaction: Function } }).dataSource.transaction =
      async (fn: Function) => {
        const m = {
          query: async () => [],
          findOne: async () => target,
          find: async () => [],
          save: async (row: BookingEntity) => {
            saved.push(row);
            return row;
          },
        };
        return fn(m);
      };
    const dto = await service.acceptHost('host-1', 'b-pay');
    assert.equal(dto.status, 'awaiting_payment');
    assert.ok(dto.paymentDeadlineAt);
    assert.equal(
      (DATE_BLOCKING_BOOKING_STATUSES as readonly string[]).includes('awaiting_payment'),
      true,
    );
    assert.deepEqual(notified, ['b-pay']);
    await assert.rejects(
      () => service.declineHost('host-1', 'b-pay'),
      /Cannot decline while payment is pending/,
    );
  });

  it('5. missed deadline cancels with no penalty; successful retry confirms', async () => {
    const failed = Date.now() - 25 * MS_PER_HOUR;
    const pickup = failed + 48 * MS_PER_HOUR;
    const deadline = paymentDeadlineMs(failed, pickup);
    assert.ok(Date.now() > deadline);

    const unpaid = bookingRow({
      id: 'b-unpaid',
      status: 'awaiting_payment',
      paymentDeadlineAt: new Date(deadline),
      stripePaymentIntentId: 'pi_unpaid',
    });
    const cancelledNotify: string[] = [];
    const refunded: string[] = [];
    const { service } = makeService({
      pending: [],
      blocking: [unpaid],
      payments: {
        refundBookingPayment: async (id: string) => {
          refunded.push(id);
          return { refundId: null };
        },
      },
      notifications: {
        bookingPaymentDeadlineMissed: (id: string) => cancelledNotify.push(id),
      },
    });
    (service as unknown as { bookingsRepo: { find: Function } }).bookingsRepo.find = async () => [
      unpaid,
    ];
    const n = await service.expireUnpaidAcceptedTrips(Date.now());
    assert.equal(n, 1);
    assert.equal(unpaid.status, 'cancelled');
    assert.deepEqual(refunded, ['pi_unpaid']);
    assert.deepEqual(cancelledNotify, ['b-unpaid']);

    const retryable = bookingRow({
      id: 'b-retry',
      status: 'awaiting_payment',
      paymentDeadlineAt: new Date(Date.now() + MS_PER_HOUR),
    });
    const { service: retrySvc } = makeService({
      pending: [retryable],
    });
    (retrySvc as unknown as { bookingsRepo: { findOne: Function } }).bookingsRepo.findOne =
      async () => retryable;
    const confirmed = await retrySvc.retryPayment('guest-1', 'b-retry', {
      paymentMethodId: 'pm_1',
    });
    assert.equal(confirmed.status, 'confirmed');
  });

  it('6. host decline and guest withdraw release the hold', async () => {
    const pending = bookingRow({ id: 'b-dec' });
    const refunded: string[] = [];
    const { service } = makeService({
      pending: [pending],
      payments: {
        refundBookingPayment: async (id: string) => {
          refunded.push(id);
          return { refundId: null };
        },
      },
    });
    (service as unknown as { bookingsRepo: { findOne: Function } }).bookingsRepo.findOne =
      async () => pending;
    await service.declineHost('host-1', 'b-dec');
    assert.equal(pending.status, 'declined');
    assert.equal(refunded.includes('pi_hold'), true);

    const withdraw = bookingRow({ id: 'b-wd', status: 'pending_host' });
    const { service: wd } = makeService({
      pending: [withdraw],
      payments: {
        refundBookingPayment: async (id: string) => {
          refunded.push(id);
          return { refundId: null };
        },
      },
    });
    (wd as unknown as { bookingsRepo: { findOne: Function } }).bookingsRepo.findOne = async () =>
      withdraw;
    await wd.cancel('guest-1', 'b-wd');
    assert.equal(withdraw.status, 'cancelled');
  });

  it('7. pending requests older than 8h expire; accept after expiry is rejected', async () => {
    const stale = bookingRow({
      id: 'b-old',
      createdAt: new Date(Date.now() - PENDING_REQUEST_TTL_MS - 1000),
    });
    assert.equal(isPendingRequestExpired(stale.createdAt.getTime(), Date.now()), true);
    const expiredNotify: string[] = [];
    const { service } = makeService({
      notifications: {
        bookingRequestExpired: (id: string) => expiredNotify.push(id),
      },
    });
    (service as unknown as { bookingsRepo: { find: Function } }).bookingsRepo.find = async () => [
      stale,
    ];
    const n = await service.expireStalePendingRequests(Date.now());
    assert.equal(n, 1);
    assert.equal(stale.status, 'expired');
    assert.deepEqual(expiredNotify, ['b-old']);
    (service as unknown as { dataSource: { transaction: Function } }).dataSource.transaction =
      async (fn: Function) =>
        fn({
          query: async () => [],
          findOne: async () => stale,
          find: async () => [],
          save: async (row: BookingEntity) => row,
        });
    await assert.rejects(() => service.acceptHost('host-1', 'b-old'), /Invalid status/);
  });

  it('8. webhook handler is idempotent for capturable and canceled events', async () => {
    const row = bookingRow({ id: 'b-wh', stripePaymentIntentId: 'pi_wh' });
    const events: Array<{ eventId: string; eventType: string }> = [];
    const { service } = makeService({ events, pending: [row] });
    (service as unknown as { bookingsRepo: { findOne: Function } }).bookingsRepo.findOne =
      async () => row;

    const canceled = Buffer.from(
      JSON.stringify({
        id: 'evt_1',
        type: 'payment_intent.canceled',
        data: { object: { id: 'pi_wh', status: 'canceled' } },
      }),
    );
    const first = await service.handleStripeWebhook(canceled, 'sig');
    const second = await service.handleStripeWebhook(canceled, 'sig');
    assert.equal(first.duplicate, undefined);
    assert.equal(second.duplicate, true);
    assert.equal(events.length, 1);

    const capturable = Buffer.from(
      JSON.stringify({
        id: 'evt_2',
        type: 'payment_intent.amount_capturable_updated',
        data: { object: { id: 'pi_wh', status: 'requires_capture', amount_capturable: 19140 } },
      }),
    );
    const cap = await service.handleStripeWebhook(capturable, 'sig');
    assert.equal(cap.received, true);
    assert.equal((row.lifecycle as { stripeAmountCapturable?: number }).stripeAmountCapturable, 19140);
  });
});
