import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PLACES_BIAS_RADIUS_METERS,
  buildPlacesAutocompleteParams,
} from './placesAutocompleteParams';

describe('buildPlacesAutocompleteParams', () => {
  it('builds a worldwide query with no country filter', () => {
    const params = buildPlacesAutocompleteParams({ input: 'Lagos' });
    assert.equal(params.get('input'), 'Lagos');
    assert.equal(params.get('language'), 'en');
    assert.equal(params.get('components'), null);
    assert.equal(params.get('location'), null);
    assert.equal(params.get('radius'), null);
  });

  it('adds location bias only when a location exists', () => {
    const params = buildPlacesAutocompleteParams({
      input: 'Winn',
      sessionToken: 'tok',
      bias: { latitude: 49.8951, longitude: -97.1384 },
    });
    assert.equal(params.get('location'), '49.8951,-97.1384');
    assert.equal(params.get('radius'), String(PLACES_BIAS_RADIUS_METERS));
    assert.equal(params.get('sessiontoken'), 'tok');
    assert.equal(params.get('components'), null);
  });

  it('omits bias when coordinates are missing', () => {
    const params = buildPlacesAutocompleteParams({
      input: 'London',
      bias: null,
    });
    assert.equal(params.get('location'), null);
    assert.equal(params.get('radius'), null);
  });
});
