import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeLateFee, dailyRateCentsFromPricing } from './late-fee';
import { LATE_FEE_TIERS } from './trip-completion.config';

const DAY = 100_00; // $100/day in cents
const end = Date.parse('2026-10-01T18:00:00Z');

describe('computeLateFee', () => {
  it('≤30 min: 0', () => {
    const out = computeLateFee(end, end + 30 * 60 * 1000, DAY);
    assert.equal(out.discretionary, false);
    if (!out.discretionary) assert.equal(out.feeCents, 0);
  });

  it('31 min → 0.5 day', () => {
    const out = computeLateFee(end, end + 31 * 60 * 1000, DAY);
    assert.equal(out.discretionary, false);
    if (!out.discretionary) {
      assert.equal(out.daysCharged, 0.5);
      assert.equal(out.feeCents, 5000);
    }
  });

  it('exactly 2h → 0.5 day', () => {
    const out = computeLateFee(end, end + LATE_FEE_TIERS.halfDayMinutes * 60 * 1000, DAY);
    assert.equal(out.discretionary, false);
    if (!out.discretionary) assert.equal(out.daysCharged, 0.5);
  });

  it('2h01 → 1 day + $20', () => {
    const out = computeLateFee(
      end,
      end + (LATE_FEE_TIERS.halfDayMinutes + 1) * 60 * 1000,
      DAY,
    );
    assert.equal(out.discretionary, false);
    if (!out.discretionary) {
      assert.equal(out.daysCharged, 1);
      assert.equal(out.feeCents, 10000 + 2000);
    }
  });

  it('exactly 24h → 1 day + flat', () => {
    const out = computeLateFee(
      end,
      end + LATE_FEE_TIERS.fullDayMinutes * 60 * 1000,
      DAY,
    );
    assert.equal(out.discretionary, false);
    if (!out.discretionary) assert.equal(out.feeCents, 12000);
  });

  it('over 24h → discretionary', () => {
    const out = computeLateFee(
      end,
      end + (LATE_FEE_TIERS.fullDayMinutes + 1) * 60 * 1000,
      DAY,
    );
    assert.equal(out.discretionary, true);
    if (out.discretionary) assert.equal(out.feeCents, null);
  });

  it('on-time or early → 0', () => {
    const out = computeLateFee(end, end - 1000, DAY);
    assert.equal(out.discretionary, false);
    if (!out.discretionary) assert.equal(out.feeCents, 0);
  });
});

describe('dailyRateCentsFromPricing', () => {
  it('uses discounted subtotal / days', () => {
    assert.equal(
      dailyRateCentsFromPricing({
        tripDays: 3,
        discountedTripSubtotal: 300,
      }),
      10000,
    );
  });
});
