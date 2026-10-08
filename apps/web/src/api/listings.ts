import { apiFetch } from './http';

export type ListingPhoto = {
  uri?: string;
  url?: string;
  type?: 'image' | 'video' | string;
  thumbnailUri?: string;
};

export type ListingMediaItem = {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string | null;
};

export type ListingSummary = {
  id: string;
  city: string;
  title: string;
  description?: string;
  vehicleType?: string;
  photos?: ListingPhoto[];
  pricePerDay: number;
  pickupAddress?: string;
  hostName?: string;
  hostTrips?: number;
  hostRating?: number;
  instantBooking?: boolean;
  latitude?: number;
  longitude?: number;
  carFeatures?: string[];
  vehicleData?: Record<string, unknown>;
  guestReviews?: GuestListingReview[];
  weeklyDiscount?: string;
  monthlyDiscount?: string;
};

export type ListingExtras = {
  fuel?: { enabled?: boolean; price?: number | string };
  cleaning?: { enabled?: boolean; price?: number | string };
  unlimitedKm?: { enabled?: boolean; price?: number | string };
  advanceNotice?: string;
  shortestTrip?: string;
  longestTrip?: string;
  kmOverageFee?: number;
  [key: string]: unknown;
};

export type GuestListingReview = {
  bookingId: string;
  rating: number;
  publicText: string;
  guestName: string;
  guestPhotoUri?: string | null;
  submittedAt?: number;
};

export type ListingDetail = ListingSummary & {
  description: string;
  weeklyDiscount: string;
  monthlyDiscount: string;
  deliveryPrice: number;
  dailyKm: string;
  instantBooking: boolean;
  pickupAddress: string;
  active: boolean;
  published: boolean;
  vin?: string;
  licensePlate?: string;
  licenseProvince?: string;
  carFeatures: string[];
  extras: ListingExtras;
  availability?: Array<{ start: string; end: string }>;
  hostName: string;
  hostTrips: number;
  hostRating: number;
  guestReviews: GuestListingReview[];
  hostPhotoUri?: string;
  hostUserId?: string;
  /** Calendar year the host account was created */
  hostJoinedYear?: number;
  /** Host about / bio text shown under “Hosted by” */
  hostBio?: string;
  vehicleData?: {
    make?: string;
    model?: string;
    year?: string | number;
    color?: string;
    transmission?: string;
    fuelType?: string;
    [key: string]: unknown;
  };
  blockedRanges?: Array<{ start: string; end: string }>;
  /** Mobile-shaped blocked ranges (ms) from Nest toPublicDetailDto. */
  calendarData?: {
    blockedRanges?: Array<{ start: number; end: number }>;
  } | null;
};

export async function searchListings(params: {
  city?: string;
  q?: string;
  latitude?: number | null;
  longitude?: number | null;
  radiusKm?: number;
}): Promise<ListingSummary[]> {
  const qs = new URLSearchParams();
  if (params.city?.trim()) qs.set('city', params.city.trim());
  if (params.q?.trim()) qs.set('q', params.q.trim());
  if (typeof params.latitude === 'number' && Number.isFinite(params.latitude)) {
    qs.set('latitude', String(params.latitude));
  }
  if (typeof params.longitude === 'number' && Number.isFinite(params.longitude)) {
    qs.set('longitude', String(params.longitude));
  }
  if (typeof params.radiusKm === 'number' && Number.isFinite(params.radiusKm)) {
    qs.set('radiusKm', String(params.radiusKm));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<ListingSummary[]>(`v1/listings/search${suffix}`, {
    method: 'GET',
    auth: false,
  });
}

export async function getListing(id: string): Promise<ListingDetail> {
  return apiFetch<ListingDetail>(`v1/listings/${encodeURIComponent(id)}`, {
    method: 'GET',
    auth: false,
  });
}

/** Card/cover image: first photo, never a video URL (which breaks as an `<img>` source). */
export function listingPhotoUrl(
  listing: Pick<ListingSummary, 'photos'>,
): string | null {
  const items = listingMediaItems(listing);
  const image = items.find((m) => m.type === 'image');
  if (image) return image.url;
  return items.find((m) => m.thumbnailUrl)?.thumbnailUrl || null;
}

export function isListingVideo(photo: ListingPhoto | string | null | undefined): boolean {
  if (!photo) return false;
  if (typeof photo === 'object' && photo.type === 'video') return true;
  const uri =
    typeof photo === 'string' ? photo : photo.uri || photo.url || '';
  if (!uri) return false;
  return /\.(mp4|mov|m4v|webm)(\?|$)/i.test(uri) || uri.includes('/video');
}

export function listingMediaItems(
  listing: Pick<ListingSummary, 'photos'>,
): ListingMediaItem[] {
  return (listing.photos ?? [])
    .map((p): ListingMediaItem | null => {
      const url = p.uri || p.url || '';
      if (!url) return null;
      return {
        url,
        type: isListingVideo(p) ? ('video' as const) : ('image' as const),
        thumbnailUrl: p.thumbnailUri || null,
      };
    })
    .filter((x): x is ListingMediaItem => x != null);
}

export function listingPhotoUrls(listing: Pick<ListingSummary, 'photos'>): string[] {
  return listingMediaItems(listing).map((m) => m.url);
}

export const CAR_FEATURE_LABELS: Record<string, string> = {
  navigation: 'Navigation',
  remoteStart: 'Remote start',
  backUpCamera: 'Back up camera',
  audioInput: 'Audio input',
  usb: 'USB',
  bluetooth: 'Bluetooth',
  petFriendly: 'Pet friendly',
  convertible: 'Convertible',
  sunroof: 'Sunroof',
  heatedSeats: 'Heated seats',
  snowTires: 'Snow tires',
  allWheelDrive: 'All-wheel drive',
};

export const CAR_FEATURE_ICONS: Record<string, string> = {
  navigation: '/fyc/features/feature1.png',
  remoteStart: '/fyc/features/feature2.png',
  backUpCamera: '/fyc/features/feature3.png',
  audioInput: '/fyc/features/feature4.png',
  usb: '/fyc/features/feature5.png',
  bluetooth: '/fyc/features/feature6.png',
  petFriendly: '/fyc/features/feature7.png',
  convertible: '/fyc/features/feature8.png',
  sunroof: '/fyc/features/feature9.png',
  heatedSeats: '/fyc/features/feature10.png',
  snowTires: '/fyc/features/feature11.png',
  allWheelDrive: '/fyc/features/feature12.png',
};
