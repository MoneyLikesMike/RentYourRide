import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';
import { getTripBillingDays } from './rentalTripDays.js';
import { formatCadDollars, getListingTripSubtotal } from './listingCardMeta.js';

const require = createRequire(import.meta.url);
const { cases, formatCases } = require('../shared/listingCardTripPricing.cases.js');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function rangeForDays(days) {
  const start = new Date('2099-06-01T10:00:00').getTime();
  const end = start + days * MS_PER_DAY;
  assert.equal(getTripBillingDays(start, end), days);
  return { start, end };
}

describe('getListingTripSubtotal (shared table)', () => {
  for (const row of cases) {
    it(row.name, () => {
      const result = getListingTripSubtotal(
        {
          pricePerDay: row.pricePerDay,
          weeklyDiscount: row.weeklyDiscount,
          monthlyDiscount: row.monthlyDiscount,
        },
        rangeForDays(row.days),
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
