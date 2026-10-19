/**
 * Unit tests for admin booking registration avatar DTOs (RYRA-490).
 * Run: npx tsx --test src/admin/admin.mapper.spec.ts
 * (from apps/api)
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BookingEntity } from '../entities/booking.entity';
import { ListingEntity } from '../entities/listing.entity';
import { UserEntity } from '../entities/user.entity';
import { toAdminBookingRegistration } from './admin.mapper';

function makeBooking(opts: {
  hostAvatarUrl?: string | null;
  guestAvatarUrl?: string | null;
}): BookingEntity {
  const host = new UserEntity();
  host.id = 'host-1';
  host.firstName = 'Host';
  host.lastName = 'One';
  host.email = 'host@example.com';
  host.avatarUrl = opts.hostAvatarUrl ?? null;

  const guest = new UserEntity();
  guest.id = 'guest-1';
  guest.firstName = 'Guest';
  guest.lastName = 'One';
  guest.email = 'guest@example.com';
  guest.avatarUrl = opts.guestAvatarUrl ?? null;

  const listing = new ListingEntity();
  listing.pricePerDay = 100 as unknown as ListingEntity['pricePerDay'];
  listing.dailyKm = '200 km/day';

  const booking = new BookingEntity();
  booking.id = 'booking-1';
  booking.hostUserId = host.id;
  booking.guestUserId = guest.id;
  booking.host = host;
  booking.guest = guest;
  booking.listing = listing;
  booking.pricing = {
    subtotal: 100,
    tripFee: 10,
    grandTotal: 110,
    pricePerDay: 100,
    tripDays: 1,
  };
  booking.bookingDates = { start: Date.now(), end: Date.now() + 86_400_000 };
  booking.lifecycle = {};
  booking.deliveryEnabled = false;
  booking.createdAt = new Date('2024-01-01T00:00:00.000Z');
  return booking;
}

describe('toAdminBookingRegistration avatars', () => {
  it('maps hostAvatar and guestAvatar from loaded host/guest relations', () => {
    const dto = toAdminBookingRegistration(
      makeBooking({
        hostAvatarUrl: 'https://cdn.example/host.jpg',
        guestAvatarUrl: '/uploads/avatars/guest.jpg',
      }),
    );

    assert.deepEqual(dto.hostAvatar, { imageUrl: 'https://cdn.example/host.jpg' });
    assert.ok(dto.guestAvatar);
    assert.match(dto.guestAvatar!.imageUrl, /\/uploads\/avatars\/guest\.jpg$/);
  });

  it('returns null hostAvatar/guestAvatar when avatarUrl is missing', () => {
    const dto = toAdminBookingRegistration(
      makeBooking({ hostAvatarUrl: null, guestAvatarUrl: null }),
    );

    assert.equal(dto.hostAvatar, null);
    assert.equal(dto.guestAvatar, null);
  });
});
