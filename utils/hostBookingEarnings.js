/** Fallback for bookings priced before the API saved serviceFee (mirrors apps/api host-earnings.ts). */
const FALLBACK_SERVICE_FEE_RATE = 0.25;

function cents(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/**
 * Host service fee and net earnings. Uses the values the API saved on pricing
 * when present (same numbers as web, emails, admin and the payout); otherwise
 * 25% of the discounted trip subtotal, not applied to extras or delivery.
 */
export function getHostEarningsBreakdown(booking) {
  const p = booking?.pricing || {};
  if (p.serviceFeeRate != null && p.serviceFee != null && p.hostReceiveTotal != null) {
    return { serviceFee: Number(p.serviceFee), net: Number(p.hostReceiveTotal) };
  }
  const tripCents = Math.max(0, cents(p.discountedTripSubtotal));
  const extras = Array.isArray(booking?.extras) ? booking.extras : [];
  const extrasCents = extras.reduce((acc, e) => acc + Math.max(0, cents(e?.amount)), 0);
  const feeCents = Math.round(tripCents * FALLBACK_SERVICE_FEE_RATE);
  return {
    serviceFee: feeCents / 100,
    net: Math.max(0, tripCents - feeCents + extrasCents) / 100,
  };
}

export function getHostServiceFee(booking) {
  return getHostEarningsBreakdown(booking).serviceFee;
}

export function getHostNetEarnings(booking) {
  return getHostEarningsBreakdown(booking).net;
}
