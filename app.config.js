/** @type {import('expo/config').ExpoConfig} */
require('dotenv').config();
const appJson = require('./app.json');

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

  return {
    ...appJson,
    expo: {
      ...appJson.expo,
      extra,
    },
  };
};
