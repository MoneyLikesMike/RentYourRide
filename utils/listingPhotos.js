import * as listingsApi from '../services/listingsApi';
import { resolveMediaUrl } from './mediaUrl';

function photoUri(photo) {
  if (typeof photo === 'string') return photo;
  return photo?.uri || photo?.url || '';
}

export function isListingVideo(photo) {
  if (!photo) return false;
  if (typeof photo === 'object' && photo.type === 'video') return true;
  const uri = photoUri(photo);
  if (!uri) return false;
  return /\.(mp4|mov|m4v|webm)(\?|$)/i.test(uri) || uri.includes('video');
}

export function listingMediaType(photo) {
  return isListingVideo(photo) ? 'video' : 'image';
}

export function normalizeListingMedia(photo) {
  if (typeof photo === 'string') {
    return { uri: photo, type: isListingVideo(photo) ? 'video' : 'image' };
  }
  if (!photo || typeof photo !== 'object') return null;
  const uri = photoUri(photo);
  if (!uri) return null;
  return {
    uri,
    type: listingMediaType(photo),
    ...(photo.thumbnailUri ? { thumbnailUri: photo.thumbnailUri } : {}),
    ...(photo.step != null ? { step: photo.step } : {}),
    ...(photo.label ? { label: photo.label } : {}),
    ...(photo.mimeType ? { mimeType: photo.mimeType } : {}),
  };
}

export function listingPhotoUri(photo) {
  return resolveMediaUrl(photoUri(photo));
}

export function listingPhotoUrls(photos) {
  if (!Array.isArray(photos)) return [];
  return photos.map(listingPhotoUri).filter(Boolean);
}

/** Prefer first image for cards/covers so video URIs are not used as static Image sources. */
export function listingCoverUri(photos) {
  if (!Array.isArray(photos) || !photos.length) return null;
  const images = photos.filter((p) => !isListingVideo(p));
  const pick = images[0] || photos[0];
  return listingPhotoUri(pick);
}

export function listingThumbUri(photo) {
  if (!photo) return null;
  if (typeof photo === 'object' && photo.thumbnailUri) {
    return resolveMediaUrl(photo.thumbnailUri);
  }
  return listingPhotoUri(photo);
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

function guessVideoExt(mimeType, uri) {
  const mime = String(mimeType || '').toLowerCase();
  if (mime.includes('quicktime') || mime.includes('mov')) return 'mov';
  if (mime.includes('webm')) return 'webm';
  if (/\.mov(\?|$)/i.test(uri || '')) return 'mov';
  if (/\.webm(\?|$)/i.test(uri || '')) return 'webm';
  return 'mp4';
}

/**
 * Upload new local media to a remote listing.
 * Returns `{ ...listing, photos }` with local URIs replaced by remote URLs (type preserved).
 */
export async function syncListingPhotos(listingId, photos) {
  if (!listingId || !Array.isArray(photos)) return null;
  const next = [];
  let lastListing = null;

  for (const photo of photos) {
    const normalized = normalizeListingMedia(photo);
    if (!normalized) continue;
    const { uri, type } = normalized;

    if (!isLocalPhotoUri(uri)) {
      next.push(normalized);
      continue;
    }

    const isVideo = type === 'video';
    const mimeType =
      normalized.mimeType ||
      (isVideo ? 'video/mp4' : 'image/jpeg');
    const ext = isVideo ? guessVideoExt(mimeType, uri) : 'jpg';
    try {
      const res = await listingsApi.hostUploadListingPhoto(listingId, {
        uri,
        name: `${isVideo ? 'video' : 'photo'}-${Date.now()}.${ext}`,
        type: mimeType,
        mediaType: type,
      });
      if (res?.listing) lastListing = res.listing;
      const remoteUri = res?.uri || '';
      next.push({
        uri: remoteUri || uri,
        type,
        ...(normalized.thumbnailUri ? { thumbnailUri: normalized.thumbnailUri } : {}),
      });
    } catch (err) {
      // Do not keep uploading after a hard reject (size/MIME/cap) — listing already
      // has any prior successful appends; surface the server message to the host.
      const msg =
        err?.message ||
        (isVideo
          ? 'Could not upload video. Use a clip under 60 MB and 1 minute.'
          : 'Could not upload photo. Try again.');
      const e = new Error(msg);
      e.partialListing = lastListing
        ? { ...(lastListing || { id: listingId }), photos: next }
        : null;
      throw e;
    }
  }

  if (!lastListing && next.length === 0) return null;
  return {
    ...(lastListing || { id: listingId }),
    photos: next,
  };
}
