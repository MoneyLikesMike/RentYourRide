import { Alert } from 'react-native';
import * as listingsApi from '../services/listingsApi';

/** Strip spaces/dashes and uppercase. */
export function normalizeVin(vin) {
  return String(vin || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
}

/** VINs exclude I, O, and Q per ISO 3779. */
export function isValidVin(vin) {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(normalizeVin(vin));
}

/** Extract a 17-character VIN from barcode/OCR text if present. */
export function extractVinFromText(text) {
  const normalized = normalizeVin(text);
  if (isValidVin(normalized)) return normalized;
  const match = String(text || '').toUpperCase().match(/[A-HJ-NPR-Z0-9]{17}/);
  return match ? match[0] : null;
}

/**
 * Check duplicate VIN, decode via API (NHTSA), and navigate to listing or error screen.
 */
export async function processVinForListing({ navigation, vin, completedAddress, isModelYear1981OrLater = true }) {
  const normalized = normalizeVin(vin);
  if (!isValidVin(normalized)) {
    Alert.alert(
      'Invalid VIN',
      'VIN must be exactly 17 characters (letters and numbers, no I, O, or Q).',
    );
    return false;
  }

  let result;
  try {
    result = await listingsApi.decodeVin(normalized);
  } catch (err) {
    Alert.alert('VIN lookup failed', err?.message || 'Could not look up this VIN. Try again.');
    return false;
  }

  if (result?.exists) {
    navigation.navigate('VINAlreadyExistsScreen');
    return false;
  }

  const decoded = result?.vehicleData;
  if (!decoded?.make && !decoded?.model) {
    Alert.alert(
      'Could not decode VIN',
      result?.message || 'We could not find vehicle details for this VIN. Check for typos or enter details manually.',
    );
    return false;
  }

  navigation.navigate('TellUsAboutYourRideScreen1', {
    vehicleData: {
      ...decoded,
      vin: normalized,
      isModelYear1981OrLater,
    },
    showVehicleInfo: true,
    completedAddress,
  });
  return true;
}
