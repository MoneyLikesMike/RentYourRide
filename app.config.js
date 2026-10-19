/** @type {import('expo/config').ExpoConfig} */
require('dotenv').config();
const appJson = require('./app.json');

const MERCHANT_ID =
  process.env.EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER?.trim() ||
  appJson.expo?.extra?.stripeMerchantIdentifier ||
  'merchant.com.rentyourride.ios';

const applePayEnabled =
  String(process.env.EXPO_PUBLIC_APPLE_PAY_ENABLED || '').trim().toLowerCase() ===
  'true';

module.exports = () => {
  const extra = { ...(appJson.expo.extra || {}) };

  if (process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()) {
    extra.stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY.trim();
  }
  if (process.env.EXPO_PUBLIC_API_URL?.trim()) {
    const url = process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/$/, '');
    extra.apiUrl = url;
    extra.devApiUrl = url;
    // bedev / local → useDevApi; production backend → production
    extra.useDevApi = /bedev\.|localhost|127\.0\.0\.1/.test(url);
  }
  if (process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY?.trim()) {
    extra.googlePlacesApiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY.trim();
  }
  if (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim()) {
    extra.googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.trim();
  }
  if (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim()) {
    extra.googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.trim();
  }
  if (process.env.EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER?.trim()) {
    extra.stripeMerchantIdentifier = process.env.EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER.trim();
  }
  // Default OFF — only true when explicitly enabled for this build.
  extra.applePayEnabled = applePayEnabled;

  const plugins = (appJson.expo.plugins || []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === '@stripe/stripe-react-native') {
      return [
        '@stripe/stripe-react-native',
        {
          ...(plugin[1] || {}),
          merchantIdentifier: applePayEnabled ? MERCHANT_ID : undefined,
          enableApplePay: applePayEnabled,
          enableGooglePay: false,
        },
      ];
    }
    return plugin;
  });

  const baseIos = { ...(appJson.expo.ios || {}) };
  const baseEntitlements = { ...(baseIos.entitlements || {}) };
  if (applePayEnabled) {
    baseEntitlements['com.apple.developer.in-app-payments'] = [MERCHANT_ID];
  } else {
    delete baseEntitlements['com.apple.developer.in-app-payments'];
  }

  return {
    ...appJson,
    expo: {
      ...appJson.expo,
      extra,
      plugins,
      ios: {
        ...baseIos,
        entitlements: baseEntitlements,
      },
    },
  };
};
