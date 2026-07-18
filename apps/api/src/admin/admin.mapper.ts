import { BookingEntity } from '../entities/booking.entity';
import { ListingEntity } from '../entities/listing.entity';
import { UserEntity } from '../entities/user.entity';
import { diditConsoleSessionUrl } from '../didit/didit.constants';

export function fullName(user: UserEntity | null | undefined): string {
  if (!user) return '';
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;
}

/** Human-readable license status for the legacy admin Verifications card. */
export function formatLicenseVerificationStatus(user: UserEntity): string {
  if (user.licenseVerified) return 'Verified';
  const raw = (user.licenseVerificationStatus || '').trim().toLowerCase();
  switch (raw) {
    case 'approved':
      return 'Verified';
    case 'in_progress':
      return 'In progress';
    case 'pending_review':
      return 'In review';
    case 'awaiting_user':
      return 'Awaiting user';
    case 'declined':
      return 'Declined';
    case 'resubmitted':
      return 'Resubmit required';
    case 'expired':
      return 'Expired';
    case 'not_started':
    case '':
      return 'Not verified';
    default:
      return user.licenseVerificationStatus || 'Not verified';
  }
}

export function toDashboardMember(user: UserEntity) {
  return {
    id: user.id,
    fullName: fullName(user),
    email: user.email,
    signUpDate: user.createdAt,
    isActive: user.isActive !== false,
    loginsCount: 0,
  };
}

export function toAdminProfile(user: UserEntity) {
  const settings = user.notificationSettings ?? {};
  const stripeCustomerPath = 'https://dashboard.stripe.com/customers/';
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: fullName(user),
    email: user.email,
    about: user.aboutBio ?? '',
    phoneNumber: user.phone ?? '',
    isPhoneVerified: !!user.phoneVerified,
    isEmailVerified: !!user.emailVerified,
    licenceVerificationStatus: formatLicenseVerificationStatus(user),
    isConnectAccountCreated: !!user.stripeConnectAccountId,
    stripeCustomerLink: user.stripeCustomerId
      ? `${stripeCustomerPath}${user.stripeCustomerId}`
      : '',
    // Legacy admin field name; now points at Didit Business Console.
    matiDashboardUrl: diditConsoleSessionUrl(user.diditSessionId),
    referralLink: user.referralCode ? `https://rentyourride.ca/r/${user.referralCode}` : '',
    avatar: user.avatarUrl ? { uri: user.avatarUrl } : null,
    role: user.role,
    isTextNotificationsTurnOn: settings.textNotif !== false,
    isEmailNotificationsTurnOn: settings.emailNotif !== false,
    isPushNotificationsTurnOn: settings.pushNotif !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    hasPassword: !!user.passwordHash,
    isBanned: user.isActive === false,
    driverLicenseDateOfBirth: '',
    driverLicenseAddress: null,
    address:
      user.addressLine || user.addressCity || user.addressCountry
        ? {
            line: user.addressLine ?? '',
            city: user.addressCity ?? '',
            country: user.addressCountry ?? '',
          }
        : null,
    receivedNotes: [],
  };
}

function parseBookingDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return new Date(Number(trimmed));
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export function toAdminBookingRow(booking: BookingEntity) {
  const snap = (booking.listingSnapshot ?? {}) as Record<string, unknown>;
  const pricing = (booking.pricing ?? {}) as Record<string, unknown>;
  const dates = (booking.bookingDates ?? {}) as Record<string, unknown>;
  const title = typeof snap.title === 'string' ? snap.title : 'Vehicle';
  const vehicleType = typeof snap.vehicleType === 'string' ? snap.vehicleType : '';
  const start = parseBookingDate(dates.start) ?? booking.createdAt;
  const end = parseBookingDate(dates.end) ?? start;

  return {
    id: booking.id,
    hostId: booking.hostUserId,
    hostFullName: fullName(booking.host),
    guestId: booking.guestUserId,
    guestFullName: fullName(booking.guest),
    vehicleInfo: vehicleType ? `${title} (${vehicleType})` : title,
    vehicleId: booking.listingId,
    requestTime: booking.createdAt,
    requestStart: start,
    requestEnd: end,
    subtotal: Number(pricing.total ?? pricing.subtotal ?? 0),
    tripFee: Number(pricing.tripFee ?? pricing.serviceFee ?? 0),
    hostEarnings: Number(pricing.hostEarnings ?? pricing.hostTotal ?? 0),
    deliveryFee: Number(pricing.deliveryFee ?? 0),
    prePaidCleaningPrice: 0,
    prePaidFuelPrice: 0,
    unlimitedKilometersPrice: 0,
  };
}

export function toAdminListingRow(listing: ListingEntity) {
  const vd = (listing.vehicleData ?? {}) as Record<string, unknown>;
  const make = typeof vd.make === 'string' ? vd.make : '';
  const model = typeof vd.model === 'string' ? vd.model : '';
  const year = vd.year != null ? String(vd.year) : '';
  const vehicleInfo =
    make || model || year
      ? `${make} ${model} ${year}`.trim()
      : listing.title;

  return {
    id: listing.id,
    userId: listing.hostUserId,
    userFullName: fullName(listing.host),
    vehicleInfo,
    uploadedTime: listing.createdAt,
    isVerified: listing.published,
    isActivated: listing.active,
  };
}

export function toLicenseVerificationRow(user: UserEntity) {
  return {
    id: user.id,
    fullName: fullName(user),
    matiDashboardUrl: diditConsoleSessionUrl(user.diditSessionId),
    uploadDate: user.updatedAt,
  };
}

export function toUserListingRow(listing: ListingEntity) {
  const vd = (listing.vehicleData ?? {}) as Record<string, unknown>;
  const make = typeof vd.make === 'string' ? vd.make : '';
  const model = typeof vd.model === 'string' ? vd.model : '';
  const year = vd.year != null ? String(vd.year) : '';
  const vehicleInfo =
    make || model || year
      ? `${make} ${model} ${year}`.trim()
      : listing.title;

  return {
    id: listing.id,
    vehicleInfo,
    uploadedTime: listing.createdAt,
    // Legacy member Listings tab labels this field Active / Not Active.
    isVerified: listing.active,
  };
}

export function toUserBookingRow(booking: BookingEntity) {
  const row = toAdminBookingRow(booking);
  return {
    ...row,
    // Legacy member profile Trips tab (`UserProfileBookingDTO`).
    requestedDate: row.requestStart,
    submissionDate: booking.createdAt,
  };
}

function parseDiscountNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const match = value.match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  }
  return 0;
}

function mapBookingExtras(raw: unknown[] | null | undefined) {
  if (!Array.isArray(raw)) return [];
  let id = 1;
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const name =
        (typeof row.label === 'string' && row.label) ||
        (typeof row.name === 'string' && row.name) ||
        (typeof row.key === 'string' && row.key) ||
        'Extra';
      const amount = row.amount ?? row.price ?? 0;
      return { id: id++, name, price: dollarsToCents(amount) };
    })
    .filter(Boolean) as Array<{ id: number; name: string; price: number }>;
}

function mapLifecyclePhotos(raw: unknown): Array<{ photo: string; createdAt: Date }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string' && item.trim()) {
        return { photo: item.trim(), createdAt: new Date() };
      }
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        const photo =
          (typeof row.photo === 'string' && row.photo) ||
          (typeof row.uri === 'string' && row.uri) ||
          (typeof row.url === 'string' && row.url) ||
          '';
        if (!photo) return null;
        const createdAt =
          row.createdAt != null ? new Date(row.createdAt as string | number) : new Date();
        return { photo, createdAt };
      }
      return null;
    })
    .filter(Boolean) as Array<{ photo: string; createdAt: Date }>;
}

function mapLifecycleRegistration(
  lifecycle: Record<string, unknown>,
  role: 'host' | 'guest',
  phase: 'checkIn' | 'checkOut',
) {
  const rolePrefix = role === 'host' ? 'host' : 'guest';
  const phaseKey = phase === 'checkIn' ? 'CheckIn' : 'Checkout';
  const photosKey = `${rolePrefix}${phaseKey}ConditionPhotos`;
  const notesKey = `${rolePrefix}${phaseKey}DamageNotes`;
  const fallbackNotesKey =
    role === 'host'
      ? phase === 'checkIn'
        ? 'hostRentalAgreementDamageNotes'
        : 'hostCheckoutDamageNotes'
      : phase === 'checkIn'
        ? 'rentalAgreementDamageNotes'
        : 'guestCheckoutDamageNotes';

  const damageNotes = String(lifecycle[notesKey] ?? lifecycle[fallbackNotesKey] ?? '').trim();
  const photos = mapLifecyclePhotos(
    lifecycle[photosKey] ??
      (phase === 'checkIn' ? lifecycle.conditionPhotosPre : lifecycle.conditionPhotosPost),
  );

  if (!damageNotes && !photos.length) return null;

  return {
    id: 1,
    role: role === 'host' ? 'host' : 'renter',
    damageNotes,
    conditionPhotos: photos,
  };
}

/** Legacy admin rental agreement / check-in (`BookinRegistrationDTO`). */
export function toAdminBookingRegistration(booking: BookingEntity) {
  const pricing = (booking.pricing ?? {}) as Record<string, unknown>;
  const dates = (booking.bookingDates ?? {}) as Record<string, unknown>;
  const lifecycle = (booking.lifecycle ?? {}) as Record<string, unknown>;
  const listing = booking.listing;
  const tripSubtotal = Number(pricing.subtotal ?? 0);
  const tripFee = Number(pricing.tripFee ?? pricing.serviceFee ?? 0);
  const grandTotal = Number(pricing.grandTotal ?? tripSubtotal + tripFee);
  const hostEarnings = Number(
    pricing.hostEarnings ?? pricing.hostTotal ?? Math.max(0, tripSubtotal),
  );
  const pricePerDay = Number(pricing.pricePerDay ?? listing?.pricePerDay ?? 0) || 0;
  const deliveryFee = booking.deliveryEnabled
    ? Number(listing?.deliveryPrice ?? pricing.selectedDeliveryFee ?? 0)
    : 0;
  const kmLimit = parseKmLimit(listing?.dailyKm) ?? 0;

  const registration = {
    id: booking.id,
    hostId: booking.hostUserId,
    hostFullName: fullName(booking.host),
    guestId: booking.guestUserId,
    guestFullName: fullName(booking.guest),
    requestedStartDate: parseBookingDate(dates.start) ?? booking.createdAt,
    requestedEndDate: parseBookingDate(dates.end) ?? booking.createdAt,
    introduceYourSelfMessage: booking.introMessage ?? '',
    tripFee: dollarsToCents(tripFee),
    deliveryFee: dollarsToCents(deliveryFee),
    hostEarnings: dollarsToCents(hostEarnings),
    kilometersIncludedPerDay: kmLimit,
    kilomitersPerDay: kmLimit,
    pricePerDay: dollarsToCents(pricePerDay),
    weeklyDiscount: parseDiscountNumber(listing?.weeklyDiscount),
    monthlyDiscount: parseDiscountNumber(listing?.monthlyDiscount),
    subtotal: dollarsToCents(grandTotal),
    extras: mapBookingExtras(booking.extras),
  };

  const hostCheckIn = mapLifecycleRegistration(lifecycle, 'host', 'checkIn');
  const guestCheckIn = mapLifecycleRegistration(lifecycle, 'guest', 'checkIn');
  const hostCheckOut = mapLifecycleRegistration(lifecycle, 'host', 'checkOut');
  const guestCheckOut = mapLifecycleRegistration(lifecycle, 'guest', 'checkOut');

  return {
    ...registration,
    ...(hostCheckIn ? { hostCheckIn } : {}),
    ...(guestCheckIn ? { guestCheckIn } : {}),
    ...(hostCheckOut ? { hostCheckOut } : {}),
    ...(guestCheckOut ? { guestCheckOut } : {}),
  };
}

export type BookingPhase =
  | 'requests'
  | 'active'
  | 'history'
  | 'canceled'
  | 'successfullyFinished';

function parseDays(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const match = value.match(/(\d+)/);
    if (match) return Number(match[1]);
  }
  return undefined;
}

function parseKmLimit(dailyKm: string | null | undefined): number | undefined {
  if (!dailyKm) return undefined;
  const match = String(dailyKm).match(/(\d+)/);
  return match ? Number(match[1]) : undefined;
}

function parseNoticeHours(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const lower = value.toLowerCase();
  if (lower.includes('instant')) return 0;
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : undefined;
}

function dollarsToCents(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Legacy admin UI appends its own `%` to discount fields. */
function stripPercentSuffix(value: unknown): string {
  if (value == null || value === '') return '';
  return String(value).replace(/%/g, '').trim();
}

function resolveImageUrl(uri: string | undefined): string {
  if (!uri) return '';
  if (/^https?:\/\//i.test(uri)) return uri;
  const base = (process.env.PUBLIC_BASE_URL || 'https://bedev.rentyourride.ca').replace(
    /\/$/,
    '',
  );
  return `${base}${uri.startsWith('/') ? '' : '/'}${uri}`;
}

function mapListingImages(photos: ListingEntity['photos']) {
  const list = Array.isArray(photos) ? photos : [];
  return list
    .map((photo, index) => {
      const uri = typeof photo?.uri === 'string' ? photo.uri : '';
      const imageUrl = resolveImageUrl(uri);
      if (!imageUrl) return null;
      return { id: index + 1, imageUrl };
    })
    .filter(Boolean) as Array<{ id: number; imageUrl: string }>;
}

function mapCarFeatures(features: string[] | null | undefined) {
  if (!Array.isArray(features)) return [];
  return features
    .filter((name) => typeof name === 'string' && name.trim())
    .map((name) => ({ name }));
}

function mapExtrasForAdmin(extras: Record<string, unknown> | null | undefined) {
  if (!extras || typeof extras !== 'object') return [];
  const rows: Array<{ id: number; name: string; price: number }> = [];
  let id = 1;
  const push = (name: string, raw: unknown, enabled?: boolean) => {
    if (enabled === false) return;
    const price =
      raw && typeof raw === 'object' && 'price' in (raw as object)
        ? (raw as { price?: unknown }).price
        : raw;
    rows.push({ id: id++, name, price: dollarsToCents(price) });
  };
  push('PrePaidFuel', extras.fuel, (extras.fuel as { enabled?: boolean })?.enabled);
  push('PrePaidCleaning', extras.cleaning, (extras.cleaning as { enabled?: boolean })?.enabled);
  push(
    'UnlimitedKilometers',
    extras.unlimitedKm,
    (extras.unlimitedKm as { enabled?: boolean })?.enabled,
  );
  return rows;
}

function toAdminHostDto(host: UserEntity | null | undefined) {
  if (!host) return null;
  return {
    id: host.id,
    firstName: host.firstName,
    lastName: host.lastName,
    fullName: fullName(host),
    email: host.email,
    about: host.aboutBio ?? '',
    phoneNumber: host.phone ?? '',
    isPhoneVerified: !!host.phoneVerified,
    isEmailVerified: !!host.emailVerified,
    createdAt: host.createdAt,
    updatedAt: host.updatedAt,
    avatar: host.avatarUrl ? { imageUrl: host.avatarUrl } : null,
    address:
      host.addressLine || host.addressCity || host.addressCountry
        ? {
            country: host.addressCountry ?? '',
            city: host.addressCity ?? '',
            address: host.addressLine ?? '',
          }
        : null,
    driverLicenseAddress: null,
  };
}

/** Legacy admin car detail (`GET /v1/admin/rides/:id`) shape. */
export function toAdminRideDetail(listing: ListingEntity) {
  const vd = (listing.vehicleData ?? {}) as Record<string, unknown>;
  const extras = (listing.extras ?? {}) as Record<string, unknown>;
  const images = mapListingImages(listing.photos);
  const coverImage = images[0] ?? null;

  return {
    id: listing.id,
    make: typeof vd.make === 'string' ? vd.make : '',
    model: typeof vd.model === 'string' ? vd.model : '',
    year: vd.year != null ? Number(vd.year) : undefined,
    trim: typeof vd.trim === 'string' ? vd.trim : '',
    style: typeof vd.style === 'string' ? vd.style : '',
    color: typeof vd.color === 'string' ? vd.color : '',
    VIN: typeof vd.vin === 'string' ? vd.vin : listing.vin ?? '',
    description: listing.description ?? '',
    vehicleType: listing.vehicleType,
    transmissionType:
      typeof vd.transmission === 'string'
        ? vd.transmission
        : typeof vd.transmissionType === 'string'
          ? vd.transmissionType
          : '',
    fuelType: typeof vd.fuelType === 'string' ? vd.fuelType : '',
    odometer:
      typeof vd.odometerReading === 'string'
        ? vd.odometerReading
        : typeof vd.odometer === 'string'
          ? vd.odometer
          : '',
    licensePlateNumber: listing.licensePlate ?? '',
    licensePlateState: listing.licenseProvince ?? '',
    isSalvageTitleExists: vd.salvageTitle === true,
    isDeliveryIncluded: listing.deliveryPrice != null && Number(listing.deliveryPrice) > 0,
    isActivated: listing.active,
    isVerified: listing.published,
    isDeleted: false,
    dailyPrice: dollarsToCents(listing.pricePerDay),
    deliveryPrice: dollarsToCents(listing.deliveryPrice ?? 0),
    pricePerKilometerOverLimit: dollarsToCents(extras.kmOverageFee ?? 0),
    weeklyDiscount: stripPercentSuffix(listing.weeklyDiscount),
    monthlyDiscount: stripPercentSuffix(listing.monthlyDiscount),
    shortestPossibleTrip: parseDays(extras.shortestTrip),
    longestPossibleTrip: parseDays(extras.longestTrip),
    kilometersLimit: parseKmLimit(listing.dailyKm),
    notionPeriodHours: parseNoticeHours(extras.advanceNotice),
    address: {
      country: listing.city ? 'Canada' : '',
      city: listing.city ?? '',
      address: listing.pickupAddress ?? '',
      latitude: listing.latitude ?? undefined,
      longitude: listing.longitude ?? undefined,
    },
    images,
    coverImage,
    carFeatures: mapCarFeatures(listing.carFeatures),
    extras: mapExtrasForAdmin(extras),
    host: toAdminHostDto(listing.host),
    bookings: [],
    reviews: [],
    availability: listing.availability ?? [],
  };
}

export function statusesForPhase(phase: BookingPhase): string[] {
  switch (phase) {
    case 'requests':
      return ['pending_host'];
    case 'active':
      return ['confirmed', 'checkin_pending', 'active', 'checkout_pending'];
    case 'successfullyFinished':
      return ['completed'];
    case 'history':
      return ['declined', 'cancelled'];
    case 'canceled':
      return ['cancelled'];
    default:
      return [];
  }
}
