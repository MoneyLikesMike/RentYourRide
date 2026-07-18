import { BookingEntity } from '../entities/booking.entity';
import { ListingEntity } from '../entities/listing.entity';
import { UserEntity } from '../entities/user.entity';

const DEFAULT_TZ = 'America/Winnipeg';

function possessiveFirstName(firstName: string): string {
  const trimmed = firstName.trim();
  if (!trimmed) return "Host's";
  return /s$/i.test(trimmed) ? `${trimmed}'` : `${trimmed}'s`;
}

/** Matches mobile checkout: `JUN 10, 2020 - 12:00 AM` */
export function formatBookingDateTimeLabel(ms: number, tz = DEFAULT_TZ): string {
  const d = new Date(ms);
  const month = new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'short' })
    .format(d)
    .toUpperCase()
    .replace(/\./g, '');
  const day = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, day: 'numeric' }).format(d),
  );
  const year = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
  return `${month} ${day}, ${year} - ${time}`;
}

function vehicleLabelFromSnapshot(snapshot: Record<string, unknown>): string {
  const vd = (snapshot.vehicleData ?? {}) as Record<string, unknown>;
  const year = snapshot.year ?? vd.year;
  const make = snapshot.make ?? vd.make;
  const model = snapshot.model ?? vd.model;
  const parts = [
    year != null && String(year).trim() ? String(year).trim() : '',
    typeof make === 'string' ? make.trim() : '',
    typeof model === 'string' ? model.trim() : '',
  ].filter(Boolean);
  if (parts.length) return parts.join(' ');
  const title = typeof snapshot.title === 'string' ? snapshot.title.trim() : '';
  return title || 'Vehicle';
}

function hostFirstName(host?: UserEntity | null, snapshot?: Record<string, unknown>): string {
  const fromUser = host?.firstName?.trim();
  if (fromUser) return fromUser;
  const hostName = typeof snapshot?.hostName === 'string' ? snapshot.hostName.trim() : '';
  if (!hostName) return 'Host';
  return hostName.split(/\s+/)[0] || 'Host';
}

/**
 * Stripe charge description for a rental booking.
 * Example: Rental of Michael's 2020 Toyota Camry JUN 10, 2020 - 12:00 AM - JUN 12, 2020 - 9:00 PM
 */
export function formatRentalStripeDescription(opts: {
  host?: UserEntity | null;
  listing?: ListingEntity | null;
  listingSnapshot?: Record<string, unknown> | null;
  bookingDates?: { start?: number; end?: number };
  tz?: string;
}): string {
  const snapshot =
    (opts.listingSnapshot as Record<string, unknown> | undefined) ??
    (opts.listing ? (opts.listing.toDetailDto(opts.host ?? opts.listing.host) as Record<string, unknown>) : {});
  const dates = opts.bookingDates ?? {};
  const startMs = Number(dates.start);
  const endMs = Number(dates.end);
  const tz = opts.tz ?? DEFAULT_TZ;

  const owner = possessiveFirstName(hostFirstName(opts.host ?? opts.listing?.host, snapshot));
  const vehicle = vehicleLabelFromSnapshot(snapshot);

  if (Number.isFinite(startMs) && Number.isFinite(endMs)) {
    const startLabel = formatBookingDateTimeLabel(startMs, tz);
    const endLabel = formatBookingDateTimeLabel(endMs, tz);
    return `Rental of ${owner} ${vehicle} ${startLabel} - ${endLabel}`;
  }

  return `Rental of ${owner} ${vehicle}`;
}

export function formatRentalStripeDescriptionFromBooking(
  booking: BookingEntity,
  host?: UserEntity | null,
): string {
  return formatRentalStripeDescription({
    host: host ?? booking.host,
    listingSnapshot: (booking.listingSnapshot ?? {}) as Record<string, unknown>,
    bookingDates: booking.bookingDates as { start?: number; end?: number },
  });
}
