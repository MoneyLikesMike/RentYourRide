/**
 * Turo-style cancellation policy (Oct 15 V2).
 * Pure functions only — call sites must use CANCELLATION_POLICY_V2 / V1 from here.
 */

import { getTripBillingDays } from './trip-billing-days';

export type CancelActor = 'guest' | 'host' | 'admin' | 'system';
export type CancelReason =
  | 'standard'
  | 'no_show'
  | 'dirty_unsafe'
  | 'emergency'
  | 'mutual'
  | 'host_decline'
  | 'expiry';

export type PolicyVersion = 'v1' | 'v2';

export type CancellationTier = 'free' | 'late' | 'no_show' | 'full_refund';

export type TripFeeOnCharge = 'keep_pro_rata' | 'refund_all';
export type TaxOnCharge = 'pro_rata' | 'refund_all' | 'keep_all';

/** V2 config table — single source for call sites. */
export const CANCELLATION_POLICY_V2 = {
  freeCancelMsBeforeStart: 24 * 60 * 60 * 1000,
  /** Same-day grace: booked within free window AND cancel ≤ this after create. */
  sameDayGraceMsAfterBook: 60 * 60 * 1000,
  lateDaysWhenBillingGt2: 1,
  lateDaysWhenBillingLte2: 0.5,
  noShowDaysWhenBillingGt1: 2,
  noShowDaysWhenBillingLte1: 0.75,
  deliveryChargeFractionLateOrNoShow: 0.5,
  hostShareOfTripCharge: 0.75,
  hostShareOfDeliveryCharge: 0.5,
  // TODO [OPEN-2]: confirm trip-fee / tax retention with Michael / finance.
  tripFeeOnCharge: 'refund_all' as TripFeeOnCharge,
  taxOnCharge: 'pro_rata' as TaxOnCharge,
};

/**
 * Legacy (July 28 Cancellation Policy page): free >24h before start, or
 * ≤1h after booking when trip starts <24h out; otherwise charge 1 day
 * (simpler V1 — used only for more-generous comparison).
 */
export const CANCELLATION_POLICY_V1 = {
  freeCancelMsBeforeStart: 24 * 60 * 60 * 1000,
  sameDayGraceMsAfterBook: 60 * 60 * 1000,
  lateDays: 1,
  deliveryChargeFraction: 0.5,
  hostShareOfTripCharge: 0.75,
  hostShareOfDeliveryCharge: 0.5,
  tripFeeOnCharge: 'refund_all' as TripFeeOnCharge,
  taxOnCharge: 'pro_rata' as TaxOnCharge,
};

export type CancellationPricingInput = {
  /** Effective daily rate actually charged (post-discount), dollars. */
  dailyRate: number;
  billingDays: number;
  /** Vehicle rental subtotal (discounted trip), dollars. */
  tripPrice: number;
  tripFee: number;
  deliveryFee: number;
  taxes: number;
  /** Total guest paid / authorized, dollars. */
  totalPaid: number;
};

export type CancellationOutcome = {
  guestChargeCents: number;
  guestRefundCents: number;
  hostShareCents: number;
  platformRetainCents: number;
  tier: CancellationTier;
  policyVersion: PolicyVersion;
  breakdown: Array<{ key: string; label: string; cents: number }>;
};

export type ComputeCancellationInput = {
  pricing: CancellationPricingInput;
  startMs: number;
  createdAtMs: number;
  cancelledAtMs: number;
  actor: CancelActor;
  reason: CancelReason;
  policyVersion?: PolicyVersion | null;
};

const FULL_REFUND_REASONS: CancelReason[] = [
  'dirty_unsafe',
  'emergency',
  'mutual',
  'host_decline',
  'expiry',
];

/** Half-up rounding to integer cents from a dollar amount. */
export function dollarsToCentsHalfUp(dollars: number): number {
  if (!Number.isFinite(dollars)) return 0;
  return Math.round(dollars * 100 + Number.EPSILON);
}

/** Half-up for fractional cents already in cent-space (e.g. 0.5 day * dailyCents). */
export function roundCentsHalfUp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value + Number.EPSILON);
}

export function loadCancellationPolicyEnv(env: NodeJS.ProcessEnv = process.env): {
  v2EffectiveAtMs: number | null;
  tripFeeOnCharge: TripFeeOnCharge;
  taxOnCharge: TaxOnCharge;
} {
  const raw = env.CANCELLATION_POLICY_V2_EFFECTIVE_AT?.trim();
  let v2EffectiveAtMs: number | null = null;
  if (raw) {
    const ms = Date.parse(raw);
    if (Number.isFinite(ms)) v2EffectiveAtMs = ms;
  }
  const feeRaw = (env.TRIP_FEE_ON_CHARGE || '').trim().toLowerCase();
  const tripFeeOnCharge: TripFeeOnCharge =
    feeRaw === 'keep_pro_rata' ? 'keep_pro_rata' : 'refund_all';
  const taxRaw = (env.TAX_ON_CHARGE || '').trim().toLowerCase();
  let taxOnCharge: TaxOnCharge = 'pro_rata';
  if (taxRaw === 'refund_all' || taxRaw === 'keep_all') taxOnCharge = taxRaw;
  return { v2EffectiveAtMs, tripFeeOnCharge, taxOnCharge };
}

export function resolvePolicyVersion(opts: {
  policyVersion?: PolicyVersion | null;
  createdAtMs: number;
  v2EffectiveAtMs: number | null;
}): PolicyVersion {
  if (opts.policyVersion === 'v1' || opts.policyVersion === 'v2') {
    return opts.policyVersion;
  }
  if (
    opts.v2EffectiveAtMs != null &&
    Number.isFinite(opts.createdAtMs) &&
    opts.createdAtMs < opts.v2EffectiveAtMs
  ) {
    return 'v1';
  }
  return 'v2';
}

export function pricingCentsFromBooking(pricing: Record<string, unknown> | null | undefined): CancellationPricingInput {
  const p = pricing || {};
  const tripDays = Number(p.tripDays) || 0;
  const discounted = Number(p.discountedTripSubtotal ?? p.baseTripSubtotal ?? 0) || 0;
  const pricePerDay = Number(p.pricePerDay) || 0;
  const dailyRate =
    tripDays > 0 && discounted > 0 ? discounted / tripDays : pricePerDay;
  const deliveryFee = Number(p.selectedDeliveryFee ?? 0) || 0;
  const tripFee = Number(p.tripFee ?? 0) || 0;
  const taxes = Number(p.taxes ?? p.tax ?? 0) || 0;
  const grandTotal = Number(p.grandTotal ?? 0) || 0;
  const totalPaid =
    grandTotal > 0 ? grandTotal : discounted + deliveryFee + tripFee + taxes;
  return {
    dailyRate,
    billingDays: tripDays > 0 ? tripDays : 1,
    tripPrice: discounted,
    tripFee,
    deliveryFee,
    taxes,
    totalPaid,
  };
}

function isFreeWindow(opts: {
  startMs: number;
  createdAtMs: number;
  cancelledAtMs: number;
  freeMs: number;
  graceMs: number;
}): boolean {
  const msBeforeStart = opts.startMs - opts.cancelledAtMs;
  if (msBeforeStart > opts.freeMs) return true;
  const bookedInsideWindow = opts.startMs - opts.createdAtMs < opts.freeMs;
  const withinGrace =
    opts.cancelledAtMs - opts.createdAtMs <= opts.graceMs;
  return bookedInsideWindow && withinGrace;
}

function applyFeeAndTax(opts: {
  tripChargeCents: number;
  tripPriceCents: number;
  tripFeeCents: number;
  taxCents: number;
  tripFeeOnCharge: TripFeeOnCharge;
  taxOnCharge: TaxOnCharge;
}): { feeChargeCents: number; taxChargeCents: number } {
  const ratio =
    opts.tripPriceCents > 0 ? opts.tripChargeCents / opts.tripPriceCents : 0;
  let feeChargeCents = 0;
  if (opts.tripFeeOnCharge === 'keep_pro_rata') {
    feeChargeCents = roundCentsHalfUp(opts.tripFeeCents * ratio);
  }
  // refund_all → feeChargeCents = 0

  let taxChargeCents = 0;
  if (opts.taxOnCharge === 'keep_all') {
    taxChargeCents = opts.taxCents;
  } else if (opts.taxOnCharge === 'pro_rata') {
    taxChargeCents = roundCentsHalfUp(opts.taxCents * ratio);
  }
  // refund_all → 0
  return { feeChargeCents, taxChargeCents };
}

function finalizeOutcome(opts: {
  tier: CancellationTier;
  policyVersion: PolicyVersion;
  tripChargeCents: number;
  deliveryChargeCents: number;
  feeChargeCents: number;
  taxChargeCents: number;
  totalPaidCents: number;
  hostShareOfTrip: number;
  hostShareOfDelivery: number;
}): CancellationOutcome {
  let guestChargeCents =
    opts.tripChargeCents +
    opts.deliveryChargeCents +
    opts.feeChargeCents +
    opts.taxChargeCents;
  if (guestChargeCents > opts.totalPaidCents) {
    guestChargeCents = opts.totalPaidCents;
  }
  if (guestChargeCents < 0) guestChargeCents = 0;

  const guestRefundCents = opts.totalPaidCents - guestChargeCents;
  const hostShareCents =
    roundCentsHalfUp(opts.tripChargeCents * opts.hostShareOfTrip) +
    roundCentsHalfUp(opts.deliveryChargeCents * opts.hostShareOfDelivery);
  const cappedHost = Math.min(hostShareCents, guestChargeCents);
  const platformRetainCents = Math.max(0, guestChargeCents - cappedHost);

  const breakdown: CancellationOutcome['breakdown'] = [
    { key: 'trip_charge', label: 'Trip charge', cents: opts.tripChargeCents },
    {
      key: 'delivery_charge',
      label: 'Delivery charge',
      cents: opts.deliveryChargeCents,
    },
    { key: 'trip_fee_charge', label: 'Trip fee charged', cents: opts.feeChargeCents },
    { key: 'tax_charge', label: 'Tax charged', cents: opts.taxChargeCents },
    { key: 'guest_charge', label: 'Guest charged', cents: guestChargeCents },
    { key: 'guest_refund', label: 'Guest refund', cents: guestRefundCents },
    { key: 'host_share', label: 'Host share', cents: cappedHost },
    {
      key: 'platform_retain',
      label: 'Platform retain',
      cents: platformRetainCents,
    },
  ];

  return {
    guestChargeCents,
    guestRefundCents,
    hostShareCents: cappedHost,
    platformRetainCents,
    tier: opts.tier,
    policyVersion: opts.policyVersion,
    breakdown,
  };
}

function computeV2(
  input: ComputeCancellationInput,
  feeCfg: { tripFeeOnCharge: TripFeeOnCharge; taxOnCharge: TaxOnCharge },
): CancellationOutcome {
  const cfg = CANCELLATION_POLICY_V2;
  const tripPriceCents = dollarsToCentsHalfUp(input.pricing.tripPrice);
  const deliveryCents = dollarsToCentsHalfUp(input.pricing.deliveryFee);
  const tripFeeCents = dollarsToCentsHalfUp(input.pricing.tripFee);
  const taxCents = dollarsToCentsHalfUp(input.pricing.taxes);
  const totalPaidCents = dollarsToCentsHalfUp(input.pricing.totalPaid);
  const dailyCents = dollarsToCentsHalfUp(input.pricing.dailyRate);
  const billingDays =
    input.pricing.billingDays > 0
      ? input.pricing.billingDays
      : getTripBillingDays(input.startMs, input.startMs + 24 * 60 * 60 * 1000);

  const fullRefund =
    input.actor === 'host' ||
    FULL_REFUND_REASONS.includes(input.reason);

  if (fullRefund) {
    return finalizeOutcome({
      tier: 'full_refund',
      policyVersion: 'v2',
      tripChargeCents: 0,
      deliveryChargeCents: 0,
      feeChargeCents: 0,
      taxChargeCents: 0,
      totalPaidCents,
      hostShareOfTrip: cfg.hostShareOfTripCharge,
      hostShareOfDelivery: cfg.hostShareOfDeliveryCharge,
    });
  }

  if (
    isFreeWindow({
      startMs: input.startMs,
      createdAtMs: input.createdAtMs,
      cancelledAtMs: input.cancelledAtMs,
      freeMs: cfg.freeCancelMsBeforeStart,
      graceMs: cfg.sameDayGraceMsAfterBook,
    }) &&
    input.reason !== 'no_show'
  ) {
    return finalizeOutcome({
      tier: 'free',
      policyVersion: 'v2',
      tripChargeCents: 0,
      deliveryChargeCents: 0,
      feeChargeCents: 0,
      taxChargeCents: 0,
      totalPaidCents,
      hostShareOfTrip: cfg.hostShareOfTripCharge,
      hostShareOfDelivery: cfg.hostShareOfDeliveryCharge,
    });
  }

  const isNoShow = input.reason === 'no_show';
  const daysToCharge = isNoShow
    ? billingDays <= 1
      ? cfg.noShowDaysWhenBillingLte1
      : cfg.noShowDaysWhenBillingGt1
    : billingDays > 2
      ? cfg.lateDaysWhenBillingGt2
      : cfg.lateDaysWhenBillingLte2;

  let tripChargeCents = roundCentsHalfUp(dailyCents * daysToCharge);
  if (isNoShow) {
    tripChargeCents = Math.min(tripChargeCents, tripPriceCents);
  } else {
    tripChargeCents = Math.min(tripChargeCents, tripPriceCents);
  }

  const deliveryChargeCents = roundCentsHalfUp(
    deliveryCents * cfg.deliveryChargeFractionLateOrNoShow,
  );

  const { feeChargeCents, taxChargeCents } = applyFeeAndTax({
    tripChargeCents,
    tripPriceCents,
    tripFeeCents,
    taxCents,
    tripFeeOnCharge: feeCfg.tripFeeOnCharge,
    taxOnCharge: feeCfg.taxOnCharge,
  });

  return finalizeOutcome({
    tier: isNoShow ? 'no_show' : 'late',
    policyVersion: 'v2',
    tripChargeCents,
    deliveryChargeCents,
    feeChargeCents,
    taxChargeCents,
    totalPaidCents,
    hostShareOfTrip: cfg.hostShareOfTripCharge,
    hostShareOfDelivery: cfg.hostShareOfDeliveryCharge,
  });
}

/** Legacy V1: free window same as V2; late always 1 day + 50% delivery. */
function computeV1(
  input: ComputeCancellationInput,
  feeCfg: { tripFeeOnCharge: TripFeeOnCharge; taxOnCharge: TaxOnCharge },
): CancellationOutcome {
  const cfg = CANCELLATION_POLICY_V1;
  const tripPriceCents = dollarsToCentsHalfUp(input.pricing.tripPrice);
  const deliveryCents = dollarsToCentsHalfUp(input.pricing.deliveryFee);
  const tripFeeCents = dollarsToCentsHalfUp(input.pricing.tripFee);
  const taxCents = dollarsToCentsHalfUp(input.pricing.taxes);
  const totalPaidCents = dollarsToCentsHalfUp(input.pricing.totalPaid);
  const dailyCents = dollarsToCentsHalfUp(input.pricing.dailyRate);

  if (input.actor === 'host' || FULL_REFUND_REASONS.includes(input.reason)) {
    return finalizeOutcome({
      tier: 'full_refund',
      policyVersion: 'v1',
      tripChargeCents: 0,
      deliveryChargeCents: 0,
      feeChargeCents: 0,
      taxChargeCents: 0,
      totalPaidCents,
      hostShareOfTrip: cfg.hostShareOfTripCharge,
      hostShareOfDelivery: cfg.hostShareOfDeliveryCharge,
    });
  }

  if (
    isFreeWindow({
      startMs: input.startMs,
      createdAtMs: input.createdAtMs,
      cancelledAtMs: input.cancelledAtMs,
      freeMs: cfg.freeCancelMsBeforeStart,
      graceMs: cfg.sameDayGraceMsAfterBook,
    }) &&
    input.reason !== 'no_show'
  ) {
    return finalizeOutcome({
      tier: 'free',
      policyVersion: 'v1',
      tripChargeCents: 0,
      deliveryChargeCents: 0,
      feeChargeCents: 0,
      taxChargeCents: 0,
      totalPaidCents,
      hostShareOfTrip: cfg.hostShareOfTripCharge,
      hostShareOfDelivery: cfg.hostShareOfDeliveryCharge,
    });
  }

  const daysToCharge =
    input.reason === 'no_show' ? Math.min(2, input.pricing.billingDays || 1) : cfg.lateDays;
  const tripChargeCents = Math.min(
    roundCentsHalfUp(dailyCents * daysToCharge),
    tripPriceCents,
  );
  const deliveryChargeCents = roundCentsHalfUp(
    deliveryCents * cfg.deliveryChargeFraction,
  );
  const { feeChargeCents, taxChargeCents } = applyFeeAndTax({
    tripChargeCents,
    tripPriceCents,
    tripFeeCents,
    taxCents,
    tripFeeOnCharge: feeCfg.tripFeeOnCharge,
    taxOnCharge: feeCfg.taxOnCharge,
  });

  return finalizeOutcome({
    tier: input.reason === 'no_show' ? 'no_show' : 'late',
    policyVersion: 'v1',
    tripChargeCents,
    deliveryChargeCents,
    feeChargeCents,
    taxChargeCents,
    totalPaidCents,
    hostShareOfTrip: cfg.hostShareOfTripCharge,
    hostShareOfDelivery: cfg.hostShareOfDeliveryCharge,
  });
}

/**
 * Compute cancellation money outcome.
 * For legacy bookings (v1 / created before V2 effective), pick the version
 * with the larger guest refund.
 */
export function computeCancellationOutcome(
  input: ComputeCancellationInput,
  env: NodeJS.ProcessEnv = process.env,
): CancellationOutcome {
  const envCfg = loadCancellationPolicyEnv(env);
  const feeCfg = {
    tripFeeOnCharge: envCfg.tripFeeOnCharge,
    taxOnCharge: envCfg.taxOnCharge,
  };
  // TODO [OPEN-2]: defaults refund_all trip fee + pro_rata tax until confirmed.

  const stored = resolvePolicyVersion({
    policyVersion: input.policyVersion,
    createdAtMs: input.createdAtMs,
    v2EffectiveAtMs: envCfg.v2EffectiveAtMs,
  });

  const v2 = computeV2(input, feeCfg);
  if (stored === 'v2') {
    return { ...v2, policyVersion: 'v2' };
  }

  const v1 = computeV1(input, feeCfg);
  // More-generous to guest: larger refund wins.
  if (v1.guestRefundCents >= v2.guestRefundCents) {
    return { ...v1, policyVersion: 'v1' };
  }
  return { ...v2, policyVersion: 'v2' };
}

/** Host clawback when entitled share dropped after a prior transfer. */
export function hostClawbackCents(opts: {
  transferredCents: number;
  hostShareCents: number;
}): number {
  const paid = Math.max(0, Math.round(opts.transferredCents));
  const entitled = Math.max(0, Math.round(opts.hostShareCents));
  return Math.max(0, paid - entitled);
}
