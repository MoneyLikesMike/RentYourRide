import Constants from 'expo-constants';

/** Same Crisp workspace as the customer website (`VITE_CRISP_WEBSITE_ID`). */
const DEFAULT_CRISP_WEBSITE_ID = '065277e6-bbc9-4e14-936d-66e377740234';

function readExtra(key) {
  const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
  const value = extra[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function getCrispWebsiteId() {
  return (
    process.env.EXPO_PUBLIC_CRISP_WEBSITE_ID?.trim() ||
    readExtra('crispWebsiteId') ||
    DEFAULT_CRISP_WEBSITE_ID
  );
}

export function isCrispConfigured() {
  return Boolean(getCrispWebsiteId());
}
