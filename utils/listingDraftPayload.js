/** Map list-ride draft fields to host create/patch body for the API. */
export function draftToListingBody(draft) {
  const extras = {
    ...(draft.extras && typeof draft.extras === 'object' ? draft.extras : {}),
  };
  if (draft.extrasFuelOn != null) extras.fuel = { enabled: !!draft.extrasFuelOn, price: draft.extrasFuelPrice };
  if (draft.extrasCleaningOn != null) {
    extras.cleaning = { enabled: !!draft.extrasCleaningOn, price: draft.extrasCleaningPrice };
  }
  if (draft.extrasUnlimitedKmOn != null) {
    extras.unlimitedKm = { enabled: !!draft.extrasUnlimitedKmOn, price: draft.extrasUnlimitedKmPrice };
  }
  if (draft.advanceNotice || draft.shortestTrip || draft.longestTrip) {
    extras.advanceNotice = draft.advanceNotice || '';
    extras.shortestTrip = draft.shortestTrip || '';
    extras.longestTrip = draft.longestTrip || '';
  }
  if (draft.checkInInstructions) extras.checkInInstructions = draft.checkInInstructions;
  if (draft.checkOutInstructions) extras.checkOutInstructions = draft.checkOutInstructions;
  if (draft.kmOverageFee != null) extras.kmOverageFee = draft.kmOverageFee;

  const body = {
    city: draft.city || 'Winnipeg',
    title: draft.title || 'My vehicle',
    description: draft.description ?? '',
    vehicleType: draft.vehicleType || 'SEDAN',
    photos: draft.photos ?? [],
    pricePerDay: draft.pricePerDay != null && draft.pricePerDay !== '' ? Number(draft.pricePerDay) : 40,
    weeklyDiscount: draft.weeklyDiscount ?? null,
    monthlyDiscount: draft.monthlyDiscount ?? null,
    deliveryPrice:
      draft.deliveryPrice != null && draft.deliveryPrice !== '' ? Number(draft.deliveryPrice) : null,
    dailyKm: draft.dailyKm ?? null,
    instantBooking: draft.instantBooking === true || draft.advanceNotice === 'Instant booking',
    latitude: draft.latitude ?? null,
    longitude: draft.longitude ?? null,
    pickupAddress: draft.pickupAddress || `${draft.city || 'Winnipeg'}, MB`,
    vin: draft.vin?.trim() ? draft.vin.trim() : null,
    carFeatures: draft.carFeatures ?? [],
    extras,
    licensePlate: draft.licensePlate ?? null,
    licenseProvince: draft.licenseProvince ?? null,
    vehicleData: draft.vehicleData ?? null,
    published: false,
  };
  if (Array.isArray(draft.availability) && draft.availability.length > 0) {
    body.availability = draft.availability;
  }
  return body;
}
