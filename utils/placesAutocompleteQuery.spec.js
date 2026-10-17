import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PLACES_BIAS_RADIUS_METERS,
  buildPlacesAutocompleteQuery,
} from './placesAutocompleteQuery.js';

describe('buildPlacesAutocompleteQuery', () => {
  it('omits country filters and bias when no location is known', () => {
    const q = buildPlacesAutocompleteQuery({ sessiontoken: 'tok' });
    assert.equal(q.language, 'en');
    assert.equal(q.sessiontoken, 'tok');
    assert.equal(q.components, undefined);
    assert.equal(q.location, undefined);
    assert.equal(q.radius, undefined);
  });

  it('adds location+radius bias only when coordinates exist', () => {
    const q = buildPlacesAutocompleteQuery({
      latitude: 49.8951,
      longitude: -97.1384,
    });
    assert.equal(q.location, '49.8951,-97.1384');
    assert.equal(q.radius, String(PLACES_BIAS_RADIUS_METERS));
    assert.equal(q.components, undefined);
  });
});
