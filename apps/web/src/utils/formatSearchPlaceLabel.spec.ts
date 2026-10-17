import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatSearchPlaceLabel } from './formatSearchPlaceLabel';

describe('formatSearchPlaceLabel', () => {
  it('uses the place country (not hard-coded Canada)', () => {
    assert.equal(
      formatSearchPlaceLabel({
        city: 'London',
        country: 'United Kingdom',
      }),
      'London, United Kingdom',
    );
    assert.equal(
      formatSearchPlaceLabel({
        city: 'Lagos',
        country: 'Nigeria',
      }),
      'Lagos, Nigeria',
    );
  });

  it('keeps compact CA/US region labels', () => {
    assert.equal(
      formatSearchPlaceLabel({
        city: 'Winnipeg',
        regionCode: 'MB',
        country: 'Canada',
      }),
      'Winnipeg, MB',
    );
  });

  it('falls back to the formatted query', () => {
    assert.equal(
      formatSearchPlaceLabel({
        query: 'Heathrow Airport, United Kingdom',
      }),
      'Heathrow Airport, United Kingdom',
    );
  });

  it('never invents ", Canada"', () => {
    const label = formatSearchPlaceLabel({ city: 'Regina', regionCode: 'SK' });
    assert.equal(label, 'Regina, SK');
    assert.doesNotMatch(label, /Canada/i);
  });
});
