import type { ListingSummary } from '../api/listings';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function getTripBillingDays(start: Date | number, end: Date | number): number {
  const startMs = start instanceof Date ? start.getTime() : Number(start);
  const endMs = end instanceof Date ? end.getTime() : Number(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  return Math.max(1, Math.ceil(Math.abs(endMs - startMs) / MS_PER_DAY));
}

export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceKm(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  if (km < 1) return `${Math.max(0.1, Math.round(km * 10) / 10)} km`;
  if (km < 10) return `${Math.round(km * 10) / 10} km`;
  return `${Math.round(km)} km`;
}

type ListingForCard = ListingSummary & {
  carFeatures?: string[];
  vehicleData?: Record<string, unknown>;
  guestReviews?: unknown[];
  driveType?: string;
  seats?: number | string;
  weeklyDiscount?: string;
  monthlyDiscount?: string;
};

function formatVehicleType(listing: ListingForCard): string | null {
  const raw = String(listing.vehicleType || '').trim();
  if (!raw) return null;
  const upper = raw.toUpperCase().replace(/\s+/g, ' ');
  const map: Record<string, string> = {
    CARS: 'Car',
    CAR: 'Car',
    SEDAN: 'Sedan',
    SUVS: 'SUV',
    SUV: 'SUV',
    PICKUP: 'Pickup',
    '4DR PICKUP': 'Pickup',
    '2DR PICKUP': 'Pickup',
    'PICKUP TRUCK': 'Pickup',
    VAN: 'Van',
    'COMMERCIAL TRUCK': 'Truck',
    TRUCK: 'Truck',
    MOTORHOME: 'Motorhome',
    'MOPEDS AND MOTORCYCLES': 'Motorcycle',
    MOTORCYCLE: 'Motorcycle',
    BUSES: 'Bus',
    BUS: 'Bus',
  };
  if (map[upper]) return map[upper];
  if (/pickup/i.test(upper)) return 'Pickup';
  if (/\bsuv\b/i.test(upper)) return 'SUV';
  return raw
    .toLowerCase()
    .split(/[\s\n]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function driveLabel(listing: ListingForCard): string | null {
  const features = Array.isArray(listing.carFeatures) ? listing.carFeatures : [];
  if (features.includes('allWheelDrive')) return 'AWD';
  const drive = String(
    listing.vehicleData?.driveType || listing.driveType || '',
  ).trim();
  if (!drive) return null;
  if (/awd|all[\s-]?wheel|4x4|4wd|four[\s-]?wheel/i.test(drive)) {
    return /4wd|4x4|four/i.test(drive) && !/awd|all/i.test(drive) ? '4WD' : 'AWD';
  }
  if (/fwd|front[\s-]?wheel/i.test(drive)) return 'FWD';
  if (/rwd|rear[\s-]?wheel/i.test(drive)) return 'RWD';
  return null;
}

function seatsLabel(listing: ListingForCard): string | null {
  const vd = listing.vehicleData || {};
  const raw =
    vd.seats ??
    vd.passengerCapacity ??
    vd.seatingCapacity ??
    vd.numberOfSeats ??
    listing.seats;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) {
    const seats = Math.floor(n);
    return `${seats} seat${seats === 1 ? '' : 's'}`;
  }
  return null;
}

export function formatListingSpecsLine(listing: ListingForCard): string {
  return [formatVehicleType(listing), driveLabel(listing), seatsLabel(listing)]
    .filter(Boolean)
    .join(' · ');
}

export function isNewHostListing(listing: ListingForCard): boolean {
  const trips = Number(listing.hostTrips ?? 0);
  return !(Number.isFinite(trips) && trips > 0);
}

export function formatListingTrustLine(listing: ListingForCard): string | null {
  if (isNewHostListing(listing)) return null;
  const trips = Math.floor(Number(listing.hostTrips) || 0);
  const tripsLabel = trips === 1 ? '1 trip' : `${trips} trips`;
  const reviews = Array.isArray(listing.guestReviews) ? listing.guestReviews : [];
  if (reviews.length === 0) return tripsLabel;
  const rating = Number(listing.hostRating);
  if (Number.isFinite(rating) && rating > 0) {
    return `★ ${rating.toFixed(1)}  ·  ${tripsLabel}`;
  }
  return tripsLabel;
}

export function formatCardDateRange(start: Date | null, end: Date | null): string | null {
  if (!start || !end) return null;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const sm = MONTH_SHORT[start.getMonth()];
  const em = MONTH_SHORT[end.getMonth()];
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${sm} ${start.getDate()}–${end.getDate()}`;
  }
  return `${sm} ${start.getDate()}–${em} ${end.getDate()}`;
}

function parseDiscountPercent(raw: unknown): number {
  if (raw == null || raw === '') return 0;
  const n = Number(String(raw).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Estimated trip total: discounted daily subtotal + 10% trip fee (no extras). */
export function getListingTripSubtotal(
  listing: ListingForCard,
  start: Date | null,
  end: Date | null,
): number | null {
  if (!start || !end) return null;
  const days = getTripBillingDays(start, end);
  if (!days) return null;
  const price = Number(listing.pricePerDay);
  if (!Number.isFinite(price) || price < 0) return null;

  const base = price * days;
  const weeklyPct = parseDiscountPercent(listing.weeklyDiscount);
  const monthlyPct = parseDiscountPercent(listing.monthlyDiscount);
  const appliesMonthly = days >= 30 && monthlyPct > 0;
  const appliesWeekly = days >= 7 && weeklyPct > 0 && !appliesMonthly;
  const multiplier = appliesMonthly
    ? 1 - monthlyPct / 100
    : appliesWeekly
      ? 1 - weeklyPct / 100
      : 1;
  const discounted = Math.max(0, base * multiplier);
  const tripFee = discounted * 0.1;
  return Math.round(discounted + tripFee);
}

export function getListingDistanceFromOrigin(
  listing: ListingForCard,
  origin: { latitude: number; longitude: number } | null,
): number | null {
  if (!origin) return null;
  const lat = Number(listing.latitude);
  const lon = Number(listing.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return distanceKm(origin.latitude, origin.longitude, lat, lon);
}
