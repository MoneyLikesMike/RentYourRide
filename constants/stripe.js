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

/** Real SetupIntent / PaymentIntent client secrets contain `_secret_`. */
export function isStripeClientSecret(clientSecret) {
  return typeof clientSecret === 'string' && clientSecret.includes('_secret_');
}

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

/**
 * Pure flag resolver (unit-tested). Remote kill-switch: extraApplePayEnabled === false.
 */
export function resolveApplePayEnabled({
  envFlag,
  extraApplePayEnabled,
  publishableKey,
  merchantId,
}) {
  if (extraApplePayEnabled === false || extraApplePayEnabled === 'false') {
    return false;
  }
  const envOn = String(envFlag || '').trim().toLowerCase() === 'true';
  const extraOn = String(extraApplePayEnabled ?? '').trim().toLowerCase() === 'true';
  if (!envOn && !extraOn) return false;
  if (!String(publishableKey || '').trim()) return false;
  if (!String(merchantId || '').trim()) return false;
  return true;
}

/**
 * Build-time / remote flag. Default OFF.
 * - EXPO_PUBLIC_APPLE_PAY_ENABLED === 'true'
 * - expo.extra.applePayEnabled !== false (remote kill-switch from app-config / RYRA-482)
 * Requires publishable key + merchant ID.
 * Runtime isPlatformPaySupported() still required in useApplePayCheckout.
 */
export function isApplePayConfigured() {
  const extra = Constants.expoConfig?.extra || {};
  let envFlag = '';
  try {
    envFlag = process.env.EXPO_PUBLIC_APPLE_PAY_ENABLED;
  } catch (_) {
    envFlag = '';
  }
  return resolveApplePayEnabled({
    envFlag,
    extraApplePayEnabled: extra.applePayEnabled,
    publishableKey: getStripePublishableKey(),
    merchantId: getStripeMerchantIdentifier(),
  });
}
