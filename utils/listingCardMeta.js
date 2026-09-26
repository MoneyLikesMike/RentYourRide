import { getListingTripCount, getListingDisplayRating, listingHasGuestReviews } from './listingRating';
import { getTripBillingDays } from './rentalTripDays';
import { formatDistanceKm, distanceKm } from './homeDiscovery';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Title-case vehicle type for cards (SUVS → SUV, CARS → Car). */
export function formatListingVehicleType(listing) {
  const raw = String(listing?.vehicleType || '').trim();
  if (!raw) return null;
  const upper = raw.toUpperCase().replace(/\s+/g, ' ');
  const map = {
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

function driveLabel(listing) {
  const features = Array.isArray(listing?.carFeatures) ? listing.carFeatures : [];
  if (features.includes('allWheelDrive')) return 'AWD';
  const drive = String(listing?.vehicleData?.driveType || listing?.driveType || '').trim();
  if (!drive) return null;
  if (/awd|all[\s-]?wheel|4x4|4wd|four[\s-]?wheel/i.test(drive)) {
    return /4wd|4x4|four/i.test(drive) && !/awd|all/i.test(drive) ? '4WD' : 'AWD';
  }
  if (/fwd|front[\s-]?wheel/i.test(drive)) return 'FWD';
  if (/rwd|rear[\s-]?wheel/i.test(drive)) return 'RWD';
  return null;
}

function seatsLabel(listing) {
  const vd = listing?.vehicleData || {};
  const raw =
    vd.seats ??
    vd.passengerCapacity ??
    vd.seatingCapacity ??
    vd.numberOfSeats ??
    listing?.seats;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) {
    return `${Math.floor(n)} seat${Math.floor(n) === 1 ? '' : 's'}`;
  }
  return null;
}

/** e.g. "SUV · AWD · 5 seats" — omits unknown parts. */
export function formatListingSpecsLine(listing) {
  return [formatListingVehicleType(listing), driveLabel(listing), seatsLabel(listing)]
    .filter(Boolean)
    .join(' · ');
}

export function isNewHostListing(listing) {
  return getListingTripCount(listing) === 0;
}

/** Compact trust line: rating + trips, or null when new host (badge used instead). */
export function formatListingTrustLine(listing) {
  if (isNewHostListing(listing)) return null;
  const trips = getListingTripCount(listing);
  const tripsLabel = trips === 1 ? '1 trip' : `${trips} trips`;
  if (listingHasGuestReviews(listing)) {
    const rating = getListingDisplayRating(listing);
    if (rating != null) {
      return `★ ${Number(rating).toFixed(1)}  ·  ${tripsLabel}`;
    }
  }
  return tripsLabel;
}

/** Card date range: "Sep 9–15" or "Sep 9–Oct 2". */
export function formatCardDateRange(bookingDates) {
  if (bookingDates?.start == null || bookingDates?.end == null) return null;
  const start = new Date(bookingDates.start);
  const end = new Date(bookingDates.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const sm = MONTH_SHORT[start.getMonth()];
  const em = MONTH_SHORT[end.getMonth()];
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${sm} ${start.getDate()}–${end.getDate()}`;
  }
  return `${sm} ${start.getDate()}–${em} ${end.getDate()}`;
}

function parseDiscountPercent(raw) {
  if (raw == null || raw === '') return 0;
  const n = Number(String(raw).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Estimated trip total for search cards: discounted daily subtotal + 10% trip fee.
 * Excludes optional extras (fuel/clean/unlimited km/delivery).
 */
export function getListingTripSubtotal(listing, bookingDates) {
  if (!bookingDates?.start || !bookingDates?.end) return null;
  const days = getTripBillingDays(bookingDates.start, bookingDates.end);
  if (!days) return null;
  const price = Number(listing?.pricePerDay);
  if (!Number.isFinite(price) || price < 0) return null;

  const base = price * days;
  const weeklyPct = parseDiscountPercent(listing?.weeklyDiscount);
  const monthlyPct = parseDiscountPercent(listing?.monthlyDiscount);
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

export function getListingDistanceFromOrigin(listing, origin) {
  if (!origin || !Number.isFinite(origin.latitude) || !Number.isFinite(origin.longitude)) {
    return null;
  }
  const lat = Number(listing?.latitude);
  const lon = Number(listing?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return distanceKm(origin.latitude, origin.longitude, lat, lon);
}

export { formatDistanceKm };
