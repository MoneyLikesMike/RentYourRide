/**
 * Screens that should live on every tab (and List Ride) stack so opening a
 * nested flow pushes locally — Back returns to the caller instead of jumping tabs.
 *
 * Use getComponent() so heavy native deps (Didit, expo-blur, image picker) are
 * not evaluated on cold start — a top-level import here crashes TestFlight if a
 * native module is missing or mis-linked.
 */
import React from 'react';

/** Route names used by CustomTabBar to hide the tab bar. */
export const SHARED_BROWSE_ROUTE_NAMES = [
  'UserProfileScreen',
  'EditProfileScreen',
  'VehicleDetailScreen',
  'ListingPhotoGalleryScreen',
  'CalendarScreen',
  'BookingCheckoutScreen',
  'BookingRequestConfirmationScreen',
  'AddCardScreen',
  'AddPayPalScreen',
  'AddPaymentMethodScreen',
  'VerificationStepsScreen',
  'AddPhoneNumberScreen',
  'PhoneVerificationScreen',
  'ChangePhoneNumberScreen',
  'LicenseVerificationScreen',
  'LicenseVerificationPendingScreen',
  'ChatThreadScreen',
];

/**
 * Must be invoked as a function inside Navigator children (not as JSX).
 * React Navigation only allows Screen / Group / Fragment as direct children —
 * a custom component wrapper is rejected even if it returns those.
 *
 * @param {{
 *   Stack: { Screen: React.ComponentType<any> },
 *   includeBookingFlow?: boolean,
 *   includePaymentAdd?: boolean,
 *   includeAccountExtras?: boolean,
 *   includeChatThread?: boolean,
 * }} props
 */
export function SharedBrowseScreens({
  Stack,
  includeBookingFlow = true,
  includePaymentAdd = true,
  includeAccountExtras = true,
  includeChatThread = false,
}) {
  return (
    <>
      <Stack.Screen
        name="UserProfileScreen"
        getComponent={() => require('../screens/UserProfileScreen').default}
      />
      <Stack.Screen
        name="VehicleDetailScreen"
        getComponent={() => require('../screens/VehicleDetailScreen').default}
      />
      <Stack.Screen
        name="ListingPhotoGalleryScreen"
        getComponent={() => require('../screens/ListingPhotoGalleryScreen').default}
        options={{ presentation: 'fullScreenModal', animation: 'fade' }}
      />
      {includeBookingFlow ? (
        <>
          <Stack.Screen
            name="CalendarScreen"
            getComponent={() => require('../screens/CalendarScreen').default}
          />
          <Stack.Screen
            name="BookingCheckoutScreen"
            getComponent={() => require('../screens/BookingCheckoutScreen').default}
          />
          <Stack.Screen
            name="BookingRequestConfirmationScreen"
            getComponent={() => require('../screens/BookingRequestConfirmationScreen').default}
          />
        </>
      ) : null}
      {includePaymentAdd ? (
        <>
          <Stack.Screen
            name="AddPaymentMethodScreen"
            getComponent={() => require('../screens/AddPaymentMethodScreen').default}
          />
          <Stack.Screen
            name="AddCardScreen"
            getComponent={() => require('../screens/AddCardScreen').default}
          />
          <Stack.Screen
            name="AddPayPalScreen"
            getComponent={() => require('../screens/AddPayPalScreen').default}
          />
        </>
      ) : null}
      {includeAccountExtras ? (
        <>
          <Stack.Screen
            name="EditProfileScreen"
            getComponent={() => require('../screens/EditProfileScreen').default}
          />
          <Stack.Screen
            name="VerificationStepsScreen"
            getComponent={() => require('../screens/VerificationStepsScreen').default}
          />
          <Stack.Screen
            name="AddPhoneNumberScreen"
            getComponent={() => require('../screens/AddPhoneNumberScreen').default}
          />
          <Stack.Screen
            name="PhoneVerificationScreen"
            getComponent={() => require('../screens/PhoneVerificationScreen').default}
          />
          <Stack.Screen
            name="ChangePhoneNumberScreen"
            getComponent={() => require('../screens/ChangePhoneNumberScreen').default}
          />
          <Stack.Screen
            name="LicenseVerificationScreen"
            getComponent={() => require('../screens/LicenseVerificationScreen').default}
          />
          <Stack.Screen
            name="LicenseVerificationPendingScreen"
            getComponent={() => require('../screens/LicenseVerificationPendingScreen').default}
          />
        </>
      ) : null}
      {includeChatThread ? (
        <Stack.Screen
          name="ChatThreadScreen"
          getComponent={() => require('../screens/ChatThreadScreen').default}
        />
      ) : null}
    </>
  );
}
