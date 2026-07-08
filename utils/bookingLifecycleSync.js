import * as bookingsApi from '../services/bookingsApi';
import { isRemoteBookingId } from './bookingId';

/** Skip API errors when the booking has already advanced to the next status. */
async function swallowInvalidTransition(fn) {
  try {
    return await fn();
  } catch (e) {
    const msg = (e?.message || '').toLowerCase();
    if (msg.includes('invalid') && (msg.includes('transition') || msg.includes('status'))) {
      return null;
    }
    throw e;
  }
}

/**
 * Map a local booking patch to Nest lifecycle endpoints (remote bookings only).
 */
export async function syncBookingPatchToApi(id, patch, { isAuthenticated, isReady, refreshFromApi }) {
  if (!isRemoteBookingId(id) || !isAuthenticated || !isReady) return;

  if (patch.guestCheckoutStartedAt || patch.hostCheckoutStartedAt) {
    await swallowInvalidTransition(() => bookingsApi.checkoutStart(id));
  }

  if (
    (patch.guestCheckedInAt && !patch.guestTripStartedAt) ||
    (patch.hostCheckedInAt && !patch.hostTripStartedAt)
  ) {
    await swallowInvalidTransition(() => bookingsApi.checkinStart(id));
  }

  const photoUris =
    patch.checkInConditionPhotos ||
    patch.guestCheckoutConditionPhotos ||
    patch.hostCheckInConditionPhotos ||
    patch.hostCheckoutConditionPhotos;
  if (Array.isArray(photoUris) && photoUris.length > 0) {
    const phase =
      patch.guestCheckoutConditionPhotos || patch.hostCheckoutConditionPhotos ? 'post' : 'pre';
    const uris = photoUris.map((p) => (typeof p === 'string' ? p : p?.uri)).filter(Boolean);
    if (uris.length) await bookingsApi.addConditionPhotos(id, { phase, uris });
  }

  if (patch.guestCheckoutRentalAgreementSignedAt || patch.hostCheckoutRentalAgreementSignedAt) {
    await swallowInvalidTransition(() => bookingsApi.checkoutStart(id));
  }

  if (patch.rentalAgreementSignedAt || patch.guestCheckoutRentalAgreementSignedAt) {
    await bookingsApi.signAgreement(id, {
      role: 'guest',
      signature:
        patch.rentalAgreementSignerName ||
        patch.guestCheckoutRentalAgreementSignerName ||
        '',
    });
  }
  if (patch.hostRentalAgreementSignedAt || patch.hostCheckoutRentalAgreementSignedAt) {
    await bookingsApi.signAgreement(id, {
      role: 'host',
      signature:
        patch.hostRentalAgreementSignerName ||
        patch.hostCheckoutRentalAgreementSignerName ||
        '',
    });
  }

  if (patch.guestTripStartedAt || patch.hostTripStartedAt) {
    await swallowInvalidTransition(() => bookingsApi.tripStart(id));
  }

  if (patch.guestCheckedOutAt || patch.hostCheckoutTripEndedAt || patch.status === 'completed') {
    await swallowInvalidTransition(() => bookingsApi.completeBooking(id));
  }

  if (typeof patch.rating === 'number' && patch.reviewRole) {
    await bookingsApi.submitReview(id, {
      rating: patch.rating,
      text: patch.reviewText || '',
      role: patch.reviewRole,
    });
  }

  await refreshFromApi();
}
