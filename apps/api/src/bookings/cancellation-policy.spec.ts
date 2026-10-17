import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCancellationOutcome,
  hostClawbackCents,
  loadCancellationPolicyConfig,
  type CancellationPolicyConfig,
} from './cancellation-policy';

const MS_H = 60 * 60 * 1000;
const MS_D = 24 * MS_H;

/** 3-day trip: $100/day → $300 trip, $30 trip fee, $40 delivery, grand $370. Host net via 25% of trip. */
function pricing3Day() {
  return {
    tripDays: 3,
    discountedTripSubtotal: 300,
    tripFee: 30,
    selectedDeliveryFee: 40,
    unlimitedKmFee: 0,
    prepaidFuelFee: 0,
    prepaidCleanFee: 0,
    subtotal: 340,
    grandTotal: 370,
    serviceFeeRate: 0.25,
    serviceFeeBase: 'discounted',
    hostReceiveTotal: 265, // 300*0.75 + 40
  };
}

/** 1-day trip: $100 trip, $10 trip fee, $20 delivery, grand $130. */
function pricing1Day() {
  return {
    tripDays: 1,
    discountedTripSubtotal: 100,
    tripFee: 10,
    selectedDeliveryFee: 20,
    unlimitedKmFee: 0,
    prepaidFuelFee: 0,
    prepaidCleanFee: 0,
    subtotal: 120,
    grandTotal: 130,
    serviceFeeRate: 0.25,
    serviceFeeBase: 'discounted',
    hostReceiveTotal: 95,
  };
}

const pageCfg: CancellationPolicyConfig = {
  preset: 'CANCELLATION_POLICY_PAGE',
  termsFullRefundMsBeforeStart: 5 * MS_D,
  pageFreeCancelMsBeforeStart: 24 * MS_H,
  pageSameDayGraceMsAfterBook: 1 * MS_H,
  hostCancellationFeeCents: 0,
  chargeHostCancellationFee: false,
};

const termsCfg: CancellationPolicyConfig = {
  ...pageCfg,
  preset: 'TERMS_9',
  hostCancellationFeeCents: 2500,
  chargeHostCancellationFee: false,
};

const start = Date.parse('2026-11-10T15:00:00.000Z');
const end3 = start + 3 * MS_D;
const end1 = start + 20 * MS_H;

describe('computeCancellationOutcome — CANCELLATION_POLICY_PAGE', () => {
  const cases: Array<{
    name: string;
    nowOffsetMs: number;
    bookedOffsetMs?: number;
    pricing: () => Record<string, unknown>;
    end: number;
    by?: 'guest' | 'host' | 'admin';
    status?: string;
    expectRefund: number;
    reasonIncludes: string;
    requiresAdmin?: boolean;
  }> = [
    {
      name: 'guest 10 days out — full refund',
      nowOffsetMs: -10 * MS_D,
      pricing: pricing3Day,
      end: end3,
      expectRefund: 37000,
      reasonIncludes: 'free_cancel',
    },
    {
      name: 'guest 5 days out — full refund',
      nowOffsetMs: -5 * MS_D,
      pricing: pricing3Day,
      end: end3,
      expectRefund: 37000,
      reasonIncludes: 'free_cancel',
    },
    {
      name: 'guest 4 days out — still free (>24h)',
      nowOffsetMs: -4 * MS_D,
      pricing: pricing3Day,
      end: end3,
      expectRefund: 37000,
      reasonIncludes: 'free_cancel',
    },
    {
      name: 'guest 25h out — free',
      nowOffsetMs: -25 * MS_H,
      pricing: pricing3Day,
      end: end3,
      expectRefund: 37000,
      reasonIncludes: 'free_cancel',
    },
    {
      name: 'guest 23h out on 3-day trip — 1 day + trip-fee share + 50% delivery',
      nowOffsetMs: -23 * MS_H,
      pricing: pricing3Day,
      end: end3,
      // fee = 10000 + 1000 + 2000 = 13000 → refund 37000-13000 = 24000
      expectRefund: 24000,
      reasonIncludes: 'multi_day',
    },
    {
      name: 'guest 23h out on 1-day trip — 50% (trip+fee) + 50% delivery kept',
      nowOffsetMs: -23 * MS_H,
      pricing: pricing1Day,
      end: end1,
      // fee = 0.5*(10000+1000) + 1000 = 6500 → refund 13000-6500 = 6500
      expectRefund: 6500,
      reasonIncludes: 'one_day',
    },
    {
      name: 'guest 23h out on 3-day trip without delivery',
      nowOffsetMs: -23 * MS_H,
      pricing: () => ({
        ...pricing3Day(),
        selectedDeliveryFee: 0,
        subtotal: 300,
        grandTotal: 330,
        hostReceiveTotal: 225,
      }),
      end: end3,
      // fee = 10000 + 1000 + 0 = 11000 → refund 33000-11000 = 22000
      expectRefund: 22000,
      reasonIncludes: 'multi_day',
    },
    {
      name: 'same-day booking within 1h grace — full refund',
      nowOffsetMs: -12 * MS_H,
      bookedOffsetMs: -30 * 60 * 1000,
      pricing: pricing1Day,
      end: end1,
      expectRefund: 13000,
      reasonIncludes: 'same_day_grace',
    },
    {
      name: 'within 1h of start on same-day booking after grace expired — fee',
      nowOffsetMs: -30 * 60 * 1000,
      bookedOffsetMs: -3 * MS_H,
      pricing: pricing1Day,
      end: end1,
      expectRefund: 6500,
      reasonIncludes: 'one_day',
    },
    {
      name: 'host cancel inside free window — full guest refund',
      nowOffsetMs: -3 * MS_D,
      pricing: pricing3Day,
      end: end3,
      by: 'host',
      expectRefund: 37000,
      reasonIncludes: 'host_cancel_inside',
    },
    {
      name: 'host cancel outside free window — full guest refund',
      nowOffsetMs: -12 * MS_H,
      pricing: pricing3Day,
      end: end3,
      by: 'host',
      expectRefund: 37000,
      reasonIncludes: 'host_cancel_outside',
    },
    {
      name: 'guest after trip start — requires admin, no silent refund',
      nowOffsetMs: 2 * MS_H,
      pricing: pricing3Day,
      end: end3,
      status: 'active',
      expectRefund: 0,
      reasonIncludes: 'requires_admin',
      requiresAdmin: true,
    },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const now = start + c.nowOffsetMs;
      const bookedAtMs =
        c.bookedOffsetMs != null ? start + c.bookedOffsetMs : start - 10 * MS_D;
      const out = computeCancellationOutcome({
        pricing: c.pricing(),
        startMs: start,
        endMs: c.end,
        now,
        cancelledBy: c.by ?? 'guest',
        bookedAtMs,
        config: pageCfg,
        status: c.status,
      });
      assert.equal(out.guestRefundCents, c.expectRefund, c.name);
      assert.match(out.reason, new RegExp(c.reasonIncludes));
      if (c.requiresAdmin) assert.equal(out.requiresAdmin, true);
    });
  }
});

describe('computeCancellationOutcome — TERMS_9', () => {
  it('guest 10 days out — full refund', () => {
    const out = computeCancellationOutcome({
      pricing: pricing3Day(),
      startMs: start,
      endMs: end3,
      now: start - 10 * MS_D,
      cancelledBy: 'guest',
      config: termsCfg,
    });
    assert.equal(out.guestRefundCents, 37000);
    assert.match(out.reason, /terms9_guest_full/);
  });

  it('guest exactly 5 days out — full refund', () => {
    const out = computeCancellationOutcome({
      pricing: pricing3Day(),
      startMs: start,
      endMs: end3,
      now: start - 5 * MS_D,
      cancelledBy: 'guest',
      config: termsCfg,
    });
    assert.equal(out.guestRefundCents, 37000);
  });

  it('guest 4 days out — no guest refund (host remitted)', () => {
    const out = computeCancellationOutcome({
      pricing: pricing3Day(),
      startMs: start,
      endMs: end3,
      now: start - 4 * MS_D,
      cancelledBy: 'guest',
      config: termsCfg,
    });
    assert.equal(out.guestRefundCents, 0);
    assert.ok(out.hostShareCents > 0);
    assert.match(out.reason, /outside_window/);
  });

  it('host cancel outside window records configured fee (default charge off)', () => {
    const out = computeCancellationOutcome({
      pricing: pricing3Day(),
      startMs: start,
      endMs: end3,
      now: start - 2 * MS_D,
      cancelledBy: 'host',
      config: termsCfg,
    });
    assert.equal(out.guestRefundCents, 37000);
    assert.equal(out.hostCancellationFeeCents, 2500);
    assert.equal(out.chargeHostCancellationFee, false);
  });

  it('host cancel inside 5-day window — full refund, no fee', () => {
    const out = computeCancellationOutcome({
      pricing: pricing3Day(),
      startMs: start,
      endMs: end3,
      now: start - 6 * MS_D,
      cancelledBy: 'host',
      config: termsCfg,
    });
    assert.equal(out.guestRefundCents, 37000);
    assert.equal(out.hostCancellationFeeCents, 0);
  });
});

describe('hostClawbackCents', () => {
  it('scales host share of refund and caps at remaining transfer', () => {
    assert.equal(
      hostClawbackCents({
        refundAmountCents: 18500,
        guestPayCents: 37000,
        hostNetCents: 26500,
        transferAmountCents: 26500,
      }),
      13250,
    );
    assert.equal(
      hostClawbackCents({
        refundAmountCents: 37000,
        guestPayCents: 37000,
        hostNetCents: 26500,
        alreadyReversedCents: 10000,
        transferAmountCents: 26500,
      }),
      16500,
    );
  });
});

describe('loadCancellationPolicyConfig', () => {
  it('defaults to CANCELLATION_POLICY_PAGE and fee 0', () => {
    const cfg = loadCancellationPolicyConfig({});
    assert.equal(cfg.preset, 'CANCELLATION_POLICY_PAGE');
    assert.equal(cfg.hostCancellationFeeCents, 0);
    assert.equal(cfg.chargeHostCancellationFee, false);
  });

  it('reads TERMS_9 preset from env', () => {
    const cfg = loadCancellationPolicyConfig({
      CANCELLATION_POLICY_PRESET: 'TERMS_9',
      HOST_CANCELLATION_FEE_CENTS: '1500',
      CHARGE_HOST_CANCELLATION_FEE: '1',
    });
    assert.equal(cfg.preset, 'TERMS_9');
    assert.equal(cfg.hostCancellationFeeCents, 1500);
    assert.equal(cfg.chargeHostCancellationFee, true);
  });
});
