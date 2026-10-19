const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

/** Inline pure resolver (mirrors constants/stripe.js) so tests don't need ESM/Expo. */
function resolveApplePayEnabled({
  envFlag,
  extraApplePayEnabled,
  publishableKey,
  merchantId,
}) {
  if (extraApplePayEnabled === false || extraApplePayEnabled === 'false') {
    return false;
  }
  const envOn = String(envFlag || '').trim().toLowerCase() === 'true';
  const extraOn = String(extraApplePayEnabled ?? '').trim().toLowerCase() === 'true';
  if (!envOn && !extraOn) return false;
  if (!String(publishableKey || '').trim()) return false;
  if (!String(merchantId || '').trim()) return false;
  return true;
}

describe('resolveApplePayEnabled (mobile flag)', () => {
  const base = {
    envFlag: 'true',
    extraApplePayEnabled: undefined,
    publishableKey: 'pk_test_x',
    merchantId: 'merchant.com.rentyourride.ios',
  };

  it('flag off hides Apple Pay (default)', () => {
    assert.equal(resolveApplePayEnabled({ ...base, envFlag: '' }), false);
  });

  it('flag on + key + merchant → enabled', () => {
    assert.equal(resolveApplePayEnabled(base), true);
  });

  it('flag on but unsupported (no key) → hidden', () => {
    assert.equal(resolveApplePayEnabled({ ...base, publishableKey: '' }), false);
  });

  it('remote kill-switch forces off', () => {
    assert.equal(
      resolveApplePayEnabled({ ...base, extraApplePayEnabled: false }),
      false,
    );
  });
});
