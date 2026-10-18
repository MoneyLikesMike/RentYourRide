import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isPayoutAccountReady } from './payouts';

describe('isPayoutAccountReady (RYRA-485)', () => {
  it('is true only when payoutsReady', () => {
    assert.equal(isPayoutAccountReady({ payoutsReady: true }), true);
    assert.equal(
      isPayoutAccountReady({
        onboarded: true,
        detailsSubmitted: true,
        payoutsEnabled: true,
        payoutsReady: false,
      }),
      false,
    );
    assert.equal(isPayoutAccountReady(null), false);
  });
});
