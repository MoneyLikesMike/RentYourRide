import * as listingsApi from '../services/listingsApi';

function photoUri(photo) {
  if (typeof photo === 'string') return photo;
  return photo?.uri || '';
}

export function isLocalPhotoUri(uri) {
  if (!uri || typeof uri !== 'string') return false;
  return (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('ph://') ||
    uri.startsWith('assets-library://')
  );
}

/** Upload new local photos (file:// etc.) to a remote listing; returns last API listing row if any upload ran. */
export async function syncListingPhotos(listingId, photos) {
  if (!listingId || !Array.isArray(photos)) return null;
  let lastListing = null;
  for (const photo of photos) {
    const uri = photoUri(photo);
    if (!isLocalPhotoUri(uri)) continue;
    const res = await listingsApi.hostUploadListingPhoto(listingId, {
      uri,
      name: `photo-${Date.now()}.jpg`,
      type: 'image/jpeg',
    });
    if (res?.listing) lastListing = res.listing;
  }
  return lastListing;
}
