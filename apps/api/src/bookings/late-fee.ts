import { LATE_FEE_TIERS, type LateFeeTierConfig } from './trip-completion.config';

export type LateFeeResult =
  | {
      discretionary: false;
      feeCents: number;
      daysCharged: number;
      flatCents: number;
      lateMinutes: number;
    }
  | {
      discretionary: true;
      feeCents: null;
      daysCharged: null;
      flatCents: null;
      lateMinutes: number;
    };

/**
 * Pure late-return fee from scheduled end → guest check-out.
 * Charging is RYRA-476 — this only computes.
 */
export function computeLateFee(
  scheduledEndMs: number,
  guestCheckoutAtMs: number,
  dailyRateCents: number,
  tiers: LateFeeTierConfig = LATE_FEE_TIERS,
): LateFeeResult {
  const lateMs = Math.max(0, guestCheckoutAtMs - scheduledEndMs);
  const lateMinutes = lateMs / (60 * 1000);
  const rate = Math.max(0, Math.round(dailyRateCents));

  if (lateMinutes <= tiers.graceMinutes) {
    return {
      discretionary: false,
      feeCents: 0,
      daysCharged: 0,
      flatCents: 0,
      lateMinutes,
    };
  }
  if (lateMinutes <= tiers.halfDayMinutes) {
    const daysCharged = 0.5;
    return {
      discretionary: false,
      feeCents: Math.round(rate * daysCharged),
      daysCharged,
      flatCents: 0,
      lateMinutes,
    };
  }
  if (lateMinutes <= tiers.fullDayMinutes) {
    const daysCharged = 1;
    const flatCents = tiers.fullDayFlatCents;
    return {
      discretionary: false,
      feeCents: Math.round(rate * daysCharged) + flatCents,
      daysCharged,
      flatCents,
      lateMinutes,
    };
  }
  return {
    discretionary: true,
    feeCents: null,
    daysCharged: null,
    flatCents: null,
    lateMinutes,
  };
}

export function dailyRateCentsFromPricing(
  pricing: Record<string, unknown> | null | undefined,
): number {
  const p = pricing || {};
  const tripDays = Number(p.tripDays) || 0;
  const discounted = Number(p.discountedTripSubtotal ?? p.baseTripSubtotal ?? 0) || 0;
  if (tripDays > 0 && discounted > 0) {
    return Math.round((discounted / tripDays) * 100);
  }
  const pricePerDay = Number(p.pricePerDay) || 0;
  return Math.round(pricePerDay * 100);
}
