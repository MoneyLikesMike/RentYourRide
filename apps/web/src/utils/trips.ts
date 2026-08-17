import type { BookingDto } from '../api/bookings';
import { ACTIVE_BOOKING_STATUSES } from '../api/bookings';

export function filterBookingsForGuest(
  bookings: BookingDto[],
  authUserId?: string | null,
): BookingDto[] {
  return (bookings || []).filter((b) => {
    if (!authUserId) return true;
    if (b.hostUserId && String(b.hostUserId) === String(authUserId)) {
      return false;
    }
    if (b.guestUserId) {
      return String(b.guestUserId) === String(authUserId);
    }
    return true;
  });
}

export function filterBookingsForHost(
  bookings: BookingDto[],
  authUserId?: string | null,
): BookingDto[] {
  return (bookings || []).filter((b) => {
    if (!authUserId) return true;
    if (b.guestUserId && String(b.guestUserId) === String(authUserId)) {
      return false;
    }
    if (b.hostUserId) {
      return String(b.hostUserId) === String(authUserId);
    }
    return false;
  });
}

export function isTripFullyCheckedOut(booking: BookingDto): boolean {
  if (booking?.status === 'completed') return true;
  return (
    booking?.guestCheckedOutAt != null &&
    booking?.hostCheckoutTripEndedAt != null
  );
}

export function hasPartyCheckedOut(
  booking: BookingDto,
  isHost: boolean,
): boolean {
  if (booking?.status === 'completed') return true;
  if (isHost) return booking?.hostCheckoutTripEndedAt != null;
  return booking?.guestCheckedOutAt != null;
}

export function filterActiveForPerspective(
  bookings: BookingDto[],
  isHost: boolean,
): BookingDto[] {
  return (bookings || []).filter((b) => !hasPartyCheckedOut(b, isHost));
}

export function isHistoryForPerspective(
  booking: BookingDto,
  isHost: boolean,
): boolean {
  if (!booking) return false;
  if (booking.status === 'completed') return true;
  return hasPartyCheckedOut(booking, isHost);
}

export function splitBookingBuckets(all: BookingDto[]) {
  const pending = all.filter((b) => b.status === 'pending_host');
  const active = all.filter((b) => ACTIVE_BOOKING_STATUSES.has(b.status));
  return { pending, active };
}

const H24_MS = 24 * 60 * 60 * 1000;

export function getTripBoundsMs(
  booking: BookingDto,
): { startMs: number; endMs: number } | null {
  const bd = booking?.bookingDates || {};
  const start = bd.start != null ? new Date(bd.start) : null;
  const end = bd.end != null ? new Date(bd.end) : null;
  if (
    !start ||
    !end ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return null;
  }
  return { startMs: start.getTime(), endMs: end.getTime() };
}

export function getTripCardStatus(
  booking: BookingDto,
  nowMs = Date.now(),
): { key: string; label: string } {
  const bounds = getTripBoundsMs(booking);
  if (!bounds) return { key: 'unknown', label: '' };

  const { startMs, endMs } = bounds;
  const ext =
    booking?.tripExtended === true && booking?.extensionApprovedByHost === true;
  if (ext || booking?.status === 'extended') {
    return { key: 'extended', label: 'Extended' };
  }
  if (booking?.status === 'extension_pending') {
    return { key: 'extension_pending', label: 'Extension pending' };
  }
  if (booking?.status === 'completed' || nowMs >= endMs + H24_MS) {
    return { key: 'completed', label: '' };
  }
  if (nowMs >= endMs - H24_MS) {
    return { key: 'ending_soon', label: 'Ending soon' };
  }
  if (
    booking?.guestTripStartedAt != null ||
    booking?.hostTripStartedAt != null
  ) {
    return { key: 'in_progress', label: 'In progress' };
  }
  if (nowMs >= startMs - H24_MS && nowMs < startMs) {
    return { key: 'beginning_soon', label: 'Beginning soon' };
  }
  if (nowMs >= startMs && nowMs < endMs - H24_MS) {
    return { key: 'in_progress', label: 'In progress' };
  }
  if (nowMs < startMs - H24_MS) {
    return { key: 'scheduled', label: '' };
  }
  return { key: 'unknown', label: '' };
}

function hasCheckedIn(booking: BookingDto, isHost: boolean): boolean {
  if (isHost) {
    return (
      booking?.hostCheckedInAt != null || booking?.hostTripStartedAt != null
    );
  }
  return (
    booking?.guestCheckedInAt != null ||
    booking?.rentalAgreementSignedAt != null ||
    booking?.guestTripStartedAt != null
  );
}

export function getTripCardPrimaryAction(
  statusKey: string,
  opts: { isHost: boolean; booking: BookingDto },
): { type: 'check_in' | 'checkout' | 'extend' | null } {
  const { isHost, booking } = opts;
  if (statusKey === 'extended' || statusKey === 'extension_pending') {
    return { type: null };
  }
  if (statusKey === 'completed' || hasPartyCheckedOut(booking, isHost)) {
    return { type: null };
  }
  if (statusKey === 'ending_soon') {
    return { type: 'checkout' };
  }
  if (statusKey === 'beginning_soon' || statusKey === 'in_progress') {
    if (!hasCheckedIn(booking, isHost)) {
      return { type: 'check_in' };
    }
    if (statusKey === 'in_progress' && !isHost) {
      return { type: 'extend' };
    }
    return { type: null };
  }
  return { type: null };
}

export function listingTitle(booking: BookingDto): string {
  return booking.listingSnapshot?.title || 'Trip';
}

export function formatTripDates(booking: BookingDto): string {
  const bounds = getTripBoundsMs(booking);
  if (!bounds) return 'Dates TBD';
  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  return `${fmt(bounds.startMs)} – ${fmt(bounds.endMs)}`;
}

export function statusLabel(status: string): string {
  return String(status || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isHostForBooking(
  booking: BookingDto,
  authUserId?: string | null,
): boolean {
  if (!authUserId || !booking.hostUserId) return false;
  return String(booking.hostUserId) === String(authUserId);
}

export function coverUri(booking: BookingDto): string | null {
  const snap = booking.listingSnapshot;
  if (!snap) return null;
  if (typeof snap.coverUri === 'string' && snap.coverUri) return snap.coverUri;
  const photo = snap.photos?.[0];
  const uri = photo?.uri || photo?.url;
  return typeof uri === 'string' ? uri : null;
}
