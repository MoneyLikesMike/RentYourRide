import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CANCELLATION_POLICY_V2,
  computeCancellationOutcome,
  dollarsToCentsHalfUp,
  hostClawbackCents,
  pricingCentsFromBooking,
  roundCentsHalfUp,
  type ComputeCancellationInput,
} from './cancellation-policy';

const MS_H = 60 * 60 * 1000;
const MS_D = 24 * MS_H;

function baseInput(
  overrides: Partial<ComputeCancellationInput> & {
    pricing?: Partial<ComputeCancellationInput['pricing']>;
  } = {},
): ComputeCancellationInput {
  const createdAtMs = Date.parse('2026-06-01T12:00:00Z');
  const startMs = createdAtMs + 3 * MS_D;
  return {
    pricing: {
      dailyRate: 100,
      billingDays: 3,
      tripPrice: 300,
      tripFee: 30,
      deliveryFee: 40,
      taxes: 0,
      totalPaid: 370,
      ...overrides.pricing,
    },
    startMs,
    createdAtMs,
    cancelledAtMs: createdAtMs + MS_H,
    actor: 'guest',
    reason: 'standard',
    policyVersion: 'v2',
    ...overrides,
    pricing: {
      dailyRate: 100,
      billingDays: 3,
      tripPrice: 300,
      tripFee: 30,
      deliveryFee: 40,
      taxes: 0,
      totalPaid: 370,
      ...overrides.pricing,
    },
  };
}

describe('cancellation-policy V2 (Turo-style)', () => {
  it('free when >24h before start', () => {
    const createdAtMs = Date.parse('2026-06-01T12:00:00Z');
    const startMs = createdAtMs + 3 * MS_D;
    const out = computeCancellationOutcome(
      baseInput({
        createdAtMs,
        startMs,
        cancelledAtMs: startMs - 24 * MS_H - 1,
        policyVersion: 'v2',
      }),
      {},
    );
    assert.equal(out.tier, 'free');
    assert.equal(out.guestChargeCents, 0);
    assert.equal(out.guestRefundCents, 37000);
  });

  it('late at exactly 24h before start (not free)', () => {
    const createdAtMs = Date.parse('2026-06-01T12:00:00Z');
    const startMs = createdAtMs + 3 * MS_D;
    const out = computeCancellationOutcome(
      baseInput({
        createdAtMs,
        startMs,
        cancelledAtMs: startMs - CANCELLATION_POLICY_V2.freeCancelMsBeforeStart,
        policyVersion: 'v2',
      }),
      {},
    );
    assert.equal(out.tier, 'late');
    // 1 day of $100 + 50% of $40 delivery; trip fee refunded
    assert.equal(out.guestChargeCents, 10000 + 2000);
    assert.equal(out.guestRefundCents, 37000 - 12000);
    assert.equal(out.hostShareCents, 7500 + 1000); // 75% of 100 + 50% of 20
  });

  it('free via 1h-after-booking grace when booked <24h out', () => {
    const createdAtMs = Date.parse('2026-06-01T12:00:00Z');
    const startMs = createdAtMs + 12 * MS_H; // <24h out
    const out = computeCancellationOutcome(
      baseInput({
        createdAtMs,
        startMs,
        cancelledAtMs: createdAtMs + MS_H, // exactly 1h
        policyVersion: 'v2',
      }),
      {},
    );
    assert.equal(out.tier, 'free');
    assert.equal(out.guestChargeCents, 0);
  });

  it('late (not free) just after 1h grace when booked <24h out', () => {
    const createdAtMs = Date.parse('2026-06-01T12:00:00Z');
    const startMs = createdAtMs + 12 * MS_H;
    const out = computeCancellationOutcome(
      baseInput({
        createdAtMs,
        startMs,
        cancelledAtMs: createdAtMs + MS_H + 1,
        policyVersion: 'v2',
        pricing: { billingDays: 3, tripPrice: 300, totalPaid: 370 },
      }),
      {},
    );
    assert.equal(out.tier, 'late');
  });

  it('late charges 1 day when billing days > 2', () => {
    const out = computeCancellationOutcome(
      baseInput({
        cancelledAtMs: baseInput().startMs - 2 * MS_H,
        pricing: { billingDays: 3, tripPrice: 300, dailyRate: 100, totalPaid: 330, deliveryFee: 0, tripFee: 30 },
      }),
      {},
    );
    assert.equal(out.tier, 'late');
    assert.equal(out.guestChargeCents, 10000);
  });

  it('late charges 0.5 day when billing days ≤ 2', () => {
    const out = computeCancellationOutcome(
      baseInput({
        cancelledAtMs: baseInput().startMs - 2 * MS_H,
        pricing: {
          billingDays: 2,
          tripPrice: 200,
          dailyRate: 100,
          deliveryFee: 0,
          tripFee: 20,
          totalPaid: 220,
        },
      }),
      {},
    );
    assert.equal(out.tier, 'late');
    assert.equal(out.guestChargeCents, 5000);
  });

  it('no-show: 2 days when billing > 1, capped at trip price', () => {
    const out = computeCancellationOutcome(
      baseInput({
        reason: 'no_show',
        pricing: {
          billingDays: 3,
          tripPrice: 150,
          dailyRate: 100,
          deliveryFee: 0,
          tripFee: 15,
          totalPaid: 165,
        },
      }),
      {},
    );
    assert.equal(out.tier, 'no_show');
    // 2 * 100 = 200 but capped at trip 150
    assert.equal(out.guestChargeCents, 15000);
  });

  it('no-show: 0.75 day when billing days ≤ 1', () => {
    const out = computeCancellationOutcome(
      baseInput({
        reason: 'no_show',
        pricing: {
          billingDays: 1,
          tripPrice: 100,
          dailyRate: 100,
          deliveryFee: 0,
          tripFee: 10,
          totalPaid: 110,
        },
      }),
      {},
    );
    assert.equal(out.tier, 'no_show');
    assert.equal(out.guestChargeCents, 7500);
  });

  it('delivery split 50% on late', () => {
    const out = computeCancellationOutcome(
      baseInput({
        cancelledAtMs: baseInput().startMs - 2 * MS_H,
        pricing: {
          billingDays: 3,
          tripPrice: 300,
          dailyRate: 100,
          deliveryFee: 40,
          tripFee: 0,
          taxes: 0,
          totalPaid: 340,
        },
      }),
      {},
    );
    const deliveryLine = out.breakdown.find((b) => b.key === 'delivery_charge');
    assert.equal(deliveryLine?.cents, 2000);
  });

  it('host cancel is full refund', () => {
    const out = computeCancellationOutcome(
      baseInput({
        actor: 'host',
        cancelledAtMs: baseInput().startMs - 2 * MS_H,
      }),
      {},
    );
    assert.equal(out.tier, 'full_refund');
    assert.equal(out.guestChargeCents, 0);
    assert.equal(out.guestRefundCents, 37000);
  });

  it('charge + refund == total paid (cent identity)', () => {
    const out = computeCancellationOutcome(
      baseInput({
        cancelledAtMs: baseInput().startMs - 2 * MS_H,
      }),
      {},
    );
    assert.equal(out.guestChargeCents + out.guestRefundCents, 37000);
  });

  it('half-up cent rounding', () => {
    assert.equal(dollarsToCentsHalfUp(10.01), 1001);
    assert.equal(dollarsToCentsHalfUp(10.004), 1000);
    assert.equal(roundCentsHalfUp(100.5), 101);
    assert.equal(roundCentsHalfUp(100.4), 100);
  });

  it('v1 vs v2 more-generous selection (larger guest refund)', () => {
    // 2-day trip late: V2 charges 0.5 day; V1 charges 1 day → V2 more generous
    const createdAtMs = Date.parse('2026-01-01T00:00:00Z');
    const startMs = createdAtMs + 3 * MS_D;
    const input = baseInput({
      policyVersion: 'v1',
      createdAtMs,
      startMs,
      cancelledAtMs: startMs - 2 * MS_H,
      pricing: {
        billingDays: 2,
        tripPrice: 200,
        dailyRate: 100,
        deliveryFee: 0,
        tripFee: 0,
        taxes: 0,
        totalPaid: 200,
      },
    });
    const out = computeCancellationOutcome(input, {
      CANCELLATION_POLICY_V2_EFFECTIVE_AT: '2026-10-15T00:00:00Z',
    });
    // V2 late 0.5 day = 5000 charge / 15000 refund; V1 late 1 day = 10000 / 10000
    // more generous = V2
    assert.equal(out.guestRefundCents, 15000);
    assert.equal(out.guestChargeCents, 5000);
  });

  it('pricingCentsFromBooking maps booking pricing', () => {
    const p = pricingCentsFromBooking({
      tripDays: 3,
      pricePerDay: 100,
      discountedTripSubtotal: 300,
      selectedDeliveryFee: 40,
      tripFee: 30,
      grandTotal: 370,
    });
    assert.equal(p.billingDays, 3);
    assert.equal(p.dailyRate, 100);
    assert.equal(p.totalPaid, 370);
  });

  it('hostClawbackCents', () => {
    assert.equal(hostClawbackCents({ transferredCents: 10000, hostShareCents: 7500 }), 2500);
    assert.equal(hostClawbackCents({ transferredCents: 5000, hostShareCents: 7500 }), 0);
  });
});
