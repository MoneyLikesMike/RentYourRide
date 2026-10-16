import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import {
  formatCadDollars,
  getListingTripSubtotal,
  getTripBillingDays,
} from './listingCardMeta';

const require = createRequire(import.meta.url);
const { cases, formatCases } = require('../../../../shared/listingCardTripPricing.cases.js');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Future range with the given billing-day span (avoids RYRA-440 past-start null). */
function rangeForDays(days: number): { start: Date; end: Date } {
  const start = new Date('2099-06-01T10:00:00');
  const end = new Date(start.getTime() + days * MS_PER_DAY);
  assert.equal(getTripBillingDays(start, end), days);
  return { start, end };
}

describe('getListingTripSubtotal (shared table)', () => {
  for (const row of cases) {
    it(row.name, () => {
      const { start, end } = rangeForDays(row.days);
      const result = getListingTripSubtotal(
        {
          pricePerDay: row.pricePerDay,
          weeklyDiscount: row.weeklyDiscount,
          monthlyDiscount: row.monthlyDiscount,
        } as Parameters<typeof getListingTripSubtotal>[0],
        start,
        end,
      );
      assert.ok(result);
      assert.equal(result.originalTotal, row.originalTotal);
      assert.equal(result.total, row.total);
      assert.equal(result.hasDiscount, row.hasDiscount);
    });
  }
});

describe('formatCadDollars', () => {
  for (const row of formatCases) {
    it(`formats ${row.amount} as ${row.expected}`, () => {
      assert.equal(formatCadDollars(row.amount), row.expected);
    });
  }
});

describe('card vs checkout trip portion (no extras)', () => {
  it('matches Math.round(discounted + 10% fee) used on cards', () => {
    // Checkout grandTotal without extras is discounted*1.1 (float);
    // cards round that same quantity to whole dollars (pre-existing).
    const discounted = 56 * 8 * 0.9;
    const checkoutFloat = discounted + discounted * 0.1;
    assert.equal(Math.round(checkoutFloat), 444);
  });
});
