/**
 * Public listing projection (RYRA-428).
 *
 * Unauthenticated browse/search must never expose host contact, plate, VIN,
 * or check-in instructions. This is an explicit allowlist — never strip from
 * toDetailDto and hope for the best.
 *
 * Keep in sync with apps/web ListingDetail browse usage and mobile
 * VehicleDetailScreen / search cards.
 */

import { sanitizeHostBioForDisplay } from '../common/host-bio-display';
import { honestHostRating } from '../common/listing-rating';
import { ListingEntity } from '../entities/listing.entity';
import { UserEntity } from '../entities/user.entity';

/** Nested vehicleData keys safe for public browse. */
export const PUBLIC_VEHICLE_DATA_KEYS = [
  'make',
  'model',
  'year',
  'trim',
  'style',
  'bodyClass',
  'bodyType',
  'color',
  'colour',
  'transmission',
  'transmissionType',
  'fuelType',
  'fuel',
  'driveType',
  'doors',
  'seats',
  'odometer',
  'odometerReading',
  'salvageTitle',
] as const;

/** Nested extras keys safe for public browse (no check-in/out instructions). */
export const PUBLIC_EXTRAS_KEYS = [
  'fuel',
  'cleaning',
  'unlimitedKm',
  'advanceNotice',
  'shortestTrip',
  'longestTrip',
  'kmOverageFee',
] as const;

function pickAllowlisted(
  source: Record<string, unknown> | null | undefined,
  keys: readonly string[],
): Record<string, unknown> | undefined {
  if (!source || typeof source !== 'object') return undefined;
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      out[key] = source[key];
    }
  }
  return Object.keys(out).length ? out : undefined;
}

/** "Alex M." — enough for trust, not enough for outbound spam lists. */
export function publicHostDisplayName(host?: UserEntity | null): string {
  if (!host) return 'Host';
  const first = (host.firstName || '').trim();
  const last = (host.lastName || '').trim();
  if (first && last) return `${first} ${last.charAt(0).toUpperCase()}.`;
  return first || last || 'Host';
}

export type PublicListingDto = {
  id: string;
  city: string;
  title: string;
  description: string;
  vehicleType: string;
  photos: unknown[];
  pricePerDay: number;
  weeklyDiscount: string;
  monthlyDiscount: string;
  deliveryPrice: number;
  dailyKm: string;
  instantBooking: boolean;
  latitude?: number;
  longitude?: number;
  pickupAddress: string;
  carFeatures: unknown[];
  extras: Record<string, unknown>;
  availability: unknown[];
  hostName: string;
  hostTrips: number;
  hostRating: number;
  guestReviews: unknown[];
  hostPhotoUri?: string;
  hostJoinedYear?: number;
  hostBio: string;
  vehicleData?: Record<string, unknown>;
};

/**
 * Build a public listing payload from the entity. Does not include
 * hostEmail, hostPhone, hostUserId, vin, licensePlate, licenseProvince, or
 * check-in instructions. hostUserId is the raw user UUID and would let
 * scrapers link one host across listings. Call withApproximateLocation at the public HTTP boundary.
 */
export function toPublicListingDto(listing: ListingEntity): PublicListingDto {
  const h = listing.host;
  const vehicleData = pickAllowlisted(
    listing.vehicleData as Record<string, unknown> | null,
    PUBLIC_VEHICLE_DATA_KEYS,
  );
  const extras =
    pickAllowlisted(
      listing.extras as Record<string, unknown> | null,
      PUBLIC_EXTRAS_KEYS,
    ) ?? {};

  return {
    id: listing.id,
    city: listing.city,
    title: listing.title,
    description: listing.description ?? '',
    vehicleType: listing.vehicleType,
    photos: listing.photos ?? [],
    pricePerDay: Number(listing.pricePerDay),
    weeklyDiscount: listing.weeklyDiscount ?? '',
    monthlyDiscount: listing.monthlyDiscount ?? '',
    deliveryPrice:
      listing.deliveryPrice != null ? Number(listing.deliveryPrice) : 0,
    dailyKm: listing.dailyKm ?? '200 km/day',
    instantBooking: listing.instantBooking,
    latitude: listing.latitude ?? undefined,
    longitude: listing.longitude ?? undefined,
    pickupAddress: listing.pickupAddress,
    carFeatures: listing.carFeatures ?? [],
    extras,
    availability: listing.availability ?? [],
    hostName: publicHostDisplayName(h),
    hostTrips: listing.hostTrips,
    hostRating: honestHostRating(listing.guestReviews),
    guestReviews: listing.guestReviews ?? [],
    hostPhotoUri: h?.avatarUrl ?? undefined,
    hostJoinedYear: h?.createdAt ? h.createdAt.getFullYear() : undefined,
    hostBio: sanitizeHostBioForDisplay(h?.aboutBio),
    vehicleData,
  };
}

/** Keys that must never appear in a public listing JSON response. */
export const PUBLIC_LISTING_FORBIDDEN_KEYS = [
  'hostEmail',
  'hostPhone',
  'hostUserId',
  'email',
  'phone',
  'licensePlate',
  'licenseProvince',
  'vin',
  'checkInInstructions',
  'checkOutInstructions',
] as const;

/**
 * Recursively collect every object key in a JSON value (for leak tests).
 */
export function collectJsonKeys(
  value: unknown,
  into: Set<string> = new Set(),
): Set<string> {
  if (value == null) return into;
  if (Array.isArray(value)) {
    for (const item of value) collectJsonKeys(item, into);
    return into;
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      into.add(k);
      collectJsonKeys(v, into);
    }
  }
  return into;
}

export function assertNoForbiddenPublicListingKeys(payload: unknown): string[] {
  const keys = collectJsonKeys(payload);
  return PUBLIC_LISTING_FORBIDDEN_KEYS.filter((k) => keys.has(k));
}
