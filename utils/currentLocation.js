import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { reverseGeocode } from '../services/geocodeApi';

/**
 * GPS only — coordinates from expo-location (no external geocoding API).
 */
export async function getCurrentCoordinates() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission is required to use your current location.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

/**
 * Current location: expo-location for GPS, backend for display address.
 * @returns {Promise<{ query: string, city: string, country: string, street: string, latitude: number, longitude: number, cached?: boolean }>}
 */
export async function resolveCurrentLocationQuery() {
  const { latitude, longitude } = await getCurrentCoordinates();
  const geo = await reverseGeocode(latitude, longitude);

  const query =
    geo.formatted ||
    [geo.street, geo.city, geo.region, geo.country].filter(Boolean).join(', ') ||
    `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  return {
    query,
    city: geo.city || '',
    country: geo.country || '',
    street: geo.street || '',
    region: geo.region || '',
    postalCode: geo.postalCode || '',
    latitude,
    longitude,
    cached: geo.cached,
  };
}

/** @param {string} [title] */
export async function resolveCurrentLocationQueryWithAlert(title = 'Location') {
  try {
    return await resolveCurrentLocationQuery();
  } catch (err) {
    Alert.alert(title, err?.message || 'Unable to get your current location.');
    return null;
  }
}

/**
 * Structured address for listing pickup.
 * @returns {Promise<{ country: string, city: string, address: string } | null>}
 */
export async function resolveCurrentLocationAddress() {
  const loc = await resolveCurrentLocationQueryWithAlert('Location Error');
  if (!loc) return null;

  return {
    country: loc.country,
    city: loc.city,
    address: loc.street || loc.query.split(',')[0]?.trim() || '',
    latitude: loc.latitude,
    longitude: loc.longitude,
  };
}
