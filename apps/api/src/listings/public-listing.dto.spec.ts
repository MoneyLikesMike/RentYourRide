/**
 * Unit tests for RYRA-428 public listing allowlist + booking snapshot access.
 * Run: npx tsx --test src/listings/public-listing.dto.spec.ts src/bookings/booking-snapshot-access.spec.ts
 * (from apps/api)
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ListingEntity } from '../entities/listing.entity';
import { UserEntity } from '../entities/user.entity';
import { withApproximateLocation } from './approximate-location';
import {
  assertNoForbiddenPublicListingKeys,
  publicHostDisplayName,
  toPublicListingDto,
} from './public-listing.dto';

function fakeListing(overrides: Partial<ListingEntity> = {}): ListingEntity {
  const host = new UserEntity();
  host.id = 'host-uuid-1';
  host.firstName = 'Denzel';
  host.lastName = 'Magaya';
  host.email = 'denzel@gmil.com';
  host.phone = '+12045551234';
  host.avatarUrl = 'https://cdn.example/a.jpg';
  host.aboutBio = 'Friendly host. Joined in 2019.';
  host.createdAt = new Date('2020-06-01');

  const listing = new ListingEntity();
  listing.id = 'listing-uuid-1';
  listing.city = 'Winnipeg';
  listing.title = 'Test Ride';
  listing.description = 'Nice car';
  listing.vehicleType = 'car';
  listing.photos = ['https://cdn.example/p.jpg'];
  listing.pricePerDay = 85 as unknown as ListingEntity['pricePerDay'];
  listing.weeklyDiscount = '10%';
  listing.monthlyDiscount = '';
  listing.deliveryPrice = 25 as unknown as ListingEntity['deliveryPrice'];
  listing.dailyKm = '200 km/day';
  listing.instantBooking = true;
  listing.latitude = 49.895;
  listing.longitude = -97.138;
  listing.pickupAddress = '123 Secret St, Winnipeg, MB R3C 1A1';
  listing.active = true;
  listing.published = true;
  listing.vin = '1HGCM82633A004352';
  listing.carFeatures = ['Bluetooth'];
  listing.extras = {
    shortestTrip: '1 day',
    checkInInstructions: 'Key under mat',
    checkOutInstructions: 'Lock doors',
    kmOverageFee: '$0.45',
  };
  listing.availability = [];
  listing.hostTrips = 3;
  listing.guestReviews = [];
  listing.licensePlate = 'ABC123';
  listing.licenseProvince = 'Manitoba';
  listing.vehicleData = {
    make: 'Honda',
    model: 'Accord',
    year: 2018,
    vin: '1HGCM82633A004352',
    color: 'Blue',
  };
  listing.hostUserId = host.id;
  listing.host = host;
  Object.assign(listing, overrides);
  return listing;
}

describe('toPublicListingDto', () => {
  it('never includes forbidden PII keys (recursive)', () => {
    const dto = withApproximateLocation(toPublicListingDto(fakeListing()));
    const leaks = assertNoForbiddenPublicListingKeys(dto);
    assert.deepEqual(leaks, [], `leaked keys: ${leaks.join(', ')}`);
    assert.equal(
      (dto as { vehicleData?: { vin?: string } }).vehicleData?.vin,
      undefined,
    );
  });

  it('keeps browse fields guests need', () => {
    const dto = toPublicListingDto(fakeListing());
    assert.equal(dto.title, 'Test Ride');
    assert.equal(dto.pricePerDay, 85);
    assert.equal(dto.vehicleData?.make, 'Honda');
    assert.equal(dto.extras.shortestTrip, '1 day');
    assert.equal(dto.extras.checkInInstructions, undefined);
    assert.equal(dto.hostUserId, 'host-uuid-1');
    assert.equal(dto.hostName, 'Denzel M.');
  });

  it('approximates pickup away from exact street', () => {
    const dto = withApproximateLocation(toPublicListingDto(fakeListing()));
    assert.ok(!String(dto.pickupAddress).includes('Secret St'));
    assert.ok(String(dto.pickupAddress).includes('Winnipeg'));
  });
});

describe('publicHostDisplayName', () => {
  it('uses first name + last initial', () => {
    const u = new UserEntity();
    u.firstName = 'Sepoy';
    u.lastName = 'Smith';
    assert.equal(publicHostDisplayName(u), 'Sepoy S.');
  });
});
