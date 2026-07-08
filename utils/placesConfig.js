import Constants from 'expo-constants';
import { getApiBaseUrl } from '../constants/api';

/**
 * Places autocomplete uses Google's HTTP REST API from JavaScript. iOS/Android app
 * restrictions on API keys do NOT apply (Google sees "empty referer"). Always proxy
 * through bedev so the server IP-restricted key is used — never call Google directly
 * from the device with an IP-restricted key.
 */
export function getGooglePlacesRequestUrl() {
  try {
    const base = getApiBaseUrl();
    if (!base || /127\.0\.0\.1|localhost/.test(base)) return undefined;
    return {
      useOnPlatform: 'all',
      url: `${base.replace(/\/$/, '')}/v1/maps-proxy/api`,
    };
  } catch (_) {
    return undefined;
  }
}

/** Direct mobile key — simulator/local only when bedev proxy is unavailable. */
export function getGooglePlacesApiKey() {
  try {
    const fromEnv =
      process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
    if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();
  } catch (_) {
    /* ignore */
  }
  try {
    const fromExtra = Constants.expoConfig?.extra?.googlePlacesApiKey;
    if (fromExtra && String(fromExtra).trim()) return String(fromExtra).trim();
  } catch (_) {
    /* ignore */
  }
  return undefined;
}

export const PLACES_QUERY_DEFAULTS = {
  language: 'en',
  components: 'country:ca|country:us',
};
