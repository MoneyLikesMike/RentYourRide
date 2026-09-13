import Constants from 'expo-constants';

/** Stripe publishable key (pk_test_… or pk_live_…). Never put the secret key in the app. */
export function getStripePublishableKey() {
  try {
    const fromEnv = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (fromEnv && String(fromEnv).trim()) {
      return String(fromEnv).trim();
    }
  } catch (_) {
    /* ignore */
  }
  const extra = Constants.expoConfig?.extra || {};
  if (extra.stripePublishableKey && String(extra.stripePublishableKey).trim()) {
    return String(extra.stripePublishableKey).trim();
  }
  return '';
}

export function isStripeConfigured() {
  return Boolean(getStripePublishableKey());
}

/** Real SetupIntent client secrets contain `_secret_`. */
export function isStripeClientSecret(clientSecret) {
  return typeof clientSecret === 'string' && clientSecret.includes('_secret_');
}

/**
 * Apple Pay is on hold (App Review Guideline 2.1: binary declared PassKit
 * without offering Apple Pay). Flip to true only after the merchant ID is
 * registered with Apple + Stripe and the in-app-payments entitlement is
 * restored in ios/RentYourRide/RentYourRide.entitlements.
 */
const APPLE_PAY_ENABLED = false;

const DEFAULT_APPLE_PAY_MERCHANT_ID = 'merchant.com.rentyourride.ios';

/** Apple Pay merchant identifier — must match Apple Developer + Stripe Dashboard. */
export function getStripeMerchantIdentifier() {
  try {
    const fromEnv = process.env.EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER;
    if (fromEnv && String(fromEnv).trim()) {
      return String(fromEnv).trim();
    }
  } catch (_) {
    /* ignore */
  }
  const extra = Constants.expoConfig?.extra || {};
  if (extra.stripeMerchantIdentifier && String(extra.stripeMerchantIdentifier).trim()) {
    return String(extra.stripeMerchantIdentifier).trim();
  }
  return DEFAULT_APPLE_PAY_MERCHANT_ID;
}

export function isApplePayConfigured() {
  return APPLE_PAY_ENABLED && isStripeConfigured() && Boolean(getStripeMerchantIdentifier());
}
