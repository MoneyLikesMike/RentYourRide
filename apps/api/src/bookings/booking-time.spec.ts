import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isTripEndOnOrBeforeStart,
  isTripStartInPast,
  listingTimeZone,
  normalizeBookingDates,
  parseTimeLabel,
  timeZoneShortName,
  tripDateFromClient,
  zonedWallTimeToUtc,
} from './booking-time';

const WPG = 'America/Winnipeg';
const iso = (ms: number) => new Date(ms).toISOString();

describe('listingTimeZone', () => {
  it('reads the province from the address', () => {
    assert.equal(listingTimeZone({ pickupAddress: '136 Market Ave, Winnipeg, MB R3B 3N2, Canada' }), WPG);
    assert.equal(listingTimeZone({ pickupAddress: '100 Queen St W, Toronto, ON M5H 2N2, Canada' }), 'America/Toronto');
    assert.equal(listingTimeZone({ pickupAddress: '800 Robson St, Vancouver, British Columbia' }), 'America/Vancouver');
  });

  it('ignores lowercase words that look like province codes and defaults to Winnipeg', () => {
    assert.equal(listingTimeZone({ pickupAddress: '12 Lake on the Hill Rd, Winnipeg' }), WPG);
    assert.equal(listingTimeZone({ pickupAddress: '', city: 'Winnipeg' }), WPG);
    assert.equal(listingTimeZone(null), WPG);
  });
});

describe('zonedWallTimeToUtc', () => {
  it('converts car-local wall time, including across DST', () => {
    assert.equal(iso(zonedWallTimeToUtc('2026-10-12', 12 * 60, WPG)), '2026-10-12T17:00:00.000Z');
    assert.equal(iso(zonedWallTimeToUtc('2026-12-12', 12 * 60, WPG)), '2026-12-12T18:00:00.000Z');
    assert.equal(iso(zonedWallTimeToUtc('2026-10-12', 12 * 60, 'America/Toronto')), '2026-10-12T16:00:00.000Z');
  });
});

describe('parseTimeLabel', () => {
  it('parses app time labels', () => {
    assert.equal(parseTimeLabel('10:00 AM'), 600);
    assert.equal(parseTimeLabel('12:00 PM'), 720);
    assert.equal(parseTimeLabel('12:30 AM'), 30);
    assert.equal(parseTimeLabel('9:30 PM'), 21 * 60 + 30);
    assert.equal(parseTimeLabel('nonsense'), null);
  });
});

describe('tripDateFromClient', () => {
  it('prefers the explicit trip date', () => {
    assert.equal(tripDateFromClient(Date.UTC(2026, 9, 12, 4), '2026-10-12', WPG), '2026-10-12');
  });

  it('reads midnight sent by older app builds in any Canadian timezone', () => {
    assert.equal(tripDateFromClient(Date.parse('2026-10-12T04:00:00Z'), undefined, WPG), '2026-10-12'); // Toronto
    assert.equal(tripDateFromClient(Date.parse('2026-10-12T05:00:00Z'), undefined, WPG), '2026-10-12'); // Winnipeg
    assert.equal(tripDateFromClient(Date.parse('2026-10-12T07:00:00Z'), undefined, WPG), '2026-10-12'); // Vancouver
  });

  it('reads a full date-time in the car timezone', () => {
    assert.equal(tripDateFromClient(Date.parse('2026-10-12T14:00:00Z'), undefined, WPG), '2026-10-12');
  });
});

describe('normalizeBookingDates', () => {
  it('Toronto guest on the website picking 10:00 AM gets 10:00 AM car time', () => {
    const d = normalizeBookingDates(
      {
        start: Date.parse('2026-10-12T14:00:00Z'),
        end: Date.parse('2026-10-13T14:00:00Z'),
        startTime: '10:00 AM',
        endTime: '10:00 AM',
        startDate: '2026-10-12',
        endDate: '2026-10-13',
      },
      WPG,
    )!;
    assert.equal(iso(d.start), '2026-10-12T15:00:00.000Z');
    assert.equal(iso(d.end), '2026-10-13T15:00:00.000Z');
    assert.equal(d.startTime, '10:00 AM');
    assert.equal(d.timeZone, WPG);
  });

  it('older app builds (midnight + label) get the real trip time instead of midnight', () => {
    const d = normalizeBookingDates(
      {
        start: Date.parse('2026-09-10T05:00:00Z'),
        end: Date.parse('2026-09-11T05:00:00Z'),
        startTime: '9:30 PM',
        endTime: '10:30 PM',
      },
      WPG,
    )!;
    assert.equal(iso(d.start), '2026-09-11T02:30:00.000Z');
    assert.equal(iso(d.end), '2026-09-12T03:30:00.000Z');
    assert.equal(d.startDate, '2026-09-10');
    assert.equal(d.endDate, '2026-09-11');
  });

  it('rejects missing dates', () => {
    assert.equal(normalizeBookingDates({ start: 'x' }, WPG), null);
  });
});

describe('timeZoneShortName', () => {
  it('uses generic names', () => {
    assert.equal(timeZoneShortName(WPG), 'CT');
    assert.equal(timeZoneShortName('America/Toronto'), 'ET');
  });
});

describe('isTripStartInPast', () => {
  it('rejects starts before now and allows starts at/after now', () => {
    const now = Date.parse('2026-10-16T18:00:00.000Z');
    assert.equal(isTripStartInPast(now - 1, now), true);
    assert.equal(isTripStartInPast(now, now), false);
    assert.equal(isTripStartInPast(now + 60_000, now), false);
    assert.equal(isTripStartInPast(Number.NaN, now), false);
  });
});

describe('isTripEndOnOrBeforeStart', () => {
  it('rejects end before start and equal instants; allows same-day later end', () => {
    const start = Date.parse('2026-10-20T15:00:00.000Z');
    assert.equal(isTripEndOnOrBeforeStart(start - 1, start), true);
    assert.equal(isTripEndOnOrBeforeStart(start, start), true);
    assert.equal(isTripEndOnOrBeforeStart(start + 60_000, start), false);
    // Same calendar day, later wall time
    assert.equal(
      isTripEndOnOrBeforeStart(
        Date.parse('2026-10-20T22:00:00.000Z'),
        Date.parse('2026-10-20T15:00:00.000Z'),
      ),
      false,
    );
  });
});
