/** Build a listing object for VehicleDetailScreen from a booking row. */
export function listingFromBookingSnapshot(booking) {
  if (!booking) return null;
  const ls = booking.listingSnapshot || {};
  const id = booking.listingId ?? ls.id;
  if ((id == null || id === '') && !ls.title) return null;
  return {
    ...ls,
    id,
    title: ls.title || 'Vehicle',
    pricePerDay: ls.pricePerDay ?? booking.pricing?.pricePerDay,
    pickupAddress: ls.pickupAddress ?? booking.pickupAddress,
  };
}
