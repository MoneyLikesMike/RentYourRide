import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isPayoutAccountReady } from './payouts';

describe('isPayoutAccountReady (RYRA-484)', () => {
  it('is true only when payoutsEnabled', () => {
    assert.equal(isPayoutAccountReady({ payoutsEnabled: true }), true);
    assert.equal(
      isPayoutAccountReady({
        onboarded: true,
        detailsSubmitted: true,
        payoutsEnabled: false,
      }),
      false,
    );
    assert.equal(isPayoutAccountReady(null), false);
  });
});
