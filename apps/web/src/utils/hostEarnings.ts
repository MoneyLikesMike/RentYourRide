/** Fallback for bookings priced before the API saved serviceFee (mirrors apps/api host-earnings.ts). */
const FALLBACK_SERVICE_FEE_RATE = 0.25;

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
): { serviceFee: number; hostNet: number } {
  const p = pricing ?? {};
  if (p.serviceFeeRate != null && p.serviceFee != null && p.hostReceiveTotal != null) {
    return { serviceFee: Number(p.serviceFee), hostNet: Number(p.hostReceiveTotal) };
  }
  const tripCents = Math.max(0, cents(p.discountedTripSubtotal));
  const extrasCents = extras.reduce((acc, e) => acc + Math.max(0, cents(e.amount)), 0);
  const feeCents = Math.round(tripCents * FALLBACK_SERVICE_FEE_RATE);
  return {
    serviceFee: feeCents / 100,
    hostNet: Math.max(0, tripCents - feeCents + extrasCents) / 100,
  };
}
