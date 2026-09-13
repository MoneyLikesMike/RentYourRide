import { Alert } from 'react-native';
import { isRemoteBookingId } from './bookingId';

/**
 * Navigate to the in-app chat for a booking, with guards for unsynced local trips.
 */
export function openBookingChat(navigation, bookingId) {
  if (!bookingId) {
    Alert.alert(
      'Messaging unavailable',
      'No trip is linked to this conversation yet.',
    );
    return;
  }
  if (!isRemoteBookingId(bookingId)) {
    Alert.alert(
      'Messaging unavailable',
      'This trip has not finished syncing to the server. Open Rental Manager and pull to refresh, or complete checkout again.',
    );
    return;
  }
  navigation.navigate('ChatScreen', {
    screen: 'ChatThreadScreen',
    params: { bookingId },
  });
}

export function mapMessagingError(error, bookingId) {
  if (bookingId && !isRemoteBookingId(bookingId)) {
    return 'This trip is saved on your device only and is not synced yet. Pull to refresh your trips and try again.';
  }
  if (error?.status === 404) {
    return 'Trip not found. Pull to refresh your bookings and try again.';
  }
  if (error?.status === 400) {
    return 'This trip cannot be opened for messaging yet.';
  }
  return error?.message || 'Could not load messages';
}
