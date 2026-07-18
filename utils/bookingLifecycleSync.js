import * as bookingsApi from '../services/bookingsApi';
import { isRemoteBookingId } from './bookingId';
import { isTripFullyCheckedOut } from './bookingCompletion';

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

const LIFECYCLE_KEYS = new Set([
  'guestCheckedInAt',
  'hostCheckedInAt',
  'guestTripStartedAt',
  'hostTripStartedAt',
  'guestCheckoutStartedAt',
  'hostCheckoutStartedAt',
  'guestCheckedOutAt',
  'hostCheckoutTripEndedAt',
  'rentalAgreementSignedAt',
  'rentalAgreementSignerName',
  'rentalAgreementCompletedAt',
  'rentalAgreementDamageNotes',
  'guestCheckInDamageNotes',
  'hostRentalAgreementSignedAt',
  'hostRentalAgreementSignerName',
  'hostRentalAgreementCompletedAt',
  'hostRentalAgreementDamageNotes',
  'hostCheckInDamageNotes',
  'guestCheckoutRentalAgreementSignedAt',
  'guestCheckoutRentalAgreementSignerName',
  'guestCheckoutDamageNotes',
  'hostCheckoutRentalAgreementSignedAt',
  'hostCheckoutRentalAgreementSignerName',
  'hostCheckoutDamageNotes',
  'checkInConditionPhotos',
  'guestCheckoutConditionPhotos',
  'hostCheckInConditionPhotos',
  'hostCheckoutConditionPhotos',
]);

/**
 * Map a local booking patch to Nest lifecycle endpoints (remote bookings only).
 */
export async function syncBookingPatchToApi(id, patch, { isAuthenticated, isReady, refreshFromApi }) {
  if (!isRemoteBookingId(id) || !isAuthenticated || !isReady) return;

  // Persist check-in/out timestamps and notes so they survive refreshFromApi.
  let latest = null;
  const lifecyclePatch = {};
  for (const [key, value] of Object.entries(patch || {})) {
    if (LIFECYCLE_KEYS.has(key) && value !== undefined) {
      lifecyclePatch[key] = value;
    }
  }
  if (Object.keys(lifecyclePatch).length > 0) {
    latest = await bookingsApi.patchBookingLifecycle(id, lifecyclePatch);
  }

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

  // Only mark the booking fully completed when BOTH parties have checked out
  // (or an explicit completed status is requested).
  if (patch.guestCheckedOutAt || patch.hostCheckoutTripEndedAt || patch.status === 'completed') {
    await swallowInvalidTransition(() => bookingsApi.checkoutStart(id));
    if (!latest) {
      try {
        latest = await bookingsApi.getBooking(id);
      } catch (_) {
        latest = null;
      }
    }
    const merged = { ...(latest || {}), ...lifecyclePatch, ...patch };
    if (patch.status === 'completed' || isTripFullyCheckedOut(merged)) {
      await swallowInvalidTransition(() => bookingsApi.completeBooking(id));
    }
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
