import { apiFetch } from './http';

export type ListingPhoto = { uri?: string; url?: string };

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
  carFeatures: string[];
  extras: ListingExtras;
  hostName: string;
  hostTrips: number;
  hostRating: number;
  guestReviews: GuestListingReview[];
  hostPhotoUri?: string;
  hostUserId?: string;
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
};

export async function searchListings(params: {
  city?: string;
  q?: string;
}): Promise<ListingSummary[]> {
  const qs = new URLSearchParams();
  if (params.city?.trim()) qs.set('city', params.city.trim());
  if (params.q?.trim()) qs.set('q', params.q.trim());
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

export function listingPhotoUrl(
  listing: Pick<ListingSummary, 'photos'>,
  index = 0,
): string | null {
  const photo = listing.photos?.[index];
  if (!photo) return null;
  return photo.uri || photo.url || null;
}

export function listingPhotoUrls(listing: Pick<ListingSummary, 'photos'>): string[] {
  return (listing.photos ?? [])
    .map((p) => p.uri || p.url || '')
    .filter(Boolean);
}

export const CAR_FEATURE_LABELS: Record<string, string> = {
  navigation: 'NAVIGATION',
  remoteStart: 'REMOTE START',
  backUpCamera: 'BACK UP CAMERA',
  audioInput: 'AUDIO INPUT',
  usb: 'USB',
  bluetooth: 'BLUETOOTH',
  petFriendly: 'PET FRIENDLY',
  convertible: 'CONVERTIBLE',
  sunroof: 'SUNROOF',
  heatedSeats: 'HEATED SEATS',
  snowTires: 'SNOW TIRES',
  allWheelDrive: 'ALL-WHEEL DRIVE',
};
