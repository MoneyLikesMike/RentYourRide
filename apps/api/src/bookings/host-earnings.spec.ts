import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BookingsService } from './bookings.service';
import {
  computeHostEarnings,
  hostNetCentsForPricing,
  planExtensionHostPayout,
} from './host-earnings';
import { extensionPaymentDetails, hostBreakdownVars, serviceFee, hostReceiveTotal } from '../notifications/booking-context';
import { toAdminBookingRegistration, toAdminBookingRow } from '../admin/admin.mapper';
import type { BookingEntity } from '../entities/booking.entity';
import type { ListingEntity } from '../entities/listing.entity';
import { getHostEarnings } from '../../../web/src/utils/hostEarnings';
import {
  getHostNetEarnings,
  getHostServiceFee,
} from '../../../../utils/hostBookingEarnings.js';

const DAY = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 10, 2, 16, 0);

function listing(over: Partial<ListingEntity> = {}): ListingEntity {
  return {
    id: 'listing-1',
    pricePerDay: 100,
    deliveryPrice: 35,
    dailyKm: '200 km/day',
    weeklyDiscount: '10%',
    monthlyDiscount: '20%',
    ...over,
  } as unknown as ListingEntity;
}

function quote(days: number, extras: { clean?: boolean; fuel?: boolean; km?: boolean; delivery?: boolean } = {}) {
  return BookingsService.prototype.quote.call({}, listing(), {
    listingId: 'listing-1',
    bookingDates: { start: START, end: START + days * DAY },
    extraPrepaidClean: extras.clean,
    extraPrepaidFuel: extras.fuel,
    extraUnlimitedKm: extras.km,
    deliveryEnabled: extras.delivery,
  });
}

function bookingFrom(pricing: Record<string, unknown>, extras: unknown[]): BookingEntity {
  return {
    id: 'booking-1',
    hostUserId: 'host-1',
    guestUserId: 'guest-1',
    listingId: 'listing-1',
    deliveryEnabled: true,
    pricing,
    extras,
    bookingDates: { start: START, end: START + 3 * DAY },
    lifecycle: {},
    listingSnapshot: {},
    createdAt: new Date(START),
  } as unknown as BookingEntity;
}

const transferCents = (b: BookingEntity): number =>
  (BookingsService.prototype as unknown as { hostReceiveCents(b: BookingEntity): number })
    .hostReceiveCents.call({}, b);

describe('host earnings rule', () => {
  it('$100/day × 3 + $35 delivery + $50 clean: host $310, RYR service fee $75, guest trip fee $30', () => {
    const q = quote(3, { clean: true, delivery: true });
    assert.equal(q.tripDays, 3);
    assert.equal(q.hostReceiveTotal, 310);
    assert.equal(q.serviceFee, 75);
    assert.equal(q.serviceFeeRate, 0.25);
    assert.equal(q.serviceFeeBase, 'discounted');
    assert.equal(q.tripFee, 30);
    assert.equal(q.grandTotal, 415);
  });

  it('weekly discount: fee on the discounted daily total by default; undiscounted flag flips it', () => {
    const q = quote(7);
    assert.equal(q.appliesWeeklyDiscount, true);
    assert.equal(q.discountedTripSubtotal, 630);
    assert.equal(q.serviceFee, 157.5);
    assert.equal(q.hostReceiveTotal, 472.5);
    const undiscounted = computeHostEarnings(q, { base: 'undiscounted' });
    assert.equal(undiscounted.serviceFeeCents, 17500);
    assert.equal(undiscounted.hostNetCents, 45500);
  });

  it('monthly discount: fee on the discounted daily total by default; undiscounted flag flips it', () => {
    const q = quote(30);
    assert.equal(q.appliesMonthlyDiscount, true);
    assert.equal(q.discountedTripSubtotal, 2400);
    assert.equal(q.serviceFee, 600);
    assert.equal(q.hostReceiveTotal, 1800);
    const undiscounted = computeHostEarnings(q, { base: 'undiscounted' });
    assert.equal(undiscounted.serviceFeeCents, 75000);
    assert.equal(undiscounted.hostNetCents, 165000);
  });

  it('extras and delivery are never part of the fee base', () => {
    const q = quote(3, { clean: true, fuel: true, km: true, delivery: true });
    assert.equal(q.serviceFee, 75);
    assert.equal(q.hostReceiveTotal, 225 + 50 + 80 + 150 + 35);
  });

  it('works in integer cents without float drift', () => {
    const e = computeHostEarnings({ discountedTripSubtotal: 0.1 + 0.2, subtotal: 0.3 });
    assert.equal(e.serviceFeeCents, 8);
    assert.equal(e.hostNetCents, 22);
  });

  it('old bookings (hostReceiveTotal = full subtotal, no serviceFeeRate) are recomputed under the rule', () => {
    const legacy = {
      discountedTripSubtotal: 300,
      selectedDeliveryFee: 35,
      prepaidCleanFee: 50,
      subtotal: 385,
      hostReceiveTotal: 385,
    };
    assert.equal(hostNetCentsForPricing(legacy), 31000);
  });

  it('old bookings without extra fields derive extras from subtotal', () => {
    assert.equal(hostNetCentsForPricing({ discountedTripSubtotal: 300, subtotal: 385 }), 31000);
  });
});

describe('extension host payout', () => {
  const ext = quote(2);

  it('prices an extension with the same rule', () => {
    assert.equal(ext.serviceFee, 50);
    assert.equal(ext.hostReceiveTotal, 150);
    assert.equal(ext.tripFee, 20);
  });

  it('approved extension schedules exactly one payout for the host share', () => {
    const plan = planExtensionHostPayout({ approved: true, pricing: ext, sourceChargeId: 'ch_ext' });
    assert.deepEqual(plan, {
      kind: 'extension',
      status: 'scheduled',
      amountCents: 15000,
      sourceChargeId: 'ch_ext',
    });
    assert.equal(
      planExtensionHostPayout({
        approved: true,
        pricing: ext,
        sourceChargeId: 'ch_ext',
        existingPayoutStatus: plan!.status,
      }),
      null,
    );
  });

  it('declined extension schedules no payout', () => {
    assert.equal(planExtensionHostPayout({ approved: false, pricing: ext, sourceChargeId: 'ch_ext' }), null);
  });

  it('unpaid ($0) extension schedules no payout', () => {
    assert.equal(planExtensionHostPayout({ approved: true, pricing: {}, sourceChargeId: null }), null);
  });

  it('extension email shows the host share and service fee', () => {
    assert.equal(extensionPaymentDetails(ext), 'Trip days: 2\nYour earnings: $150.00\nService Fee: $50.00');
  });
});

describe('hostBreakdownVars', () => {
  it('no discount row, only the selected extra shown, fee in parentheses', () => {
    const v = hostBreakdownVars(
      {
        pricePerDay: 50,
        baseTripSubtotal: 150,
        discountedTripSubtotal: 150,
        unlimitedKmFee: 0,
        prepaidFuelFee: 0,
        prepaidCleanFee: 20,
        selectedDeliveryFee: 25,
      },
      3,
    );
    assert.deepEqual(v['Booking.TripDaysLabel'], ['3 days']);
    assert.deepEqual(v['Booking.PricePerDay'], ['$50.00']);
    assert.deepEqual(v['Booking.BaseTripSubtotal'], ['$150.00']);
    assert.deepEqual(v['Booking.DiscountAmount'], ['']);
    assert.deepEqual(v['Booking.ExtraKms'], ['']);
    assert.deepEqual(v['Booking.ExtraFuel'], ['']);
    assert.deepEqual(v['Booking.ExtraClean'], ['$20.00']);
    assert.deepEqual(v['Booking.ExtraDelivery'], ['$25.00']);
    assert.deepEqual(v['Booking.HasExtras'], ['yes']);
    assert.deepEqual(v['Booking.Subtotal'], ['$195.00']);
    assert.deepEqual(v['Booking.ServiceFeeLabel'], ['Service fee (25%)']);
    assert.deepEqual(v['Booking.ServiceFeeDeduction'], ['($37.50)']);
    assert.deepEqual(v['Booking.HostRecieveTotal'], ['$157.50']);
  });

  it('weekly discount shown as a deduction, no extras section', () => {
    const v = hostBreakdownVars(
      {
        pricePerDay: 50,
        baseTripSubtotal: 400,
        discountedTripSubtotal: 360,
        weeklyDiscountPct: 10,
        appliesMonthlyDiscount: false,
      },
      8,
    );
    assert.deepEqual(v['Booking.TripDaysLabel'], ['8 days']);
    assert.deepEqual(v['Booking.DiscountLabel'], ['Weekly discount (10%)']);
    assert.deepEqual(v['Booking.DiscountAmount'], ['($40.00)']);
    assert.deepEqual(v['Booking.HasExtras'], ['']);
    assert.deepEqual(v['Booking.Subtotal'], ['$360.00']);
    assert.deepEqual(v['Booking.ServiceFeeDeduction'], ['($90.00)']);
    assert.deepEqual(v['Booking.HostRecieveTotal'], ['$270.00']);
  });

  it('single day uses singular label', () => {
    const v = hostBreakdownVars({ pricePerDay: 50, discountedTripSubtotal: 50 }, 1);
    assert.deepEqual(v['Booking.TripDaysLabel'], ['1 day']);
  });
});

describe('respondExtension', () => {
  function harness() {
    const ext = {
      id: 'ext-1',
      bookingId: 'booking-1',
      previousEndMs: String(START + 3 * DAY),
      newEndMs: String(START + 5 * DAY),
      status: 'pending',
      pricing: quote(2),
      stripePaymentIntentId: 'pi_ext',
      stripeChargeId: null,
      hostPayoutStatus: null,
      hostPayoutCents: null,
      hostPayoutScheduledAt: null,
      hostTransferId: null,
    } as Record<string, unknown>;
    const booking = {
      ...bookingFrom(quote(3), []),
      status: 'extension_pending',
      host: {},
      toMobileDto() {
        return { listingSnapshot: {} };
      },
    } as unknown as BookingEntity;
    const savedExtensions: Record<string, unknown>[] = [];
    const calls = { transfers: 0, refunds: 0 };
    const service = new BookingsService(
      { findOne: async () => booking, save: async (b: unknown) => b } as never,
      {
        findOne: async () => (ext.status === 'pending' ? ext : null),
        save: async (e: Record<string, unknown>) => {
          savedExtensions.push({ ...e });
          return e;
        },
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { postBookingSystemMessage: async () => undefined } as never,
      { extensionApproved: () => undefined, extensionDenied: () => undefined } as never,
      {
        isConfigured: () => true,
        chargeIdForPaymentIntent: async () => 'ch_ext',
        refundBookingPayment: async () => {
          calls.refunds += 1;
          return { refundId: 're_1' };
        },
        transferToHost: async () => {
          calls.transfers += 1;
          return null;
        },
      } as never,
    );
    return { service, ext, savedExtensions, calls };
  }

  it('approve schedules exactly one host payout from the extension charge, with no transfer yet', async () => {
    const { service, savedExtensions, calls } = harness();
    await service.respondExtension('host-1', 'booking-1', true);
    assert.equal(savedExtensions.length, 1);
    const saved = savedExtensions[0];
    assert.equal(saved.status, 'approved');
    assert.equal(saved.stripeChargeId, 'ch_ext');
    assert.equal(saved.hostPayoutStatus, 'scheduled');
    assert.equal(saved.hostPayoutCents, 15000);
    assert.ok(saved.hostPayoutScheduledAt instanceof Date);
    assert.equal(calls.transfers, 0);
    await assert.rejects(service.respondExtension('host-1', 'booking-1', true));
    assert.equal(savedExtensions.filter((e) => e.hostPayoutStatus === 'scheduled').length, 1);
  });

  it('decline schedules no host payout and refunds the guest', async () => {
    const { service, savedExtensions, calls } = harness();
    await service.respondExtension('host-1', 'booking-1', false);
    assert.equal(savedExtensions.length, 1);
    assert.equal(savedExtensions[0].status, 'declined');
    assert.equal(savedExtensions[0].hostPayoutStatus, null);
    assert.equal(savedExtensions[0].hostPayoutCents, null);
    assert.equal(calls.refunds, 1);
    assert.equal(calls.transfers, 0);
  });
});

describe('every surface shows the same host net for one booking', () => {
  const q = quote(3, { clean: true, delivery: true });
  const saved = { ...q, hostReceiveTotal: q.hostReceiveTotal };
  const legacySaved = (() => {
    const { serviceFee: _f, serviceFeeRate: _r, serviceFeeBase: _b, ...rest } = q;
    return { ...rest, hostReceiveTotal: q.subtotal };
  })();

  for (const [label, pricing] of [
    ['new booking', saved],
    ['old booking', legacySaved],
  ] as const) {
    it(label, () => {
      const booking = bookingFrom(pricing as Record<string, unknown>, q.selectedExtras);
      const surfaces = {
        apiQuote: q.hostReceiveTotal,
        transfer: transferCents(booking) / 100,
        hostEmail: hostReceiveTotal(booking),
        adminRow: toAdminBookingRow(booking).hostEarnings,
        adminRegistration: toAdminBookingRegistration(booking).hostEarnings / 100,
        web: getHostEarnings(booking.pricing as Record<string, unknown>, q.selectedExtras as { amount: number }[]).hostNet,
        mobile: getHostNetEarnings(booking),
      };
      for (const [name, value] of Object.entries(surfaces)) {
        assert.equal(value, 310, `${name} host net`);
      }
      const fees = {
        hostEmail: serviceFee(booking),
        adminRow: toAdminBookingRow(booking).serviceFee,
        web: getHostEarnings(booking.pricing as Record<string, unknown>, q.selectedExtras as { amount: number }[]).serviceFee,
        mobile: getHostServiceFee(booking),
      };
      for (const [name, value] of Object.entries(fees)) {
        assert.equal(value, 75, `${name} service fee`);
      }
    });
  }
});
