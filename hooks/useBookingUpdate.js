import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useGuestBookings } from '../context/GuestBookingsContext';

/**
 * Await updateGuestBooking and surface API failures before navigation.
 */
export function useBookingUpdate() {
  const { updateGuestBooking } = useGuestBookings();

  const applyBookingUpdate = useCallback(
    async (bookingId, patch, options = {}) => {
      if (!bookingId) return false;
      const { errorTitle = 'Could not save', onSuccess } = options;
      try {
        await updateGuestBooking(bookingId, patch);
        onSuccess?.();
        return true;
      } catch (e) {
        Alert.alert(errorTitle, e?.message || 'Try again later.');
        return false;
      }
    },
    [updateGuestBooking],
  );

  return { applyBookingUpdate, updateGuestBooking };
}
