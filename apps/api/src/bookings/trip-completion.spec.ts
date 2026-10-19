import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import type { BookingEntity } from '../entities/booking.entity';
import { loadTripCompletionEnv } from './trip-completion.config';

const MS_H = 60 * 60 * 1000;
const MS_D = 24 * MS_H;

function pricing() {
  return {
    tripDays: 3,
    pricePerDay: 100,
    discountedTripSubtotal: 300,
    grandTotal: 370,
  };
}

type Harness = {
  service: BookingsService;
  booking: BookingEntity;
  messages: Array<{ text: string; meta?: unknown }>;
  payouts: string[];
  saves: BookingEntity[];
  updates: Array<{ status: string; prev: string }>;
};

function harness(over: Partial<BookingEntity> & { lifecycle?: Record<string, unknown> } = {}): Harness {
  const life = { ...(over.lifecycle || {}) };
  const booking = {
    id: 'booking-1',
    guestUserId: 'guest-1',
    hostUserId: 'host-1',
    status: 'active',
    pricing: pricing(),
    bookingDates: {
      start: Date.now() - 4 * MS_D,
      end: Date.now() - 1 * MS_D,
    },
    lifecycle: life,
    host: {},
    listing: null,
    toMobileDto() {
      return {
        id: this.id,
        status: this.status,
        pricing: this.pricing,
        listingSnapshot: {},
        ...((this.lifecycle || {}) as object),
      };
    },
    ...over,
    lifecycle: life,
  } as unknown as BookingEntity;

  const messages: Harness['messages'] = [];
  const payouts: string[] = [];
  const saves: BookingEntity[] = [];
  const updates: Harness['updates'] = [];

  const repo = {
    findOne: async () => booking,
    save: async (b: BookingEntity) => {
      saves.push(b);
      Object.assign(booking, b);
      return b;
    },
    find: async () => [booking],
    update: async (
      criteria: { id: string; status: string },
      vals: { status: string; lifecycle: Record<string, unknown> },
    ) => {
      if (booking.status !== criteria.status) {
        return { affected: 0 };
      }
      updates.push({ status: vals.status, prev: criteria.status });
      booking.status = vals.status as BookingEntity['status'];
      booking.lifecycle = vals.lifecycle;
      return { affected: 1 };
    },
  };

  const service = new BookingsService(
    repo as never,
    { find: async () => [] } as never,
    {} as never,
    {} as never,
    {} as never,
    {
      postBookingSystemMessage: async (_id: string, text: string, meta?: unknown) => {
        messages.push({ text, meta });
      },
    } as never,
    {
      bookingCheckedIn: () => undefined,
      bookingCheckedOut: () => undefined,
      reviewReminder: () => undefined,
    } as never,
    { isConfigured: () => false } as never,
    {
      scheduleForCompletedBooking: async (id: string) => {
        payouts.push(id);
        return { ok: true, stub: true, bookingId: id };
      },
    } as never,
    { sendSimpleAdminEmail: async () => undefined } as never,
  );

  return { service, booking, messages, payouts, saves, updates };
}

describe('trip completion — both check-outs', () => {
  it('completes with zero photos when both check-outs land', async () => {
    const h = harness({
      lifecycle: { guestCheckedOutAt: Date.now() - 1000 },
    });
    // no condition photos on lifecycle
    const result = await h.service.patchLifecycle('host-1', 'booking-1', {
      hostCheckoutTripEndedAt: Date.now(),
    });
    assert.equal(result.status, 'completed');
    assert.equal(h.updates.length, 1);
    assert.equal(h.messages.length, 1);
    assert.equal(h.payouts.length, 1);
    const life = h.booking.lifecycle as Record<string, unknown>;
    assert.ok(life.completedAt);
    assert.equal(life.completedBy, 'both_checkouts');
    assert.ok((life.claimsWindow as { damageUntil: number }).damageUntil);
  });

  it('guest-only check-out does not complete', async () => {
    const h = harness({ lifecycle: {} });
    const result = await h.service.patchLifecycle('guest-1', 'booking-1', {
      guestCheckedOutAt: Date.now(),
    });
    assert.equal(result.status, 'active');
    assert.equal(h.updates.length, 0);
    assert.equal(h.payouts.length, 0);
  });

  it('host-only check-out does not complete', async () => {
    const h = harness({ lifecycle: {} });
    const result = await h.service.patchLifecycle('host-1', 'booking-1', {
      hostCheckoutTripEndedAt: Date.now(),
    });
    assert.equal(result.status, 'active');
    assert.equal(h.updates.length, 0);
  });

  it('second check-out completes exactly once (idempotent)', async () => {
    const h = harness({
      lifecycle: { guestCheckedOutAt: 1 },
    });
    await h.service.patchLifecycle('host-1', 'booking-1', {
      hostCheckoutTripEndedAt: 2,
    });
    assert.equal(h.booking.status, 'completed');
    const again = await h.service.completeTrip('booking-1', {
      by: 'both_checkouts',
    });
    assert.equal(again.status, 'completed');
    assert.equal(h.messages.length, 1);
    assert.equal(h.payouts.length, 1);
  });
});

describe('trip completion — /complete guards', () => {
  it('rejects with only one check-out (409)', async () => {
    const h = harness({
      lifecycle: { guestCheckedOutAt: Date.now() },
    });
    await assert.rejects(
      () => h.service.completeFromClient('guest-1', 'booking-1'),
      (err: unknown) => err instanceof ConflictException,
    );
  });

  it('rejects confirmed', async () => {
    const h = harness({ status: 'confirmed' as never, lifecycle: {} });
    await assert.rejects(
      () => h.service.completeFromClient('guest-1', 'booking-1'),
      (err: unknown) =>
        err instanceof BadRequestException &&
        /confirmed/i.test((err as Error).message),
    );
  });

  it('allows /complete when both check-outs present', async () => {
    const h = harness({
      lifecycle: {
        guestCheckedOutAt: 1,
        hostCheckoutTripEndedAt: 2,
      },
    });
    const result = await h.service.completeFromClient('guest-1', 'booking-1');
    assert.equal(result.status, 'completed');
  });

  it('admin force-complete bypasses both-checkout', async () => {
    const h = harness({ lifecycle: {} });
    const result = await h.service.forceCompleteAdmin('admin-1', 'booking-1');
    assert.equal(result.status, 'completed');
    assert.equal(
      (h.booking.lifecycle as { completedBy: string }).completedBy,
      'admin',
    );
  });

  it('auto completeTrip bypasses both-checkout', async () => {
    const h = harness({ lifecycle: {} });
    const result = await h.service.completeTrip('booking-1', {
      by: 'auto',
      requireBothCheckouts: false,
    });
    assert.equal(result.status, 'completed');
  });
});

describe('trip completion — stale candidates', () => {
  it('72h boundary: 71h59 no, 72h01 yes', async () => {
    const { autoCompleteHours } = loadTripCompletionEnv({});
    assert.equal(autoCompleteHours, 72);
    const now = Date.now();
    const endEarly = now - (72 * MS_H - 60 * 1000); // 71h59 ago
    const endLate = now - (72 * MS_H + 60 * 1000); // 72h01 ago

    const hEarly = harness({
      bookingDates: { start: endEarly - MS_D, end: endEarly },
      lifecycle: { guestCheckedOutAt: 1 },
    });
    const early = await hEarly.service.findStaleTripCandidates(now);
    assert.equal(early.autoComplete.length, 0);

    const hLate = harness({
      bookingDates: { start: endLate - MS_D, end: endLate },
      lifecycle: { guestCheckedOutAt: 1 },
    });
    const late = await hLate.service.findStaleTripCandidates(now);
    assert.equal(late.autoComplete.length, 1);
  });

  it('skips open late-return hold', async () => {
    const now = Date.now();
    const end = now - 80 * MS_H;
    const h = harness({
      bookingDates: { start: end - MS_D, end },
      lifecycle: {
        guestCheckedOutAt: 1,
        lateReturn: { status: 'open', reportedAt: now },
      },
    });
    const c = await h.service.findStaleTripCandidates(now);
    assert.equal(c.autoComplete.length, 0);
  });

  it('extension_pending is not in completable statuses (skipped by query)', async () => {
    const { COMPLETABLE_TRIP_STATUSES } = await import('./trip-completion.config');
    assert.equal(
      (COMPLETABLE_TRIP_STATUSES as readonly string[]).includes('extension_pending'),
      false,
    );
  });

  it('no-show candidate for confirmed past end + 2h', async () => {
    const now = Date.now();
    const end = now - 3 * MS_H;
    const booking = {
      id: 'ns-1',
      status: 'confirmed',
      bookingDates: { start: end - MS_D, end },
      lifecycle: {},
    } as unknown as BookingEntity;
    const h = harness();
    let call = 0;
    (h.service as unknown as { bookingsRepo: { find: () => Promise<BookingEntity[]> } }).bookingsRepo.find =
      async () => {
        call += 1;
        // first call: started trips; second: never-started
        return call === 1 ? [] : [booking];
      };
    const c = await h.service.findStaleTripCandidates(now);
    assert.equal(c.noShow.length, 1);
  });

  it('resolving late-return unblocks auto-complete candidacy', async () => {
    const now = Date.now();
    const end = now - 80 * MS_H;
    const h = harness({
      bookingDates: { start: end - MS_D, end },
      lifecycle: {
        guestCheckedOutAt: 1,
        lateReturn: { status: 'open', reportedAt: now },
      },
    });
    assert.equal((await h.service.findStaleTripCandidates(now)).autoComplete.length, 0);
    await h.service.resolveLateReturnAdmin('admin-1', 'booking-1');
    assert.equal((await h.service.findStaleTripCandidates(now)).autoComplete.length, 1);
  });
});

describe('trip completion — no-show path', () => {
  it('marks never-started as no_show once', async () => {
    const h = harness({
      status: 'confirmed' as never,
      lifecycle: {},
    });
    const ok = await h.service.markNeverStartedNoShow('booking-1');
    assert.equal(ok, true);
    assert.equal(h.booking.status, 'no_show');
    assert.ok((h.booking.lifecycle as { noShowAt: number }).noShowAt);
    assert.equal(h.messages.length, 1);

    const again = await h.service.markNeverStartedNoShow('booking-1');
    assert.equal(again, false);
  });
});

describe('trip completion — concurrent idempotency', () => {
  it('second conditional update is a no-op (one message, one payout)', async () => {
    const h = harness({
      lifecycle: {
        guestCheckedOutAt: 1,
        hostCheckoutTripEndedAt: 2,
      },
    });
    await h.service.completeTrip('booking-1', { by: 'client' });
    // Simulate concurrent loser: status already completed
    const result = await h.service.completeTrip('booking-1', { by: 'client' });
    assert.equal(result.status, 'completed');
    assert.equal(h.messages.length, 1);
    assert.equal(h.payouts.length, 1);
  });
});

describe('trip completion — transition errors', () => {
  it('logs and surfaces invalid transition (not already-in-target)', async () => {
    const h = harness({ status: 'pending_host' as never });
    await assert.rejects(
      () =>
        h.service.transitionStatus('guest-1', 'booking-1', 'active', [
          'checkin_pending',
        ]),
      /Invalid transition/,
    );
  });

  it('already in target status returns booking (no throw)', async () => {
    const h = harness({ status: 'active' as never });
    const result = await h.service.transitionStatus(
      'guest-1',
      'booking-1',
      'active',
      ['checkin_pending'],
    );
    assert.equal(result.status, 'active');
  });
});
