import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { payoutRequirementsFromAccount } from './payout-account-status';
import { stripeParamToField } from './stripe-param-fields';
import {
  DEFAULT_PRODUCT_DESCRIPTION,
  resolveBusinessProfileUrl,
} from './payout-business-profile';
import { buildCustomAccountCreateParams } from './payout-custom-create-params';
import {
  isCustomConnectAccount,
  isExpressConnectAccount,
} from './payout-accounts-kind';

describe('stripeParamToField', () => {
  it('maps bank and individual params to form fields', () => {
    assert.equal(stripeParamToField('individual[first_name]'), 'firstName');
    assert.equal(stripeParamToField('external_account[account_number]'), 'accountNumber');
    assert.equal(stripeParamToField('routing_number'), 'routingNumber');
    assert.equal(stripeParamToField('individual[dob][day]'), 'dateOfBirth');
  });
});

describe('payoutRequirementsFromAccount', () => {
  it('returns enabled when payouts_enabled', () => {
    const status = payoutRequirementsFromAccount({
      id: 'acct_1',
      payouts_enabled: true,
      details_submitted: true,
      requirements: { currently_due: [], past_due: [], eventually_due: [], errors: [] },
    } as never);
    assert.equal(status.status, 'enabled');
    assert.equal(status.payoutsEnabled, true);
  });

  it('returns action_needed when currently_due is set', () => {
    const status = payoutRequirementsFromAccount({
      id: 'acct_1',
      payouts_enabled: false,
      details_submitted: true,
      requirements: {
        currently_due: ['individual.verification.document'],
        past_due: [],
        eventually_due: [],
        errors: [],
      },
    } as never);
    assert.equal(status.status, 'action_needed');
  });
});

describe('resolveBusinessProfileUrl', () => {
  it('prefers first public listing, else site origin', () => {
    assert.match(
      resolveBusinessProfileUrl({
        env: { PUBLIC_WEB_ORIGIN: 'https://fedev.rentyourride.ca' },
        firstPublicListingId: 'listing-abc',
      }),
      /\/find-your-car\/listing-abc$/,
    );
    assert.equal(
      resolveBusinessProfileUrl({
        env: { PUBLIC_WEB_URL: 'https://rentyourride.ca' },
      }),
      'https://rentyourride.ca',
    );
    assert.equal(DEFAULT_PRODUCT_DESCRIPTION.includes('RentYourRide'), true);
  });
});

describe('buildCustomAccountCreateParams (RYRA-484)', () => {
  const dto = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    dateOfBirth: '1990-07-24',
    addressLine1: '1 Main St',
    city: 'Winnipeg',
    region: 'MB',
    postalCode: 'R3C1A1',
    country: 'CA' as const,
    phone: '2045551212',
    currency: 'CAD' as const,
    bankCountry: 'CA' as const,
    accountNumber: '000123456789',
    transitNumber: '12345',
    institutionNumber: '001',
  };

  it('uses controller props, transfers only, TOS from headers, business_profile defaults', () => {
    const { params, idempotencyKey } = buildCustomAccountCreateParams({
      userId: 'user-1',
      email: 'ada@example.com',
      dto,
      tos: {
        ip: '203.0.113.9',
        userAgent: 'RYR-Test/1.0',
        acceptedAt: new Date('2026-04-01T12:00:00Z'),
      },
      env: { get: (k: string) => (k === 'PUBLIC_WEB_URL' ? 'https://rentyourride.ca' : undefined) },
    });

    const controller = params.controller as Record<string, unknown>;
    assert.deepEqual(controller.stripe_dashboard, { type: 'none' });
    assert.deepEqual(controller.fees, { payer: 'application' });
    assert.deepEqual(controller.losses, { payments: 'application' });
    assert.equal(controller.requirement_collection, 'application');
    assert.deepEqual(params.capabilities, { transfers: { requested: true } });
    assert.equal(
      (params.capabilities as { card_payments?: unknown }).card_payments,
      undefined,
    );

    const tos = params.tos_acceptance as {
      ip: string;
      user_agent: string;
      service_agreement: string;
    };
    assert.equal(tos.ip, '203.0.113.9');
    assert.equal(tos.user_agent, 'RYR-Test/1.0');
    assert.equal(tos.service_agreement, 'full');

    const profile = params.business_profile as {
      url: string;
      product_description: string;
      mcc: string;
    };
    assert.equal(profile.url, 'https://rentyourride.ca');
    assert.equal(profile.product_description, DEFAULT_PRODUCT_DESCRIPTION);
    assert.equal(profile.mcc, '7512');
    assert.match(idempotencyKey, /^connect-create:user-1:/);
    assert.equal(params.country, 'CA');
    assert.ok(!('type' in params && params.type === 'express'));
  });

  it('same dto hash yields same idempotency key (concurrent save safety)', () => {
    const tos = {
      ip: '1.1.1.1',
      userAgent: 't',
      acceptedAt: new Date(),
    };
    const a = buildCustomAccountCreateParams({
      userId: 'user-lock',
      email: 'a@b.com',
      dto,
      tos,
    });
    const b = buildCustomAccountCreateParams({
      userId: 'user-lock',
      email: 'a@b.com',
      dto,
      tos,
    });
    assert.equal(a.idempotencyKey, b.idempotencyKey);
  });
});

describe('Custom vs Express detection', () => {
  it('detects Custom and Express accounts', () => {
    assert.equal(
      isCustomConnectAccount({
        controller: { requirement_collection: 'application' },
      } as never),
      true,
    );
    assert.equal(
      isExpressConnectAccount({
        type: 'express',
        controller: {
          requirement_collection: 'stripe',
          stripe_dashboard: { type: 'express' },
        },
      } as never),
      true,
    );
  });
});

describe('Stripe field errors (mapping contract)', () => {
  it('maps InvalidRequest param to field for 400 responses', () => {
    // submitPayoutDetails maps StripeInvalidRequestError via stripeParamToField
    // and must not call accountLinks.create (removed from Custom flow).
    assert.equal(
      stripeParamToField('external_account[account_number]'),
      'accountNumber',
    );
    assert.equal(stripeParamToField('individual[email]'), 'email');
  });
});
