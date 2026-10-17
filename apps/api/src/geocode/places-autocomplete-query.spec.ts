import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PLACES_BIAS_RADIUS_METERS,
  buildLegacyAutocompleteQuery,
  buildPlacesNewAutocompleteBody,
  parsePlacesBias,
} from './places-autocomplete-query';

describe('parsePlacesBias', () => {
  it('returns null when no location is known', () => {
    assert.equal(parsePlacesBias({}), null);
    assert.equal(parsePlacesBias({ input: 'London' }), null);
  });

  it('parses location=lat,lng with default radius', () => {
    assert.deepEqual(parsePlacesBias({ location: '49.8951,-97.1384' }), {
      latitude: 49.8951,
      longitude: -97.1384,
      radiusMeters: PLACES_BIAS_RADIUS_METERS,
    });
  });

  it('honors an explicit radius', () => {
    assert.deepEqual(
      parsePlacesBias({ location: '51.5,-0.12', radius: '25000' }),
      {
        latitude: 51.5,
        longitude: -0.12,
        radiusMeters: 25000,
      },
    );
  });
});

describe('buildPlacesNewAutocompleteBody', () => {
  it('omits region filters and bias when no location exists', () => {
    const body = buildPlacesNewAutocompleteBody('Lagos', { language: 'en' });
    assert.equal(body.input, 'Lagos');
    assert.equal(body.languageCode, 'en');
    assert.equal('includedRegionCodes' in body, false);
    assert.equal('locationBias' in body, false);
  });

  it('adds a circle locationBias when a location exists', () => {
    const body = buildPlacesNewAutocompleteBody('Winn', {
      location: '49.8951,-97.1384',
      radius: '50000',
    });
    assert.deepEqual(body.locationBias, {
      circle: {
        center: { latitude: 49.8951, longitude: -97.1384 },
        radius: 50000,
      },
    });
    assert.equal('includedRegionCodes' in body, false);
  });
});

describe('buildLegacyAutocompleteQuery', () => {
  it('omits components/country filters with no bias when no location', () => {
    const params = buildLegacyAutocompleteQuery('London, UK', {
      language: 'en',
      components: 'country:ca|country:us',
    });
    assert.deepEqual(params, {
      input: 'London, UK',
      language: 'en',
    });
    assert.equal('components' in params, false);
    assert.equal('location' in params, false);
  });

  it('adds location+radius bias only when a location exists', () => {
    const params = buildLegacyAutocompleteQuery('Winn', {
      location: '49.8951,-97.1384',
      sessiontoken: 'abc',
    });
    assert.equal(params.location, '49.8951,-97.1384');
    assert.equal(params.radius, String(PLACES_BIAS_RADIUS_METERS));
    assert.equal(params.sessiontoken, 'abc');
    assert.equal('components' in params, false);
  });
});
