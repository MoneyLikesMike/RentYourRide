/**
 * Host earnings rule (Michael, Oct 11 2026):
 *   host = dailyRateTotal × (1 − SERVICE_FEE_RATE) + extras + delivery
 * RYR keeps SERVICE_FEE_RATE of the daily-rate total only. The guest trip fee
 * (pricing.tripFee) stays with RYR and is never part of the base. Taxes are
 * never part of host earnings.
 *
 * Web (apps/web/src/utils/hostEarnings.ts) and mobile (utils/hostBookingEarnings.js)
 * prefer the values saved on pricing and fall back to this same rule.
 */

export type ServiceFeeBase = 'discounted' | 'undiscounted';

/** Share of the daily-rate total RYR keeps. RYRA-116 may make this per host plan. */
export const SERVICE_FEE_RATE = 0.25;

/** Daily-rate total after weekly/monthly discounts (Michael, Oct 11 2026). */
export const SERVICE_FEE_BASE: ServiceFeeBase = 'discounted';

export interface HostEarningsOptions {
  rate?: number;
  base?: ServiceFeeBase;
}

export interface HostEarnings {
  dailyRateTotalCents: number;
  serviceFeeCents: number;
  extrasTotalCents: number;
  deliveryFeeCents: number;
  hostNetCents: number;
  serviceFeeRate: number;
  serviceFeeBase: ServiceFeeBase;
}

type PricingLike = Record<string, unknown> | null | undefined;

function toCents(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function hasNumber(p: Record<string, unknown>, key: string): boolean {
  return p[key] != null && p[key] !== '' && Number.isFinite(Number(p[key]));
}

export function computeHostEarnings(
  pricing: PricingLike,
  opts: HostEarningsOptions = {},
): HostEarnings {
  const p = (pricing ?? {}) as Record<string, unknown>;
  const rate = opts.rate ?? SERVICE_FEE_RATE;
  const base = opts.base ?? SERVICE_FEE_BASE;

  const discountedCents = Math.max(0, toCents(p.discountedTripSubtotal));
  const undiscountedCents = hasNumber(p, 'baseTripSubtotal')
    ? Math.max(0, toCents(p.baseTripSubtotal))
    : discountedCents;
  const dailyRateTotalCents = base === 'undiscounted' ? undiscountedCents : discountedCents;

  const deliveryFeeCents = Math.max(0, toCents(p.selectedDeliveryFee));
  const hasExtraFields =
    hasNumber(p, 'unlimitedKmFee') || hasNumber(p, 'prepaidFuelFee') || hasNumber(p, 'prepaidCleanFee');
  const extrasTotalCents = hasExtraFields
    ? Math.max(0, toCents(p.unlimitedKmFee) + toCents(p.prepaidFuelFee) + toCents(p.prepaidCleanFee))
    : Math.max(0, toCents(p.subtotal) - discountedCents - deliveryFeeCents);

  const serviceFeeCents = Math.round(dailyRateTotalCents * rate);
  const hostNetCents = Math.max(
    0,
    discountedCents - serviceFeeCents + extrasTotalCents + deliveryFeeCents,
  );

  return {
    dailyRateTotalCents,
    serviceFeeCents,
    extrasTotalCents,
    deliveryFeeCents,
    hostNetCents,
    serviceFeeRate: rate,
    serviceFeeBase: base,
  };
}

/**
 * Host earnings for saved pricing. Bookings priced under this rule carry
 * serviceFeeRate/serviceFeeBase and keep them; older bookings (whose hostReceiveTotal
 * was the full subtotal) are recomputed with the current rule.
 */
export function hostEarningsForPricing(pricing: PricingLike): HostEarnings {
  const p = (pricing ?? {}) as Record<string, unknown>;
  const savedRate = hasNumber(p, 'serviceFeeRate') ? Number(p.serviceFeeRate) : undefined;
  const savedBase =
    p.serviceFeeBase === 'discounted' || p.serviceFeeBase === 'undiscounted'
      ? (p.serviceFeeBase as ServiceFeeBase)
      : undefined;
  return computeHostEarnings(p, { rate: savedRate, base: savedBase });
}

export function hostNetCentsForPricing(pricing: PricingLike): number {
  return hostEarningsForPricing(pricing).hostNetCents;
}

export function hostNetDollarsForPricing(pricing: PricingLike): number {
  return hostNetCentsForPricing(pricing) / 100;
}

/** Fields saved on booking/extension pricing so every client shows the same numbers. */
export function hostEarningsPricingFields(pricing: PricingLike, opts: HostEarningsOptions = {}) {
  const e = computeHostEarnings(pricing, opts);
  return {
    hostReceiveTotal: e.hostNetCents / 100,
    serviceFee: e.serviceFeeCents / 100,
    serviceFeeRate: e.serviceFeeRate,
    serviceFeeBase: e.serviceFeeBase,
  };
}

export type ExtensionHostPayoutPlan = {
  kind: 'extension';
  status: 'scheduled';
  amountCents: number;
  sourceChargeId: string | null;
};

/**
 * Host payout for an extension response. Approved + paid extensions produce one
 * scheduled payout; declined, unpaid or already-scheduled extensions produce none.
 */
export function planExtensionHostPayout(input: {
  approved: boolean;
  pricing: PricingLike;
  sourceChargeId: string | null;
  existingPayoutStatus?: string | null;
}): ExtensionHostPayoutPlan | null {
  if (!input.approved || input.existingPayoutStatus) return null;
  const amountCents = hostNetCentsForPricing(input.pricing);
  if (amountCents < 1) return null;
  return {
    kind: 'extension',
    status: 'scheduled',
    amountCents,
    sourceChargeId: input.sourceChargeId,
  };
}
