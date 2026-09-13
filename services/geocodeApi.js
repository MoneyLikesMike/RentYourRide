import { getApiBaseUrl } from '../constants/api';

/**
 * Reverse geocode via backend (Google Geocoding API + DB cache).
 * @param {number} latitude
 * @param {number} longitude
 */
export async function reverseGeocode(latitude, longitude) {
  const base = getApiBaseUrl();
  let res;
  try {
    res = await fetch(`${base}/v1/geocode/reverse`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ latitude, longitude }),
    });
  } catch (e) {
    const reason = e && typeof e.message === 'string' ? e.message : 'Network error';
    throw new Error(`${reason}. Is the API running?`);
  }

  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const msg =
      parsed?.message ||
      (Array.isArray(parsed?.message) ? parsed.message[0] : null) ||
      'Could not reverse geocode location';
    throw new Error(typeof msg === 'string' ? msg : 'Could not reverse geocode location');
  }

  return parsed;
}

/**
 * Forward geocode an address string via backend (Google Geocoding API).
 * @param {string} address
 */
export async function forwardGeocode(address) {
  const base = getApiBaseUrl();
  let res;
  try {
    res = await fetch(`${base}/v1/geocode/forward`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ address }),
    });
  } catch (e) {
    const reason = e && typeof e.message === 'string' ? e.message : 'Network error';
    throw new Error(`${reason}. Is the API running?`);
  }

  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const msg =
      parsed?.message ||
      (Array.isArray(parsed?.message) ? parsed.message[0] : null) ||
      'Could not find that location on the map';
    throw new Error(typeof msg === 'string' ? msg : 'Could not find that location on the map');
  }

  return parsed;
}
