/**
 * Host payout notification copy (email/push). Pending Michael / legal approval (RYRA-485).
 * Do not send from unit tests — callers must gate on real notify paths.
 */

export const PAYOUT_NOTIFY = {
  requirementsDue: {
    pushTitle: 'Finish payout setup',
    pushBody:
      'Stripe needs a few more details before we can pay you. Tap to finish setup.',
    emailSubject: 'Finish payout setup to get paid — RentYourRide',
    emailBody:
      'Hi {{firstName}},\n\nWe still need a few details to verify your payout account. Complete setup in the app or on the website under Trips → Payouts so we can send you earnings.\n\nThanks,\nRentYourRide',
  },
  payoutsEnabled: {
    pushTitle: 'You’re ready to get paid',
    pushBody: 'Your payout account is verified. Earnings can now be sent to your bank.',
    emailSubject: 'Payouts enabled — RentYourRide',
    emailBody:
      'Hi {{firstName}},\n\nGood news — your payout account is verified and ready. We’ll send your host earnings to the bank account on file.\n\nThanks,\nRentYourRide',
  },
  payoutsDisabled: {
    pushTitle: 'Payouts paused',
    pushBody:
      'We can’t send payouts right now. Open Finish payout setup to review what’s needed.',
    emailSubject: 'Action needed: payouts paused — RentYourRide',
    emailBody:
      'Hi {{firstName}},\n\nPayouts on your host account are paused until we can verify a few details. Please open Finish payout setup in the app or under Trips → Payouts.\n\nThanks,\nRentYourRide',
  },
} as const;
