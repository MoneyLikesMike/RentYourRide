import { apiFetch } from './http';
import type { ListingDetail, ListingExtras } from './listings';
import { isListingVideo } from './listings';
import {
  apiRangesToCalendarData,
  calendarDataToApiRanges,
  type ListRideCalendarData,
} from '../utils/listingAvailability';
import { isVideoFile } from '../utils/listingMedia';

export type HostListingBody = {
  city?: string;
  title?: string;
  description?: string;
  vehicleType?: string;
  photos?: Array<{ uri?: string; url?: string; type?: 'image' | 'video' | string }>;
  pricePerDay?: number;
  weeklyDiscount?: string | null;
  monthlyDiscount?: string | null;
  deliveryPrice?: number | null;
  dailyKm?: string | null;
  instantBooking?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  pickupAddress?: string;
  vin?: string | null;
  carFeatures?: string[];
  extras?: ListingExtras;
  licensePlate?: string | null;
  licenseProvince?: string | null;
  vehicleData?: Record<string, unknown> | null;
  availability?: Array<{ start: string; end: string }>;
};

export type VinDecodeResult = {
  exists: boolean;
  vehicleData: Record<string, unknown> | null;
  message?: string;
};

export async function listHostListings(): Promise<ListingDetail[]> {
  return apiFetch<ListingDetail[]>('v1/host/listings', { method: 'GET' });
}

export async function getHostListing(id: string): Promise<ListingDetail> {
  const rows = await listHostListings();
  const found = rows.find((r) => String(r.id) === String(id));
  if (!found) {
    throw new Error('Listing not found');
  }
  return found;
}

export async function createHostListing(
  body: HostListingBody,
): Promise<ListingDetail> {
  return apiFetch<ListingDetail>('v1/host/listings', {
    method: 'POST',
    json: body,
  });
}

export async function patchHostListing(
  id: string,
  body: HostListingBody,
): Promise<ListingDetail> {
  return apiFetch<ListingDetail>(`v1/host/listings/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    json: body,
  });
}

export async function publishHostListing(id: string): Promise<ListingDetail> {
  return apiFetch<ListingDetail>(
    `v1/host/listings/${encodeURIComponent(id)}/publish`,
    { method: 'POST', json: {} },
  );
}

export async function unpublishHostListing(id: string): Promise<ListingDetail> {
  return apiFetch<ListingDetail>(
    `v1/host/listings/${encodeURIComponent(id)}/unpublish`,
    { method: 'POST', json: {} },
  );
}

export async function deleteHostListing(id: string): Promise<void> {
  await apiFetch(`v1/host/listings/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function uploadHostListingPhoto(
  id: string,
  file: File,
  mediaType?: 'image' | 'video',
): Promise<{ uri: string; listing: ListingDetail }> {
  const form = new FormData();
  form.append('file', file);
  const type =
    mediaType || (isVideoFile(file) ? 'video' : 'image');
  form.append('mediaType', type);
  return apiFetch(`v1/host/listings/${encodeURIComponent(id)}/photos`, {
    method: 'POST',
    body: form,
  });
}

/**
 * Sync draft media to a listing: remove dropped items, upload new Files, pin
 * video first. Matches mobile `syncListingPhotos` ordering.
 */
export async function syncHostListingMedia(
  listingId: string,
  draft: Pick<ListRideDraft, 'photos' | 'video'>,
): Promise<Array<{ uri: string; type: 'image' | 'video' }>> {
  const keepers: Array<{ uri: string; type: 'image' | 'video' }> = [];
  if (typeof draft.video === 'string' && draft.video) {
    keepers.push({ uri: draft.video, type: 'video' });
  }
  for (const photo of draft.photos) {
    if (typeof photo === 'string' && photo) {
      keepers.push({ uri: photo, type: 'image' });
    }
  }
  // Drop removed media (including an old video) before uploading a replacement.
  await patchHostListing(listingId, { photos: keepers });

  const final: Array<{ uri: string; type: 'image' | 'video' }> = [];
  if (draft.video) {
    if (typeof draft.video === 'string') {
      final.push({ uri: draft.video, type: 'video' });
    } else {
      const uploaded = await uploadHostListingPhoto(
        listingId,
        draft.video,
        'video',
      );
      final.push({ uri: uploaded.uri, type: 'video' });
    }
  }
  for (const photo of draft.photos) {
    if (!photo) continue;
    if (typeof photo === 'string') {
      final.push({ uri: photo, type: 'image' });
    } else {
      const uploaded = await uploadHostListingPhoto(listingId, photo, 'image');
      final.push({ uri: uploaded.uri, type: 'image' });
    }
  }
  await patchHostListing(listingId, { photos: final });
  return final;
}

export async function decodeVin(vin: string): Promise<VinDecodeResult> {
  const normalized = vin.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return apiFetch<VinDecodeResult>(
    `v1/listings/vin/${encodeURIComponent(normalized)}/decode`,
    { method: 'GET', auth: false },
  );
}

export type ListRideDraft = {
  pickupAddress: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  vin: string;
  make: string;
  model: string;
  year: string;
  vehicleType: string;
  trim: string;
  color: string;
  transmission: string;
  fuelType: string;
  odometer: string;
  licensePlate: string;
  licenseProvince: string;
  neverHadSalvageTitle: boolean;
  vehicleData: Record<string, unknown> | null;
  advanceNotice: string;
  shortestTrip: string;
  longestTrip: string;
  dailyKm: string;
  pricePerDay: string;
  weeklyDiscount: string;
  monthlyDiscount: string;
  kmOverageFee: number;
  deliveryEnabled: boolean;
  deliveryPrice: string;
  extrasUnlimitedKmOn: boolean;
  extrasFuelOn: boolean;
  extrasCleaningOn: boolean;
  extrasUnlimitedKmPrice: string;
  extrasFuelPrice: string;
  extrasCleaningPrice: string;
  description: string;
  checkInInstructions: string;
  checkOutInstructions: string;
  carFeatures: string[];
  /** Slot-ordered listing photos (images only); null = empty. File = new upload; string = existing URL. */
  photos: Array<File | string | null>;
  /** Optional short clip (max 1). File = new upload; string = existing URL. */
  video: File | string | null;
  /** Host blocked dates + hours (CalendarScreen parity). */
  calendarData: ListRideCalendarData | null;
};

export function emptyListRideDraft(): ListRideDraft {
  return {
    pickupAddress: '',
    city: '',
    country: '',
    latitude: null,
    longitude: null,
    vin: '',
    make: '',
    model: '',
    year: '',
    vehicleType: '',
    trim: '',
    color: '',
    transmission: '',
    fuelType: '',
    odometer: '',
    licensePlate: '',
    licenseProvince: '',
    neverHadSalvageTitle: true,
    vehicleData: null,
    advanceNotice: '1 day',
    shortestTrip: '1 day',
    longestTrip: '2 weeks',
    dailyKm: '200 km',
    pricePerDay: '65',
    weeklyDiscount: '10%',
    monthlyDiscount: '20%',
    kmOverageFee: 0.25,
    deliveryEnabled: false,
    deliveryPrice: '50',
    extrasUnlimitedKmOn: false,
    extrasFuelOn: false,
    extrasCleaningOn: false,
    extrasUnlimitedKmPrice: '150',
    extrasFuelPrice: '80',
    extrasCleaningPrice: '50',
    description: '',
    checkInInstructions: '',
    checkOutInstructions: '',
    carFeatures: [],
    photos: [null, null, null, null, null, null],
    video: null,
    calendarData: null,
  };
}

export function draftToListingBody(draft: ListRideDraft): HostListingBody {
  const extras: ListingExtras = {
    fuel: {
      enabled: draft.extrasFuelOn,
      price: Number(draft.extrasFuelPrice) || 80,
    },
    cleaning: {
      enabled: draft.extrasCleaningOn,
      price: Number(draft.extrasCleaningPrice) || 50,
    },
    unlimitedKm: {
      enabled: draft.extrasUnlimitedKmOn,
      price: Number(draft.extrasUnlimitedKmPrice) || 150,
    },
    advanceNotice: draft.advanceNotice,
    shortestTrip: draft.shortestTrip,
    longestTrip: draft.longestTrip,
    kmOverageFee: draft.kmOverageFee,
    checkInInstructions: draft.checkInInstructions.trim() || undefined,
    checkOutInstructions: draft.checkOutInstructions.trim() || undefined,
  };

  const title =
    [draft.year, draft.make, draft.model].filter(Boolean).join(' ') ||
    'My vehicle';

  return {
    city: draft.city || 'Winnipeg',
    title,
    description: draft.description.trim(),
    vehicleType: draft.vehicleType || 'Car',
    pricePerDay: Number(draft.pricePerDay) || 40,
    weeklyDiscount: draft.weeklyDiscount || null,
    monthlyDiscount: draft.monthlyDiscount || null,
    deliveryPrice: draft.deliveryEnabled
      ? Number(draft.deliveryPrice) || 0
      : 0,
    dailyKm: draft.dailyKm || null,
    instantBooking: draft.advanceNotice === 'Instant booking',
    latitude: draft.latitude,
    longitude: draft.longitude,
    pickupAddress:
      draft.pickupAddress ||
      [draft.city, draft.country].filter(Boolean).join(', '),
    vin: draft.vin.trim() || null,
    carFeatures: draft.carFeatures,
    extras,
    licensePlate: draft.licensePlate.trim() || null,
    licenseProvince: draft.licenseProvince.trim() || null,
    vehicleData: {
      ...(draft.vehicleData || {}),
      make: draft.make,
      model: draft.model,
      year: draft.year,
      color: draft.color,
      transmission: draft.transmission,
      fuelType: draft.fuelType,
      odometer: draft.odometer,
      trim: draft.trim,
      neverHadSalvageTitle: draft.neverHadSalvageTitle,
      vin: draft.vin.trim(),
    },
    availability: calendarDataToApiRanges(draft.calendarData),
  };
}

function str(v: unknown, fallback = ''): string {
  if (v == null) return fallback;
  return String(v);
}

/** Map an existing host listing into the List Your Ride draft shape. */
export function listingToDraft(listing: ListingDetail): ListRideDraft {
  const vd = listing.vehicleData ?? {};
  const extras = listing.extras ?? {};
  const fuel = extras.fuel ?? {};
  const cleaning = extras.cleaning ?? {};
  const unlimitedKm = extras.unlimitedKm ?? {};
  const pickup = listing.pickupAddress || '';
  const parts = pickup.split(',').map((p) => p.trim()).filter(Boolean);
  const countryGuess =
    parts.length >= 2 ? parts[parts.length - 1] : '';

  const media = listing.photos ?? [];
  const videoEntry = media.find((p) => isListingVideo(p));
  const videoUri = videoEntry
    ? videoEntry.uri || videoEntry.url || null
    : null;
  const photoUrls = media
    .filter((p) => !isListingVideo(p))
    .map((p) => p.uri || p.url || '')
    .filter(Boolean);
  const photos: Array<File | string | null> = [
    null,
    null,
    null,
    null,
    null,
    null,
  ];
  photoUrls.forEach((url, i) => {
    if (i < photos.length) photos[i] = url;
    else photos.push(url);
  });

  const deliveryPrice = Number(listing.deliveryPrice) || 0;

  return {
    ...emptyListRideDraft(),
    pickupAddress: pickup,
    city: listing.city || '',
    country: countryGuess,
    latitude: listing.latitude ?? null,
    longitude: listing.longitude ?? null,
    vin: str(listing.vin || vd.vin),
    make: str(vd.make),
    model: str(vd.model),
    year: str(vd.year),
    vehicleType: listing.vehicleType || str(vd.vehicleType) || '',
    trim: str(vd.trim),
    color: str(vd.color),
    transmission: str(vd.transmission),
    fuelType: str(vd.fuelType),
    odometer: str(vd.odometer),
    licensePlate: str(listing.licensePlate),
    licenseProvince: str(listing.licenseProvince),
    neverHadSalvageTitle: vd.neverHadSalvageTitle !== false,
    vehicleData: { ...vd },
    advanceNotice: listing.instantBooking
      ? 'Instant booking'
      : str(extras.advanceNotice, '1 day'),
    shortestTrip: str(extras.shortestTrip, '1 day'),
    longestTrip: str(extras.longestTrip, '2 weeks'),
    dailyKm: listing.dailyKm || '200 km',
    pricePerDay: String(Math.round(Number(listing.pricePerDay) || 65)),
    weeklyDiscount: listing.weeklyDiscount || '10%',
    monthlyDiscount: listing.monthlyDiscount || '20%',
    kmOverageFee:
      typeof extras.kmOverageFee === 'number' ? extras.kmOverageFee : 0.25,
    deliveryEnabled: deliveryPrice > 0,
    deliveryPrice: String(deliveryPrice || 50),
    extrasUnlimitedKmOn: Boolean(unlimitedKm.enabled),
    extrasFuelOn: Boolean(fuel.enabled),
    extrasCleaningOn: Boolean(cleaning.enabled),
    extrasUnlimitedKmPrice: String(Number(unlimitedKm.price) || 150),
    extrasFuelPrice: String(Number(fuel.price) || 80),
    extrasCleaningPrice: String(Number(cleaning.price) || 50),
    description: listing.description || '',
    checkInInstructions: str(extras.checkInInstructions),
    checkOutInstructions: str(extras.checkOutInstructions),
    carFeatures: Array.isArray(listing.carFeatures)
      ? [...listing.carFeatures]
      : [],
    photos,
    video: videoUri,
    calendarData: apiRangesToCalendarData(listing.availability),
  };
}
