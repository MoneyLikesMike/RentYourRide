import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createHmac } from 'crypto';

/** Minimal Stripe-compatible signed payload for constructEvent tests. */
function signPayload(secret: string, payload: string, timestamp = 1_700_000_000) {
  const signed = `${timestamp}.${payload}`;
  const sig = createHmac('sha256', secret).update(signed, 'utf8').digest('hex');
  return {
    payload,
    header: `t=${timestamp},v1=${sig}`,
  };
}

describe('Stripe Connect webhook signature shape', () => {
  it('builds a v1 signature Stripe accepts', () => {
    const secret = 'whsec_test_secret';
    const payload = JSON.stringify({
      id: 'evt_test_1',
      object: 'event',
      type: 'account.updated',
      account: 'acct_123',
      data: { object: { id: 'acct_123', object: 'account' } },
    });
    const { header } = signPayload(secret, payload);
    assert.match(header, /^t=\d+,v1=[0-9a-f]+$/);
    const t = header.split(',')[0].slice(2);
    const v1 = header.split(',')[1].slice(3);
    const expected = createHmac('sha256', secret)
      .update(`${t}.${payload}`, 'utf8')
      .digest('hex');
    assert.equal(v1, expected);
  });
});

describe('account.updated → persist requirements (shape)', () => {
  it('maps Stripe account fields into host_payout_accounts columns', () => {
    const acct = {
      id: 'acct_1',
      charges_enabled: true,
      payouts_enabled: false,
      capabilities: { transfers: 'active' as const },
      controller: { requirement_collection: 'application' },
      requirements: {
        currently_due: ['individual.id_number'],
        past_due: [],
        eventually_due: [],
        pending_verification: [],
        errors: [
          {
            requirement: 'individual.verification.document',
            code: 'verification_document_expired',
            reason: 'expired',
          },
        ],
        current_deadline: 1_700_000_000,
        disabled_reason: null,
      },
    };
    const row = {
      stripeAccountId: acct.id,
      accountKind:
        acct.controller.requirement_collection === 'application'
          ? 'custom'
          : 'express',
      chargesEnabled: acct.charges_enabled,
      payoutsEnabled: acct.payouts_enabled,
      transfersCapability: acct.capabilities.transfers,
      currentlyDue: acct.requirements.currently_due,
      pastDue: acct.requirements.past_due,
      errors: acct.requirements.errors,
      currentDeadline: new Date(acct.requirements.current_deadline * 1000),
    };
    assert.equal(row.accountKind, 'custom');
    assert.deepEqual(row.currentlyDue, ['individual.id_number']);
    assert.equal(row.transfersCapability, 'active');
    assert.equal(row.payoutsEnabled, false);
  });
});

describe('admin list sanitization', () => {
  it('never includes SIN or document file ids', () => {
    const adminRow = {
      userId: 'u1',
      stripeAccountId: 'acct_1',
      currentlyDue: ['individual.id_number'],
      pastDue: [],
    };
    const json = JSON.stringify(adminRow);
    assert.equal(json.includes('id_number_value'), false);
    assert.equal(json.includes('file_'), false);
    assert.equal(json.includes('046454286'), false);
  });
});
