import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ensureEndAfterStart,
  ensureTripDatesNotPast,
  validateTripDates,
} from './tripDates';

const NOW = new Date('2026-10-16T18:00:00');

describe('validateTripDates', () => {
  it('rejects a start in the past', () => {
    const start = new Date('2026-10-01T10:00:00');
    const end = new Date('2026-10-09T10:00:00');
    assert.equal(validateTripDates(start, end, NOW), 'past_start');
  });

  it('rejects end before start', () => {
    const start = new Date('2026-10-20T10:00:00');
    const end = new Date('2026-10-18T10:00:00');
    assert.equal(validateTripDates(start, end, NOW), 'end_before_start');
  });

  it('rejects end equal to start (same instant not allowed)', () => {
    const start = new Date('2026-10-20T10:00:00');
    assert.equal(validateTripDates(start, start, NOW), 'end_before_start');
  });

  it('allows same calendar day when end time is after start', () => {
    const start = new Date('2026-10-20T10:00:00');
    const end = new Date('2026-10-20T18:00:00');
    assert.equal(validateTripDates(start, end, NOW), null);
  });

  it('allows a valid multi-day range', () => {
    const start = new Date('2026-10-20T10:00:00');
    const end = new Date('2026-10-22T10:00:00');
    assert.equal(validateTripDates(start, end, NOW), null);
  });
});

describe('ensureEndAfterStart', () => {
  it('shifts end to the next day when end date is before start', () => {
    const start = new Date('2026-10-20T10:00:00');
    const end = new Date('2026-10-18T10:00:00');
    const fixed = ensureEndAfterStart(start, end);
    assert.equal(fixed.shifted, true);
    assert.equal(fixed.end.toISOString(), new Date('2026-10-21T10:00:00').toISOString());
  });

  it('keeps same-day trips by bumping end time, not the date', () => {
    const start = new Date('2026-10-20T10:00:00');
    const end = new Date('2026-10-20T10:00:00');
    const fixed = ensureEndAfterStart(start, end);
    assert.equal(fixed.shifted, true);
    assert.equal(fixed.end.toISOString(), new Date('2026-10-20T11:00:00').toISOString());
  });

  it('bumps end time on the same day when end time is earlier than start', () => {
    const start = new Date('2026-10-20T14:00:00');
    const end = new Date('2026-10-20T10:00:00');
    const fixed = ensureEndAfterStart(start, end);
    assert.equal(fixed.shifted, true);
    assert.equal(fixed.end.toISOString(), new Date('2026-10-20T15:00:00').toISOString());
  });

  it('leaves a valid range alone', () => {
    const start = new Date('2026-10-18T10:00:00');
    const end = new Date('2026-10-20T10:00:00');
    const fixed = ensureEndAfterStart(start, end);
    assert.equal(fixed.shifted, false);
    assert.equal(fixed.end.getTime(), end.getTime());
  });

  it('leaves a valid same-day range alone', () => {
    const start = new Date('2026-10-20T10:00:00');
    const end = new Date('2026-10-20T18:00:00');
    const fixed = ensureEndAfterStart(start, end);
    assert.equal(fixed.shifted, false);
    assert.equal(fixed.end.getTime(), end.getTime());
  });
});

describe('ensureTripDatesNotPast', () => {
  it('clamps a past start and keeps end after it', () => {
    const start = new Date('2026-10-01T10:00:00');
    const end = new Date('2026-10-02T10:00:00');
    const fixed = ensureTripDatesNotPast(start, end, NOW);
    assert.equal(fixed.clamped, true);
    assert.ok(fixed.start.getTime() >= NOW.getTime());
    assert.ok(fixed.end.getTime() > fixed.start.getTime());
  });
});
