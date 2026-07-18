/**
 * Trip is fully checked out when both guest and host have completed their checkout flows,
 * or the booking is already marked completed on the server.
 */
export function isTripFullyCheckedOut(booking) {
  if (booking?.status === 'completed') return true;
  return booking?.guestCheckedOutAt != null && booking?.hostCheckoutTripEndedAt != null;
}

/** Has this party finished their own checkout / end-trip flow? */
export function hasPartyCheckedOut(booking, isHost) {
  if (booking?.status === 'completed') return true;
  if (isHost) return booking?.hostCheckoutTripEndedAt != null;
  return booking?.guestCheckedOutAt != null;
}

/** Active rentals for a given perspective — hide trips this party already checked out of. */
export function filterActiveForPerspective(bookings, isHost) {
  return (bookings || []).filter((b) => !hasPartyCheckedOut(b, isHost));
}

/** History for a given perspective — completed server trips + this party's checkout-done trips. */
export function isHistoryForPerspective(booking, isHost) {
  if (!booking) return false;
  if (booking.status === 'completed') return true;
  return hasPartyCheckedOut(booking, isHost);
}
