import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bookingCaptureIdempotencyKey,
  bookingChargeIdempotencyKey,
  bookingHoldCancelIdempotencyKey,
  bookingPreauthIdempotencyKey,
  bookingRefundIdempotencyKey,
} from './booking-payment-keys';

describe('booking-payment-keys', () => {
  const id = '11111111-2222-3333-4444-555555555555';

  it('builds stable keys from booking id', () => {
    assert.equal(bookingPreauthIdempotencyKey(id), `booking:${id}:preauth`);
    assert.equal(bookingHoldCancelIdempotencyKey(id), `booking:${id}:hold-cancel`);
    assert.equal(bookingChargeIdempotencyKey(id), `booking:${id}:charge:v1`);
    assert.equal(bookingCaptureIdempotencyKey(id), `booking:${id}:capture`);
    assert.equal(
      bookingRefundIdempotencyKey(id, 'host-decline'),
      `booking:${id}:refund:host-decline`,
    );
  });
});
