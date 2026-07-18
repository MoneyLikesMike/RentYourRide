import { apiFetch } from './http';
import type { ListingDetail, ListingExtras } from './listings';

export type HostListingBody = {
  city?: string;
  title?: string;
  description?: string;
  vehicleType?: string;
  photos?: Array<{ uri?: string; url?: string }>;
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

export async function uploadHostListingPhoto(
  id: string,
  file: File,
): Promise<{ uri: string; listing: ListingDetail }> {
  const form = new FormData();
  form.append('file', file);
  return apiFetch(`v1/host/listings/${encodeURIComponent(id)}/photos`, {
    method: 'POST',
    body: form,
  });
}

export async function decodeVin(vin: string): Promise<VinDecodeResult> {
  return apiFetch<VinDecodeResult>(
    `v1/listings/vin/${encodeURIComponent(vin.trim())}/decode`,
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
  color: string;
  transmission: string;
  fuelType: string;
  odometer: string;
  licensePlate: string;
  licenseProvince: string;
  vehicleData: Record<string, unknown> | null;
  advanceNotice: string;
  shortestTrip: string;
  longestTrip: string;
  dailyKm: string;
  pricePerDay: string;
  weeklyDiscount: string;
  monthlyDiscount: string;
  deliveryEnabled: boolean;
  deliveryPrice: string;
  extrasUnlimitedKmOn: boolean;
  extrasFuelOn: boolean;
  extrasCleaningOn: boolean;
  extrasUnlimitedKmPrice: string;
  extrasFuelPrice: string;
  extrasCleaningPrice: string;
  description: string;
  carFeatures: string[];
  photos: File[];
};

export function emptyListRideDraft(): ListRideDraft {
  return {
    pickupAddress: '',
    city: '',
    country: 'Canada',
    latitude: null,
    longitude: null,
    vin: '',
    make: '',
    model: '',
    year: '',
    vehicleType: 'Car',
    color: '',
    transmission: 'Automatic',
    fuelType: 'Gasoline',
    odometer: '',
    licensePlate: '',
    licenseProvince: '',
    vehicleData: null,
    advanceNotice: '1 day',
    shortestTrip: '1 day',
    longestTrip: '2 weeks',
    dailyKm: '200 km/day',
    pricePerDay: '65',
    weeklyDiscount: '10%',
    monthlyDiscount: '20%',
    deliveryEnabled: false,
    deliveryPrice: '50',
    extrasUnlimitedKmOn: false,
    extrasFuelOn: false,
    extrasCleaningOn: false,
    extrasUnlimitedKmPrice: '150',
    extrasFuelPrice: '80',
    extrasCleaningPrice: '50',
    description: '',
    carFeatures: [],
    photos: [],
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
      vin: draft.vin.trim(),
    },
  };
}
