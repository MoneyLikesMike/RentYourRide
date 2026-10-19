/** Config for trip auto-complete / no-show / late fees (env-overridable). */

export type LateFeeTierConfig = {
  graceMinutes: number;
  halfDayMinutes: number;
  fullDayMinutes: number;
  fullDayFlatCents: number;
};

export const DEFAULT_TRIP_AUTO_COMPLETE_HOURS = 72;
export const DEFAULT_NO_SHOW_AFTER_HOURS = 2;

export const LATE_FEE_TIERS: LateFeeTierConfig = {
  graceMinutes: 30,
  halfDayMinutes: 2 * 60,
  fullDayMinutes: 24 * 60,
  fullDayFlatCents: 2000,
};

export function loadTripCompletionEnv(env: NodeJS.ProcessEnv = process.env): {
  autoCompleteHours: number;
  noShowAfterHours: number;
  lateFeeTiers: LateFeeTierConfig;
} {
  const auto = Number(env.TRIP_AUTO_COMPLETE_HOURS);
  const noShow = Number(env.NO_SHOW_AFTER_HOURS);
  return {
    autoCompleteHours:
      Number.isFinite(auto) && auto > 0 ? auto : DEFAULT_TRIP_AUTO_COMPLETE_HOURS,
    noShowAfterHours:
      Number.isFinite(noShow) && noShow >= 0 ? noShow : DEFAULT_NO_SHOW_AFTER_HOURS,
    lateFeeTiers: LATE_FEE_TIERS,
  };
}

/** Statuses that can complete via both check-outs / auto / admin. */
export const COMPLETABLE_TRIP_STATUSES = [
  'active',
  'checkout_pending',
  'extended',
  'extension_declined',
] as const;

export type CompletableTripStatus = (typeof COMPLETABLE_TRIP_STATUSES)[number];

/** Never-started statuses eligible for auto no-show. */
export const NO_SHOW_ELIGIBLE_STATUSES = [
  'confirmed',
  'checkin_pending',
] as const;

export const TRIP_COMPLETION_ADVISORY_LOCK_KEY = 470_016_016;
