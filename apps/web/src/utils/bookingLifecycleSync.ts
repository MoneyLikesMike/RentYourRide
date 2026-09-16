import {
  checkinStart,
  checkoutStart,
  completeBooking,
  getBooking,
  patchBookingLifecycle,
  signAgreement,
  tripStart,
  type BookingDto,
} from '../api/bookings';
import { isTripFullyCheckedOut } from './trips';

async function swallowInvalidTransition<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
    if (
      msg.includes('invalid') &&
      (msg.includes('transition') || msg.includes('status'))
    ) {
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
  'hostRentalAgreementSignedAt',
  'hostRentalAgreementSignerName',
  'hostRentalAgreementCompletedAt',
  'guestCheckoutRentalAgreementSignedAt',
  'guestCheckoutRentalAgreementSignerName',
  'hostCheckoutRentalAgreementSignedAt',
  'hostCheckoutRentalAgreementSignerName',
]);

/**
 * Map a booking patch to Nest lifecycle endpoints (mobile bookingLifecycleSync).
 */
export async function syncBookingPatchToApi(
  id: string,
  patch: Record<string, unknown>,
): Promise<BookingDto | null> {
  let latest: BookingDto | null = null;
  const lifecyclePatch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch || {})) {
    if (LIFECYCLE_KEYS.has(key) && value !== undefined) {
      lifecyclePatch[key] = value;
    }
  }
  if (Object.keys(lifecyclePatch).length > 0) {
    latest = await patchBookingLifecycle(id, lifecyclePatch);
  }

  if (patch.guestCheckoutStartedAt || patch.hostCheckoutStartedAt) {
    await swallowInvalidTransition(() => checkoutStart(id));
  }

  if (
    (patch.guestCheckedInAt && !patch.guestTripStartedAt) ||
    (patch.hostCheckedInAt && !patch.hostTripStartedAt)
  ) {
    await swallowInvalidTransition(() => checkinStart(id));
  }

  if (
    patch.guestCheckoutRentalAgreementSignedAt ||
    patch.hostCheckoutRentalAgreementSignedAt
  ) {
    await swallowInvalidTransition(() => checkoutStart(id));
  }

  if (
    patch.rentalAgreementSignedAt ||
    patch.guestCheckoutRentalAgreementSignedAt
  ) {
    await signAgreement(id, {
      role: 'guest',
      signature: String(
        patch.rentalAgreementSignerName ||
          patch.guestCheckoutRentalAgreementSignerName ||
          '',
      ),
    });
  }
  if (
    patch.hostRentalAgreementSignedAt ||
    patch.hostCheckoutRentalAgreementSignedAt
  ) {
    await signAgreement(id, {
      role: 'host',
      signature: String(
        patch.hostRentalAgreementSignerName ||
          patch.hostCheckoutRentalAgreementSignerName ||
          '',
      ),
    });
  }

  if (patch.guestTripStartedAt || patch.hostTripStartedAt) {
    await swallowInvalidTransition(() => tripStart(id));
  }

  if (
    patch.guestCheckedOutAt ||
    patch.hostCheckoutTripEndedAt ||
    patch.status === 'completed'
  ) {
    await swallowInvalidTransition(() => checkoutStart(id));
    if (!latest) {
      try {
        latest = await getBooking(id);
      } catch {
        latest = null;
      }
    }
    const merged = {
      ...(latest || {}),
      ...lifecyclePatch,
      ...patch,
    } as BookingDto;
    if (patch.status === 'completed' || isTripFullyCheckedOut(merged)) {
      await swallowInvalidTransition(() => completeBooking(id));
    }
  }

  try {
    return await getBooking(id);
  } catch {
    return latest;
  }
}
