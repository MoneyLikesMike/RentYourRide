/** Keep in sync with mobile `constants/listingMedia.js` and API host photo upload. */
export const MAX_LISTING_PHOTOS = 10;
export const MAX_LISTING_VIDEOS = 1;
export const MAX_LISTING_VIDEO_BYTES = 60 * 1024 * 1024;
export const MAX_LISTING_VIDEO_DURATION_MS = 60 * 1000;
export const LISTING_VIDEO_MIME_ALLOW = [
  'video/mp4',
  'video/quicktime',
  'video/x-m4v',
  'video/webm',
] as const;

export function isVideoFile(file: File): boolean {
  const mime = String(file.type || '').toLowerCase();
  if (mime.startsWith('video/')) return true;
  return /\.(mp4|mov|m4v|webm)$/i.test(file.name || '');
}

export function isVideoUri(uri: string): boolean {
  if (!uri) return false;
  return /\.(mp4|mov|m4v|webm)(\?|$)/i.test(uri) || uri.includes('/video');
}

export function isDraftVideo(media: File | string | null | undefined): boolean {
  if (!media) return false;
  if (typeof media === 'string') return isVideoUri(media);
  return isVideoFile(media);
}

export function listingVideoRejectReason(asset: {
  durationMs?: number | null;
  fileSize?: number | null;
  mimeType?: string | null;
  name?: string | null;
}): string | null {
  if (!asset) return 'Could not read that video. Try another clip.';
  const mime = String(asset.mimeType || '').toLowerCase();
  if (
    mime &&
    !mime.startsWith('video/') &&
    !(LISTING_VIDEO_MIME_ALLOW as readonly string[]).includes(mime)
  ) {
    return 'Use an MP4 or MOV video (up to 1 minute).';
  }
  const durationMs = Number(asset.durationMs);
  if (
    Number.isFinite(durationMs) &&
    durationMs > 0 &&
    durationMs > MAX_LISTING_VIDEO_DURATION_MS
  ) {
    return 'Videos must be 1 minute or shorter (like Facebook Marketplace).';
  }
  const size = Number(asset.fileSize);
  if (Number.isFinite(size) && size > MAX_LISTING_VIDEO_BYTES) {
    return 'That video is too large. Use a clip under 60 MB (about 1 minute).';
  }
  return null;
}

/** Read duration from a local video File (browser metadata). */
export function readVideoDurationMs(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    const finish = (ms: number | null) => {
      URL.revokeObjectURL(url);
      resolve(ms);
    };
    video.onloadedmetadata = () => {
      const seconds = video.duration;
      finish(Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null);
    };
    video.onerror = () => finish(null);
    video.src = url;
  });
}
