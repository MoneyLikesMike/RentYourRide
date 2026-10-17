const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildListingsSearchParams,
  createSearchStateFromParams,
  mergeSearchStateFromRoute,
} = require('./buildListingsSearchParams');

describe('buildListingsSearchParams', () => {
  it('address with coords sends lat/lng/radiusKm (and city)', () => {
    const { params, reason } = buildListingsSearchParams({
      label: '250 Wincott Dr, Winnipeg, MB',
      city: 'Winnipeg',
      latitude: 49.87,
      longitude: -97.3,
      distance: 500,
    });
    assert.equal(reason, undefined);
    assert.deepEqual(params, {
      city: 'Winnipeg',
      latitude: 49.87,
      longitude: -97.3,
      radiusKm: 500,
    });
  });

  it('no coords falls back to city only', () => {
    const { params } = buildListingsSearchParams({
      city: 'Winnipeg',
      distance: 500,
    });
    assert.deepEqual(params, { city: 'Winnipeg' });
  });

  it('empty location yields no request', () => {
    const { params, reason } = buildListingsSearchParams({});
    assert.equal(params, null);
    assert.equal(reason, 'empty');
  });

  it('prov / national omit coords and radius (city only)', () => {
    const { params } = buildListingsSearchParams({
      city: 'Winnipeg',
      latitude: 49.87,
      longitude: -97.3,
      distance: 'prov',
    });
    assert.deepEqual(params, { city: 'Winnipeg' });

    const national = buildListingsSearchParams({
      city: 'Winnipeg',
      latitude: 49.87,
      longitude: -97.3,
      distance: 'national',
    });
    assert.deepEqual(national.params, { city: 'Winnipeg' });
  });

  it('coords without a numeric distance still send lat/lng (Home parity)', () => {
    const { params } = buildListingsSearchParams({
      city: 'Winnipeg',
      latitude: 49.87,
      longitude: -97.3,
    });
    assert.deepEqual(params, {
      city: 'Winnipeg',
      latitude: 49.87,
      longitude: -97.3,
    });
  });
});

describe('createSearchStateFromParams', () => {
  it('keeps full locationQuery as label and coords from Home', () => {
    const state = createSearchStateFromParams({
      city: 'Winnipeg',
      locationQuery: '250 Wincott Dr, Winnipeg, MB, Canada',
      latitude: 49.87,
      longitude: -97.3,
      country: 'Canada',
    });
    assert.equal(state.city, 'Winnipeg');
    assert.equal(state.label, '250 Wincott Dr, Winnipeg, MB, Canada');
    assert.equal(state.latitude, 49.87);
    assert.equal(state.longitude, -97.3);
    assert.equal(state.distance, 500);
  });
});

describe('mergeSearchStateFromRoute', () => {
  it('dates-only Calendar return keeps Winnipeg location', () => {
    const prev = createSearchStateFromParams({
      city: 'Winnipeg',
      locationQuery: 'Winnipeg, MB',
      latitude: 49.89,
      longitude: -97.14,
      country: 'Canada',
    });
    const merged = mergeSearchStateFromRoute(prev, {
      bookingDates: { start: 1, end: 2, startTime: '2:30 PM', endTime: '10:30 PM' },
    });
    assert.equal(merged.city, 'Winnipeg');
    assert.equal(merged.label, 'Winnipeg, MB');
    assert.equal(merged.latitude, 49.89);
    assert.equal(merged.longitude, -97.14);
    assert.equal(merged.bookingDates.start, 1);
  });
});
