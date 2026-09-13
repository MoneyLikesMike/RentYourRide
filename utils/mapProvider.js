import { Platform } from 'react-native';
import { PROVIDER_GOOGLE } from 'react-native-maps';

/** Apple Maps on iOS (free); Google Maps on Android. */
export const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;
