/**
 * RYRA-488: price pane must not submit a booking.
 * Run: apps/api/node_modules/.bin/tsx --test utils/checkoutStickyCta.spec.js
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildTripRequestConfirmCopy,
  onCheckoutBookPanePress,
  onCheckoutPricePanePress,
} from './checkoutStickyCta.js';

describe('checkout sticky CTA', () => {
  it('tapping the price pane does not call addGuestBooking/createBooking', () => {
    let submitCalls = 0;
    let breakdownCalls = 0;
    onCheckoutPricePanePress({
      openPriceBreakdown: () => {
        breakdownCalls += 1;
      },
      // Deliberately also pass submit — price pane must ignore it.
      submitBooking: () => {
        submitCalls += 1;
      },
    });
    assert.equal(submitCalls, 0);
    assert.equal(breakdownCalls, 1);
  });

  it('book pane calls submitBooking', async () => {
    let submitCalls = 0;
    await onCheckoutBookPanePress({
      submitBooking: async () => {
        submitCalls += 1;
      },
    });
    assert.equal(submitCalls, 1);
  });

  it('builds request vs instant confirm copy', () => {
    const req = buildTripRequestConfirmCopy({
      isInstantBooking: false,
      hostName: 'Em',
      totalCad: 405,
      brand: 'Visa',
      last4: '4242',
    });
    assert.equal(req.title, 'Send trip request?');
    assert.match(req.message, /Em/);
    assert.match(req.message, /\$1\.00 hold/);
    assert.match(req.message, /Visa ••4242/);

    const instant = buildTripRequestConfirmCopy({
      isInstantBooking: true,
      hostName: 'Em',
      totalCad: 100,
      brand: 'Mastercard',
      last4: '4444',
    });
    assert.equal(instant.title, 'Book trip');
    assert.match(instant.message, /CAD \$100\.00/);
  });
});
