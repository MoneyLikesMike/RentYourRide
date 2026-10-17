/**
 * Pure cancellation / refund policy.
 *
 * Policy sources disagree (Terms §9.2 vs Cancellation Policy page). Presets are
 * selected via CANCELLATION_POLICY_PRESET until Michael confirms the default.
 *
 * TODO(Michael): confirm default preset (TERMS_9 vs CANCELLATION_POLICY_PAGE)
 * and set HOST_CANCELLATION_FEE_CENTS when Terms §9.3/9.4 fee amount is decided.
 */

import { getTripBillingDays } from './trip-billing-days';
import { hostNetCentsForPricing } from './host-earnings';

export type CancellationPreset = 'TERMS_9' | 'CANCELLATION_POLICY_PAGE';
export type CancelledBy = 'guest' | 'host' | 'admin';

export type CancellationPolicyConfig = {
  preset: CancellationPreset;
  /** Free full refund if start - now >= this many ms (TERMS_9). */
  termsFullRefundMsBeforeStart: number;
  /** Free full refund if start - now > this many ms (policy page). */
  pageFreeCancelMsBeforeStart: number;
  /** Same-day grace: booked within this window AND trip starts within free window. */
  pageSameDayGraceMsAfterBook: number;
  /** Host cancellation fee in cents. Default 0 — do not invent a fee. */
  hostCancellationFeeCents: number;
  /**
   * When true, attempt to collect hostCancellationFeeCents (future payout /
   * reversal). Default false — fee is recorded only.
   */
  chargeHostCancellationFee: boolean;
};

export type CancellationOutcome = {
  guestRefundCents: number;
  /** Amount the host keeps (of the original guest charge). */
  hostShareCents: number;
  /** Amount RYR retains (fees / cancellation charges not returned to guest or host). */
  rryRetainedCents: number;
  hostCancellationFeeCents: number;
  reason: string;
  /** True when cancel after trip start needs an admin path. */
  requiresAdmin: boolean;
  chargeHostCancellationFee: boolean;
};

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export const DEFAULT_CANCELLATION_POLICY_CONFIG: CancellationPolicyConfig = {
  // TODO(Michael): confirm default preset.
  preset: 'CANCELLATION_POLICY_PAGE',
  termsFullRefundMsBeforeStart: 5 * MS_PER_DAY,
  pageFreeCancelMsBeforeStart: 24 * MS_PER_HOUR,
  pageSameDayGraceMsAfterBook: 1 * MS_PER_HOUR,
  hostCancellationFeeCents: 0,
  chargeHostCancellationFee: false,
};

export function loadCancellationPolicyConfig(
  env: NodeJS.ProcessEnv = process.env,
): CancellationPolicyConfig {
  const presetRaw = (env.CANCELLATION_POLICY_PRESET || '').trim().toUpperCase();
  const preset: CancellationPreset =
    presetRaw === 'TERMS_9' ? 'TERMS_9' : 'CANCELLATION_POLICY_PAGE';
  const fee = Number(env.HOST_CANCELLATION_FEE_CENTS);
  const chargeFee =
    env.CHARGE_HOST_CANCELLATION_FEE === '1' ||
    env.CHARGE_HOST_CANCELLATION_FEE === 'true';
  return {
    ...DEFAULT_CANCELLATION_POLICY_CONFIG,
    preset,
    hostCancellationFeeCents:
      Number.isFinite(fee) && fee > 0 ? Math.round(fee) : 0,
    chargeHostCancellationFee: chargeFee,
  };
}

function dollarsToCents(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export type PricingForCancel = Record<string, unknown> | null | undefined;

export function pricingCentsFromBooking(pricing: PricingForCancel): {
  grandTotalCents: number;
  tripCostCents: number;
  tripFeeCents: number;
  deliveryFeeCents: number;
  hostNetCents: number;
  tripDays: number;
  oneDayTripCostCents: number;
} {
  const p = (pricing ?? {}) as Record<string, unknown>;
  const grandTotalCents = Math.max(0, dollarsToCents(p.grandTotal));
  const tripCostCents = Math.max(0, dollarsToCents(p.discountedTripSubtotal));
  const tripFeeCents = Math.max(0, dollarsToCents(p.tripFee));
  const deliveryFeeCents = Math.max(0, dollarsToCents(p.selectedDeliveryFee));
  const hostNetCents = Math.max(0, hostNetCentsForPricing(p));
  const tripDays = Math.max(1, Math.round(Number(p.tripDays)) || 1);
  const oneDayTripCostCents =
    tripDays > 0 ? Math.round(tripCostCents / tripDays) : tripCostCents;
  return {
    grandTotalCents,
    tripCostCents,
    tripFeeCents,
    deliveryFeeCents,
    hostNetCents,
    tripDays,
    oneDayTripCostCents,
  };
}

function clampRefund(refund: number, total: number): number {
  if (!Number.isFinite(refund) || refund < 0) return 0;
  if (refund > total) return total;
  return Math.round(refund);
}

function fullRefundOutcome(
  cents: ReturnType<typeof pricingCentsFromBooking>,
  reason: string,
  hostFee = 0,
  chargeFee = false,
): CancellationOutcome {
  return {
    guestRefundCents: cents.grandTotalCents,
    hostShareCents: 0,
    rryRetainedCents: 0,
    hostCancellationFeeCents: hostFee,
    reason,
    requiresAdmin: false,
    chargeHostCancellationFee: chargeFee && hostFee > 0,
  };
}

function guestFeeOutcome(
  cents: ReturnType<typeof pricingCentsFromBooking>,
  guestKeepsPayingCents: number,
  reason: string,
): CancellationOutcome {
  const fee = Math.min(
    cents.grandTotalCents,
    Math.max(0, Math.round(guestKeepsPayingCents)),
  );
  const guestRefundCents = clampRefund(cents.grandTotalCents - fee, cents.grandTotalCents);
  // Host keeps nothing on a pre-payout cancel with a guest fee — RYR retains the fee.
  // (After payout, clawback uses hostShare of the refunded amount separately.)
  const hostShareCents = 0;
  const rryRetainedCents = Math.max(
    0,
    cents.grandTotalCents - guestRefundCents - hostShareCents,
  );
  return {
    guestRefundCents,
    hostShareCents,
    rryRetainedCents,
    hostCancellationFeeCents: 0,
    reason,
    requiresAdmin: false,
    chargeHostCancellationFee: false,
  };
}

/**
 * Compute refund split for a cancel attempt.
 * `startMs` / `endMs` / `now` / `bookedAtMs` are epoch ms (listing-local trip instants).
 */
export function computeCancellationOutcome(input: {
  pricing: PricingForCancel;
  startMs: number;
  endMs: number;
  now: number;
  cancelledBy: CancelledBy;
  bookedAtMs?: number | null;
  config?: CancellationPolicyConfig;
  /** Booking lifecycle status — trip-started statuses need admin for guest/host. */
  status?: string | null;
}): CancellationOutcome {
  const config = input.config ?? DEFAULT_CANCELLATION_POLICY_CONFIG;
  const cents = pricingCentsFromBooking(input.pricing);
  const tripDays = Math.max(
    1,
    getTripBillingDays(input.startMs, input.endMs) || cents.tripDays,
  );
  const msUntilStart = input.startMs - input.now;
  const tripStarted = input.now >= input.startMs;
  const startedStatuses = new Set([
    'active',
    'extended',
    'extension_pending',
    'extension_declined',
    'checkout_pending',
  ]);
  const statusStarted =
    typeof input.status === 'string' && startedStatuses.has(input.status);

  if (tripStarted || statusStarted) {
    if (input.cancelledBy === 'admin') {
      // Admin discretion — default to full guest refund; host share 0 until clawback.
      return {
        ...fullRefundOutcome(cents, 'admin_cancel_after_start'),
        requiresAdmin: false,
      };
    }
    return {
      guestRefundCents: 0,
      hostShareCents: cents.hostNetCents,
      rryRetainedCents: Math.max(0, cents.grandTotalCents - cents.hostNetCents),
      hostCancellationFeeCents: 0,
      reason: 'trip_started_requires_admin',
      requiresAdmin: true,
      chargeHostCancellationFee: false,
    };
  }

  // Host cancel → full refund to guest (Terms §9.4). Fee recorded when outside free window.
  if (input.cancelledBy === 'host') {
    const outsideFreeWindow =
      config.preset === 'TERMS_9'
        ? msUntilStart < config.termsFullRefundMsBeforeStart
        : msUntilStart <= config.pageFreeCancelMsBeforeStart;
    const fee = outsideFreeWindow ? config.hostCancellationFeeCents : 0;
    return fullRefundOutcome(
      cents,
      outsideFreeWindow
        ? 'host_cancel_outside_window_full_guest_refund'
        : 'host_cancel_inside_window_full_guest_refund',
      fee,
      config.chargeHostCancellationFee,
    );
  }

  // Admin pre-start: full refund.
  if (input.cancelledBy === 'admin') {
    return fullRefundOutcome(cents, 'admin_cancel_full_refund');
  }

  // Guest cancel
  if (config.preset === 'TERMS_9') {
    if (msUntilStart >= config.termsFullRefundMsBeforeStart) {
      return fullRefundOutcome(cents, 'terms9_guest_full_refund');
    }
    // Outside Cancellation Period — host amounts are remitted; guest refund 0.
    return {
      guestRefundCents: 0,
      hostShareCents: cents.hostNetCents,
      rryRetainedCents: Math.max(0, cents.grandTotalCents - cents.hostNetCents),
      hostCancellationFeeCents: 0,
      reason: 'terms9_guest_outside_window_no_refund',
      requiresAdmin: false,
      chargeHostCancellationFee: false,
    };
  }

  // CANCELLATION_POLICY_PAGE
  const bookedAt = Number(input.bookedAtMs);
  const withinSameDayGrace =
    Number.isFinite(bookedAt) &&
    input.now - bookedAt <= config.pageSameDayGraceMsAfterBook &&
    msUntilStart <= config.pageFreeCancelMsBeforeStart &&
    msUntilStart > 0;

  if (msUntilStart > config.pageFreeCancelMsBeforeStart || withinSameDayGrace) {
    return fullRefundOutcome(
      cents,
      withinSameDayGrace
        ? 'policy_page_same_day_grace_full_refund'
        : 'policy_page_free_cancel_full_refund',
    );
  }

  // Cancellation fee window
  const oneDayTripFeeShare = Math.round(cents.tripFeeCents / tripDays);
  let guestFeeCents: number;
  if (tripDays >= 2) {
    // One day’s trip cost including the (pro-rated) trip fee.
    guestFeeCents = cents.oneDayTripCostCents + oneDayTripFeeShare;
  } else {
    // ≤1 day: 50% of trip cost + trip fee.
    guestFeeCents = Math.round((cents.tripCostCents + cents.tripFeeCents) * 0.5);
  }
  // Delivery: 50% refunded → guest keeps paying 50% of delivery.
  const deliveryKeptCents = Math.round(cents.deliveryFeeCents * 0.5);
  guestFeeCents += deliveryKeptCents;

  return guestFeeOutcome(
    cents,
    guestFeeCents,
    tripDays >= 2
      ? 'policy_page_guest_fee_multi_day'
      : 'policy_page_guest_fee_one_day',
  );
}

/**
 * Host share of a *delta* refunded amount (for transfer reversal).
 * Pass the newly refunded cents (not a cumulative total). Caps at remaining
 * transfer balance via alreadyReversedCents.
 */
export function hostClawbackCents(opts: {
  refundAmountCents: number;
  guestPayCents: number;
  hostNetCents: number;
  alreadyReversedCents?: number;
  transferAmountCents?: number;
}): number {
  const refund = Math.max(0, Math.round(opts.refundAmountCents));
  const pay = Math.max(0, Math.round(opts.guestPayCents));
  const hostNet = Math.max(0, Math.round(opts.hostNetCents));
  const already = Math.max(0, Math.round(opts.alreadyReversedCents ?? 0));
  if (refund <= 0 || pay <= 0 || hostNet <= 0) return 0;
  const proportional = Math.round((refund * hostNet) / pay);
  const transferCap = Math.max(
    0,
    Math.round(opts.transferAmountCents ?? hostNet) - already,
  );
  return Math.min(proportional, transferCap, refund);
}
