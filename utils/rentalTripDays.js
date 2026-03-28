const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Inclusive calendar days from pickup through return (local dates).
 * Matches typical car-rental billing: same calendar day = 1 day; Mon–Sun = 7 days.
 */
export function getTripBillingDays(start, end) {
  if (start == null || end == null) return 0;
  const a = start instanceof Date ? start : new Date(start);
  const b = end instanceof Date ? end : new Date(end);
  const t1 = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const t2 = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  const daySpan = Math.abs(t2 - t1) / MS_PER_DAY;
  return Math.max(1, Math.floor(daySpan) + 1);
}
