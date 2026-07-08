import Constants from 'expo-constants';

/** Legacy RentYourRide Google OAuth clients (override via env / app.config extra). */
const DEFAULT_GOOGLE_WEB_CLIENT_ID =
  '72018389432-1u5ekal6enkntlov1q2rdjn2kij823qr.apps.googleusercontent.com';
const DEFAULT_GOOGLE_IOS_CLIENT_ID =
  '72018389432-rb2t4cj7pda7on5rj4bigvjkipgoqp2k.apps.googleusercontent.com';

function readExtra(key) {
  const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
  return typeof extra[key] === 'string' ? extra[key].trim() : '';
}

export function getGoogleWebClientId() {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
    readExtra('googleWebClientId') ||
    DEFAULT_GOOGLE_WEB_CLIENT_ID
  );
}

export function getGoogleIosClientId() {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ||
    readExtra('googleIosClientId') ||
    DEFAULT_GOOGLE_IOS_CLIENT_ID
  );
}

/** Reversed iOS client id for Google Sign-In URL scheme (Info.plist). */
export function getGoogleIosUrlScheme() {
  const iosClientId = getGoogleIosClientId();
  if (!iosClientId.endsWith('.apps.googleusercontent.com')) return null;
  const prefix = iosClientId.replace('.apps.googleusercontent.com', '');
  return `com.googleusercontent.apps.${prefix}`;
}
