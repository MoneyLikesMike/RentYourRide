import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildPayoutSetupBody,
  dobToIso,
  regionCodeFromForm,
} from './payoutSetupBody.js';

describe('payoutSetupBody (RYRA-484 iOS)', () => {
  it('keeps Step1→Step3 values in setup body', () => {
    const values = {
      country: 'CA',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      dob: '07 / 24 / 1990',
      addressLine1: '1 Main St',
      addressLine2: '',
      city: 'Winnipeg',
      province: 'Manitoba',
      postalCode: 'R3C 1A1',
      state: '',
      zipCode: '',
      phone: '(204) 555-1212',
      businessDescription: 'I rent my car',
      currency: 'CAD',
      bankCountry: 'CA',
      transitNumber: '12345',
      institutionNumber: '001',
      accountNumber: '000123456789',
      confirmAccountNumber: '000123456789',
      routingNumber: '',
    };
    assert.equal(dobToIso(values.dob), '1990-07-24');
    assert.equal(regionCodeFromForm(values), 'MB');
    const body = buildPayoutSetupBody(values);
    assert.equal(body.firstName, 'Ada');
    assert.equal(body.city, 'Winnipeg');
    assert.equal(body.region, 'MB');
    assert.equal(body.dateOfBirth, '1990-07-24');
    assert.equal(body.phone, '2045551212');
    assert.equal(body.transitNumber, '12345');
    assert.equal(body.institutionNumber, '001');
    assert.equal(body.accountNumber, '000123456789');
    assert.equal(body.businessDescription, 'I rent my car');
  });
});
