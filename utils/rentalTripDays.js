const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Billable trip length in whole days.
 *
 * A trip day is 24 hours. Charge full days only (Turo / traditional rental style):
 * - ≤ 24 hours → 1 day
 * - > 24 up to 48 → 2 days
 * - and so on (ceil of elapsed 24-hour periods, minimum 1)
 *
 * Examples: 18h → 1; 22h → 1; 36h → 2
 */
export function getTripBillingDays(start, end) {
  if (start == null || end == null) return 0;
  const a = start instanceof Date ? start : new Date(start);
  const b = end instanceof Date ? end : new Date(end);
  const startMs = a.getTime();
  const endMs = b.getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  const ms = Math.abs(endMs - startMs);
  return Math.max(1, Math.ceil(ms / MS_PER_DAY));
}
