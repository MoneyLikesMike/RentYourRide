/**
 * RYRA-489: booking update error copy.
 * Run: apps/api/node_modules/.bin/tsx --test hooks/bookingUpdateErrors.spec.js
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { messageForBookingUpdateError } from './bookingUpdateErrors.js';

describe('useBookingUpdate message mapping', () => {
  it('maps 401 and SESSION_EXPIRED to session copy', () => {
    assert.equal(
      messageForBookingUpdateError({ status: 401, message: 'Unauthorized' }),
      'Your session has expired. Please sign in again.',
    );
    assert.equal(
      messageForBookingUpdateError({
        status: 401,
        body: { code: 'SESSION_EXPIRED' },
        message: 'x',
      }),
      'Your session has expired. Please sign in again.',
    );
    assert.equal(
      messageForBookingUpdateError({ message: 'Unauthorized' }),
      'Your session has expired. Please sign in again.',
    );
  });

  it('maps 403 / Forbidden to access copy', () => {
    assert.equal(
      messageForBookingUpdateError({ status: 403, message: 'Forbidden' }),
      "You don't have access to this trip.",
    );
    assert.equal(
      messageForBookingUpdateError({ message: 'Forbidden' }),
      "You don't have access to this trip.",
    );
  });

  it('passes through other messages', () => {
    assert.equal(
      messageForBookingUpdateError({ status: 400, message: 'Invalid transition' }),
      'Invalid transition',
    );
  });
});
