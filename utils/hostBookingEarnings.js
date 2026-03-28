/** 25% of trip rental rate (after discount), not applied to extras. */
export function computeHostServiceFee(discountedTripSubtotal) {
  return Math.max(0, Number(discountedTripSubtotal) * 0.25);
}

/**
 * Net amount the host receives after the platform service fee: discounted trip subtotal minus fee plus extras.
 * Matches Host booking details breakdown.
 */
export function getHostNetEarnings(booking) {
  const p = booking?.pricing || {};
  const discountedTripSubtotal = Number(p.discountedTripSubtotal ?? 0);
  const extras = Array.isArray(booking?.extras) ? booking.extras : [];
  const extrasSum = extras.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const serviceFeeHost = computeHostServiceFee(discountedTripSubtotal);
  return Math.max(0, discountedTripSubtotal - serviceFeeHost + extrasSum);
}
