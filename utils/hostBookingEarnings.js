/** Fallback for bookings priced before the API saved hostFee (mirrors apps/api host-earnings.ts). */
const FALLBACK_HOST_FEE_RATE = 0.25;

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
  if (p.hostFeeRate != null && p.hostFee != null && p.hostReceiveTotal != null) {
    return { serviceFeeHost: Number(p.hostFee), net: Number(p.hostReceiveTotal) };
  }
  const tripCents = Math.max(0, cents(p.discountedTripSubtotal));
  const extras = Array.isArray(booking?.extras) ? booking.extras : [];
  const extrasCents = extras.reduce((acc, e) => acc + Math.max(0, cents(e?.amount)), 0);
  const feeCents = Math.round(tripCents * FALLBACK_HOST_FEE_RATE);
  return {
    serviceFeeHost: feeCents / 100,
    net: Math.max(0, tripCents - feeCents + extrasCents) / 100,
  };
}

export function getHostServiceFee(booking) {
  return getHostEarningsBreakdown(booking).serviceFeeHost;
}

export function getHostNetEarnings(booking) {
  return getHostEarningsBreakdown(booking).net;
}
