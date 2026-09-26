/**
 * Booking listingSnapshot access control (RYRA-428).
 *
 * Snapshots may store operational fields for host/admin/notifications.
 * Guests only receive host contact after the booking is confirmed, and
 * plate/VIN/check-in instructions within 24h of pickup (or during the trip).
 */

import { BookingStatus } from '../entities/booking.entity';

const MS_PER_HOUR = 60 * 60 * 1000;
const PLATE_VIN_WINDOW_MS = 24 * MS_PER_HOUR;

const HOST_CONTACT_STATUSES: ReadonlySet<BookingStatus> = new Set([
  'confirmed',
  'checkin_pending',
  'active',
  'checkout_pending',
  'completed',
]);

const TRIP_LIVE_STATUSES: ReadonlySet<BookingStatus> = new Set([
  'checkin_pending',
  'active',
  'checkout_pending',
]);

export type SnapshotAccess = {
  /** Host email / phone */
  hostContact: boolean;
  /** Plate, province, VIN, check-in/out instructions */
  vehicleIdentifiers: boolean;
};

export function bookingSnapshotAccess(opts: {
  viewerIsHost: boolean;
  status: BookingStatus;
  tripStartMs?: number | null;
  nowMs?: number;
}): SnapshotAccess {
  if (opts.viewerIsHost) {
    return { hostContact: true, vehicleIdentifiers: true };
  }

  const hostContact = HOST_CONTACT_STATUSES.has(opts.status);
  if (TRIP_LIVE_STATUSES.has(opts.status)) {
    return { hostContact, vehicleIdentifiers: true };
  }

  const now = opts.nowMs ?? Date.now();
  const start = Number(opts.tripStartMs);
  const withinWindow =
    Number.isFinite(start) &&
    start - now <= PLATE_VIN_WINDOW_MS &&
    // Still allow during / shortly after start while status is confirmed.
    now <= start + PLATE_VIN_WINDOW_MS;

  const vehicleIdentifiers =
    opts.status === 'confirmed' && withinWindow;

  return { hostContact, vehicleIdentifiers };
}

const CONTACT_KEYS = new Set(['hostEmail', 'hostPhone', 'email', 'phone']);
const IDENTIFIER_KEYS = new Set([
  'vin',
  'VIN',
  'licensePlate',
  'licenseProvince',
  'checkInInstructions',
  'checkOutInstructions',
]);

function scrubObject(
  source: Record<string, unknown>,
  access: SnapshotAccess,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!access.hostContact && CONTACT_KEYS.has(key)) continue;
    if (!access.vehicleIdentifiers && IDENTIFIER_KEYS.has(key)) continue;

    if (key === 'vehicleData' && value && typeof value === 'object' && !Array.isArray(value)) {
      const vd = { ...(value as Record<string, unknown>) };
      if (!access.vehicleIdentifiers) {
        delete vd.vin;
        delete vd.VIN;
      }
      out[key] = vd;
      continue;
    }

    if (key === 'extras' && value && typeof value === 'object' && !Array.isArray(value)) {
      const extras = { ...(value as Record<string, unknown>) };
      if (!access.vehicleIdentifiers) {
        delete extras.checkInInstructions;
        delete extras.checkOutInstructions;
      }
      out[key] = extras;
      continue;
    }

    out[key] = value;
  }
  return out;
}

/**
 * Return a listingSnapshot safe for the given viewer. Hosts always see
 * everything; guests see contact / identifiers per bookingSnapshotAccess.
 */
export function redactListingSnapshotForViewer(
  snapshot: Record<string, unknown> | null | undefined,
  access: SnapshotAccess,
): Record<string, unknown> {
  if (!snapshot || typeof snapshot !== 'object') return {};
  if (access.hostContact && access.vehicleIdentifiers) {
    return { ...snapshot };
  }
  return scrubObject(snapshot, access);
}
