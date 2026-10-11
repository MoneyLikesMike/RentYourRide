/** Fallback for bookings priced before the API saved hostFee (mirrors apps/api host-earnings.ts). */
const FALLBACK_HOST_FEE_RATE = 0.25;

type Pricing = Record<string, unknown> | null | undefined;
type Extra = { amount?: unknown };

function cents(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/**
 * Host service fee and net earnings for a booking. Uses the values the API
 * saved on pricing when present so every surface shows the same numbers.
 */
export function getHostEarnings(
  pricing: Pricing,
  extras: Extra[] = [],
): { hostFee: number; hostNet: number } {
  const p = pricing ?? {};
  if (p.hostFeeRate != null && p.hostFee != null && p.hostReceiveTotal != null) {
    return { hostFee: Number(p.hostFee), hostNet: Number(p.hostReceiveTotal) };
  }
  const tripCents = Math.max(0, cents(p.discountedTripSubtotal));
  const extrasCents = extras.reduce((acc, e) => acc + Math.max(0, cents(e.amount)), 0);
  const feeCents = Math.round(tripCents * FALLBACK_HOST_FEE_RATE);
  return {
    hostFee: feeCents / 100,
    hostNet: Math.max(0, tripCents - feeCents + extrasCents) / 100,
  };
}
