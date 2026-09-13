/** Marketplace-style listing clip limits (mobile + API should stay aligned). */
export const MAX_LISTING_PHOTOS = 10;
export const MAX_LISTING_VIDEOS = 3;
/** Hard cap — keeps Pinpoint/S3/disk bills predictable. */
export const MAX_LISTING_VIDEO_BYTES = 60 * 1024 * 1024;
export const MAX_LISTING_VIDEO_DURATION_MS = 60 * 1000;
export const LISTING_VIDEO_MIME_ALLOW = [
  'video/mp4',
  'video/quicktime',
  'video/x-m4v',
  'video/webm',
];

/**
 * @param {{ duration?: number | null, fileSize?: number | null, mimeType?: string | null }} asset
 * @returns {string | null} user-facing error, or null if ok
 */
export function listingVideoRejectReason(asset) {
  if (!asset) return 'Could not read that video. Try another clip.';
  const mime = String(asset.mimeType || '').toLowerCase();
  if (mime && !mime.startsWith('video/') && !LISTING_VIDEO_MIME_ALLOW.includes(mime)) {
    return 'Use an MP4 or MOV video (up to 1 minute).';
  }
  const durationMs = Number(asset.duration);
  if (Number.isFinite(durationMs) && durationMs > 0 && durationMs > MAX_LISTING_VIDEO_DURATION_MS) {
    return 'Videos must be 1 minute or shorter (like Facebook Marketplace).';
  }
  const size = Number(asset.fileSize);
  if (Number.isFinite(size) && size > MAX_LISTING_VIDEO_BYTES) {
    return 'That video is too large. Use a clip under 60 MB (about 1 minute).';
  }
  return null;
}
