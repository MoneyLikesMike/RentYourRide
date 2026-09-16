import Constants from 'expo-constants';

/** Base URL for Nest `/v1` API (no trailing slash). */
export function getApiBaseUrl() {
  try {
    const fromEnv = process.env.EXPO_PUBLIC_API_URL;
    if (fromEnv && String(fromEnv).trim()) {
      return String(fromEnv).trim().replace(/\/$/, '');
    }
  } catch (_) {
    /* ignore */
  }

  const extra = Constants.expoConfig?.extra || {};
  if (extra.useDevApi && extra.devApiUrl) {
    return String(extra.devApiUrl).trim().replace(/\/$/, '');
  }
  if (extra.apiUrl) {
    return String(extra.apiUrl).trim().replace(/\/$/, '');
  }
  return 'http://127.0.0.1:8080';
}
