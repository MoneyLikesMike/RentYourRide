import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  bookingSnapshotAccess,
  redactListingSnapshotForViewer,
} from './booking-snapshot-access';

const FULL_SNAP = {
  id: 'listing-1',
  title: 'Ride',
  hostEmail: 'host@example.com',
  hostPhone: '+15551212',
  vin: '1HGCM82633A004352',
  licensePlate: 'ABC123',
  licenseProvince: 'MB',
  vehicleData: { make: 'Honda', vin: '1HGCM82633A004352' },
  extras: {
    shortestTrip: '1 day',
    checkInInstructions: 'Key in lockbox',
    checkOutInstructions: 'Full tank',
  },
};

describe('bookingSnapshotAccess', () => {
  it('gives host full access always', () => {
    const a = bookingSnapshotAccess({
      viewerIsHost: true,
      status: 'pending_host',
    });
    assert.equal(a.hostContact, true);
    assert.equal(a.vehicleIdentifiers, true);
  });

  it('withholds contact and plate from pending guest', () => {
    const a = bookingSnapshotAccess({
      viewerIsHost: false,
      status: 'pending_host',
      tripStartMs: Date.now() + 48 * 3600 * 1000,
    });
    assert.equal(a.hostContact, false);
    assert.equal(a.vehicleIdentifiers, false);
  });

  it('gives confirmed guest host contact but not plate until 24h window', () => {
    const a = bookingSnapshotAccess({
      viewerIsHost: false,
      status: 'confirmed',
      tripStartMs: Date.now() + 72 * 3600 * 1000,
      nowMs: Date.now(),
    });
    assert.equal(a.hostContact, true);
    assert.equal(a.vehicleIdentifiers, false);
  });

  it('gives plate/VIN within 24h of pickup for confirmed guest', () => {
    const now = Date.now();
    const a = bookingSnapshotAccess({
      viewerIsHost: false,
      status: 'confirmed',
      tripStartMs: now + 12 * 3600 * 1000,
      nowMs: now,
    });
    assert.equal(a.hostContact, true);
    assert.equal(a.vehicleIdentifiers, true);
  });

  it('gives plate during active trip', () => {
    const a = bookingSnapshotAccess({
      viewerIsHost: false,
      status: 'active',
      tripStartMs: Date.now() - 3600 * 1000,
    });
    assert.equal(a.vehicleIdentifiers, true);
    assert.equal(a.hostContact, true);
  });
});

describe('redactListingSnapshotForViewer', () => {
  it('strips contact and identifiers for pending guest', () => {
    const access = bookingSnapshotAccess({
      viewerIsHost: false,
      status: 'pending_host',
    });
    const out = redactListingSnapshotForViewer(FULL_SNAP, access);
    assert.equal(out.hostEmail, undefined);
    assert.equal(out.hostPhone, undefined);
    assert.equal(out.vin, undefined);
    assert.equal(out.licensePlate, undefined);
    assert.equal(
      (out.vehicleData as { vin?: string } | undefined)?.vin,
      undefined,
    );
    assert.equal(
      (out.extras as { checkInInstructions?: string }).checkInInstructions,
      undefined,
    );
    assert.equal(out.title, 'Ride');
    assert.equal((out.vehicleData as { make?: string }).make, 'Honda');
  });

  it('keeps contact for confirmed guest outside plate window', () => {
    const access = bookingSnapshotAccess({
      viewerIsHost: false,
      status: 'confirmed',
      tripStartMs: Date.now() + 72 * 3600 * 1000,
    });
    const out = redactListingSnapshotForViewer(FULL_SNAP, access);
    assert.equal(out.hostEmail, 'host@example.com');
    assert.equal(out.vin, undefined);
    assert.equal(
      (out.extras as { checkInInstructions?: string }).checkInInstructions,
      undefined,
    );
  });

  it('keeps everything for host', () => {
    const access = bookingSnapshotAccess({
      viewerIsHost: true,
      status: 'pending_host',
    });
    const out = redactListingSnapshotForViewer(FULL_SNAP, access);
    assert.equal(out.hostEmail, 'host@example.com');
    assert.equal(out.vin, '1HGCM82633A004352');
    assert.equal(
      (out.extras as { checkInInstructions?: string }).checkInInstructions,
      'Key in lockbox',
    );
  });
});
