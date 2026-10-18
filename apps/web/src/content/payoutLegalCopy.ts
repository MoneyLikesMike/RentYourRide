/**
 * Legal copy for Get Paid (web + iOS). Keep in sync with
 * `constants/payoutLegalCopy.js` for App Store / legal review.
 *
 * Links:
 * - Stripe Connected Account Agreement (full): https://stripe.com/connect-account/legal/full
 * - Stripe Privacy Policy: https://stripe.com/privacy
 * - RentYourRide Terms: /terms-conditions
 */

export const STRIPE_CONNECT_ACCOUNT_AGREEMENT_URL =
  'https://stripe.com/connect-account/legal/full';

export const STRIPE_PRIVACY_POLICY_URL = 'https://stripe.com/privacy';

export const RYR_TERMS_PATH = '/terms-conditions';

/**
 * Full paragraph shown above Save on Get Paid.
 * Pending Michael / legal approval (RYRA-484).
 */
export const PAYOUT_SAVE_LEGAL_COPY =
  "By saving, you agree to the Stripe Connected Account Agreement and RentYourRide's Terms. Our payment processor can obtain information from credit agencies to verify your identity, as described in Stripe's Privacy Policy.";

export const PAYOUT_STATUS_ENABLED = 'Enabled';
export const PAYOUT_STATUS_VERIFYING = "We're verifying your details";
export const PAYOUT_STATUS_ACTION_NEEDED = 'Action needed';
