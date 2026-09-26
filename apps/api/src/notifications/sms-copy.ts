/**
 * SMS notification copy — edit here, then deploy.
 * Placeholders resolved at send time: Guest, Host, Start, End, Message, Code.
 */

const PREFIX = 'Rent Your Ride:';

function withPrefix(body: string): string {
  return `${PREFIX} ${body}`;
}

export const SmsCopy = {
  phoneOtp: (code: string) => `Rent Your Ride verification code: ${code}`,

  bookingCreatedGuest: () =>
    withPrefix(
      "You sent a reservation request. This is not a confirmed booking yet. You'll get a response within 24 hours",
    ),

  bookingCreatedHost: (guestFirstName: string) =>
    withPrefix(
      `${guestFirstName} would like to book your ride. Let them know if it works for you.`,
    ),

  bookingApprovedGuest: (hostFirstName: string, start: string, end: string) =>
    withPrefix(
      `You have successfully confirmed a booking with ${hostFirstName} for ${start} - ${end}. Get ready to experience Rent Your Ride!`,
    ),

  bookingApprovedHost: (guestFirstName: string, start: string, end: string) =>
    withPrefix(
      `You have successfully confirmed ${guestFirstName}'s booking request for ${start} - ${end}`,
    ),

  bookingDeniedGuest: (hostFirstName: string) =>
    withPrefix(`Your booking request doesn't work for ${hostFirstName}.`),

  bookingDeniedHost: (guestFirstName: string) =>
    withPrefix(`You Denied ${guestFirstName}'s Booking Request.`),

  bookingCheckedInGuest: (hostFirstName: string) =>
    withPrefix(
      `You have successfully checked in for your trip with ${hostFirstName}'s ride.`,
    ),

  bookingCheckedInHost: (guestFirstName: string) =>
    withPrefix(
      `${guestFirstName} has successfully checked in for their trip with your ride.`,
    ),

  bookingCheckedOutGuest: (hostFirstName: string) =>
    withPrefix(
      `You have successfully checked out for your trip with ${hostFirstName}'s ride.`,
    ),

  bookingCheckedOutHost: (guestFirstName: string) =>
    withPrefix(
      `${guestFirstName} has successfully checked out and has ended their trip using your ride.`,
    ),

  tripBeginningSoonGuest: () =>
    withPrefix(
      "Your trip is beginning soon. Don't forget to confirm any trip details with your host!",
    ),

  tripBeginningSoonHost: () =>
    withPrefix(
      "Your trip is beginning soon. Don't forget to confirm any trip details with your guest!",
    ),

  tripEndingSoonGuest: (hostFirstName: string) =>
    withPrefix(
      `Your trip is ending soon. Don't forget to coordinate the drop off location and time with ${hostFirstName}.`,
    ),

  tripEndingSoonHost: (guestFirstName: string) =>
    withPrefix(
      `Your trip is ending soon. Don't forget to coordinate the drop off location and time with ${guestFirstName}.`,
    ),

  newMessageFromHost: (hostFirstName: string, message: string) =>
    withPrefix(`You received a message from ${hostFirstName} - ${message}`),

  newMessageFromGuest: (guestFirstName: string, message: string) =>
    withPrefix(`You received a message from ${guestFirstName} - ${message}`),

  licenseApproved: () =>
    withPrefix('We approved your license. You can book or list a ride.'),

  licenseDenied: () =>
    withPrefix(
      'We have declined your license. Please make sure your license is valid and the image is clear before you upload it.',
    ),

  listingApproved: () =>
    withPrefix(
      'We approved your listing. You can now start earning extra cash from your ride.',
    ),

  listingDenied: () =>
    withPrefix(
      'We have denied your listing. Please make sure your vehicle fits within our guidelines.',
    ),

  paymentMethodAdded: () =>
    withPrefix('We noticed a new payment method was added to your account.'),

  extensionCreatedGuest: () =>
    withPrefix(
      "You sent a trip extension request. This is not a confirmed booking yet. You'll get a response within 24 hours.",
    ),

  extensionCreatedHost: (guestFirstName: string) =>
    withPrefix(
      `${guestFirstName} likes your ride and would like to extend their booking with you. Let them know if it works for you.`,
    ),

  extensionApprovedGuest: (end: string) =>
    withPrefix(`Your trip extension is confirmed through ${end}.`),

  extensionDeniedGuest: (hostFirstName: string) =>
    withPrefix(`Your booking extension doesn't work for ${hostFirstName}.`),

  extensionDeniedHost: (guestFirstName: string) =>
    withPrefix(`You denied ${guestFirstName}'s extension request.`),
} as const;
