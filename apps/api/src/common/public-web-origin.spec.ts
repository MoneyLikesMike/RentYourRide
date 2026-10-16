import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_PUBLIC_WEB_ORIGIN,
  publicWebOrigin,
  publicWebUrl,
  welcomeEmailCtaUrls,
} from './public-web-origin';

describe('publicWebOrigin', () => {
  it('defaults to the www canonical site', () => {
    assert.equal(publicWebOrigin({}), DEFAULT_PUBLIC_WEB_ORIGIN);
    assert.equal(DEFAULT_PUBLIC_WEB_ORIGIN, 'https://www.rentyourride.ca');
  });

  it('honors PUBLIC_WEB_ORIGIN and strips a trailing slash', () => {
    assert.equal(
      publicWebOrigin({ PUBLIC_WEB_ORIGIN: 'https://fedev.rentyourride.ca/' }),
      'https://fedev.rentyourride.ca',
    );
  });
});

describe('publicWebUrl', () => {
  it('builds absolute paths on www', () => {
    assert.equal(
      publicWebUrl('/find-your-car'),
      'https://www.rentyourride.ca/find-your-car',
    );
    assert.equal(
      publicWebUrl('r/ABC123'),
      'https://www.rentyourride.ca/r/ABC123',
    );
  });

  it('never uses a bare apex with a path', () => {
    const url = publicWebUrl('/profile/list-your-ride');
    assert.match(url, /^https:\/\/www\.rentyourride\.ca\//);
    assert.doesNotMatch(url, /^https:\/\/rentyourride\.ca\//);
    assert.doesNotMatch(url, /^https:\/\/rentyourride\.com\//);
  });
});

describe('Welcome email CTA URLs (RYRA-437)', () => {
  it('points Search and List CTAs at www paths that resolve today', () => {
    const { searchYourCity, listYourRide } = welcomeEmailCtaUrls();
    assert.equal(searchYourCity, 'https://www.rentyourride.ca/find-your-car');
    assert.equal(
      listYourRide,
      'https://www.rentyourride.ca/profile/list-your-ride',
    );
    for (const url of [searchYourCity, listYourRide]) {
      assert.doesNotMatch(url, /^https:\/\/rentyourride\.ca\//);
      assert.doesNotMatch(url, /^https:\/\/rentyourride\.com\//);
    }
  });
});
