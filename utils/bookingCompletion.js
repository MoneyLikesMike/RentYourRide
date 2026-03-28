/**
 * Trip is fully checked out when both guest and host have completed their checkout flows.
 */
export function isTripFullyCheckedOut(booking) {
  return booking?.guestCheckedOutAt != null && booking?.hostCheckoutTripEndedAt != null;
}
