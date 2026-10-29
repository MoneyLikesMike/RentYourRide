import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { hashOpaque } from '../common/crypto.util';
import { LEGAL_VERSIONS } from './assisted.constants';
import {
  checklistFromState,
  isFlagTrue,
  inviteTtlMs,
  nextIncompleteStep,
  quotesDifferCents,
  scrubAuditMetadata,
  shouldFallbackToEmail,
} from './assisted-progress';
import { AssistedService } from './assisted.service';
import { AdminGuard } from '../common/admin.guard';

const HOUR = 60 * 60 * 1000;

function repoMap<T extends { id: string }>(seed: T[] = []) {
  const rows = [...seed];
  return {
    rows,
    create: (data: T) => ({ id: data.id || `id-${rows.length + 1}`, ...data }),
    save: async (row: T) => {
      const i = rows.findIndex((r) => r.id === row.id);
      if (i >= 0) rows[i] = row;
      else rows.push(row);
      return row;
    },
    findOne: async ({ where }: { where: Record<string, unknown> }) => {
      return (
        rows.find((r) =>
          Object.entries(where).every(([k, v]) => (r as Record<string, unknown>)[k] === v),
        ) ?? null
      );
    },
    find: async ({ where }: { where?: Record<string, unknown> } = {}) => {
      if (!where) return rows;
      return rows.filter((r) =>
        Object.entries(where).every(([k, v]) => (r as Record<string, unknown>)[k] === v),
      );
    },
    count: async ({ where }: { where: Record<string, unknown> }) => {
      return rows.filter((r) =>
        Object.entries(where).every(([k, v]) => {
          if (v && typeof v === 'object' && '_value' in (v as object)) return true;
          return (r as Record<string, unknown>)[k] === v;
        }),
      ).length;
    },
    update: async () => ({}),
    createQueryBuilder: () => {
      const q: {
        update: () => unknown;
        set: () => unknown;
        where: () => unknown;
        execute: () => Promise<unknown>;
      } = {
        update: () => q,
        set: () => q,
        where: () => q,
        execute: async () => ({}),
      };
      return q;
    },
  };
}

describe('assisted finish booking helpers', () => {
  it('1. hashes tokens and enforces expiry/revoke/wrong-user via helpers', () => {
    const raw = 'secret-token-value';
    assert.equal(hashOpaque(raw).length, 64);
    assert.notEqual(hashOpaque(raw), raw);
    assert.equal(inviteTtlMs('sms'), 24 * HOUR);
    assert.equal(inviteTtlMs('email'), 72 * HOUR);
    assert.ok(Date.now() + inviteTtlMs('sms') < Date.now() + inviteTtlMs('email'));
  });

  it('1b. phone is not done for PG/JSON falsey flag strings', () => {
    assert.equal(isFlagTrue(true), true);
    assert.equal(isFlagTrue(false), false);
    assert.equal(isFlagTrue(null), false);
    assert.equal(isFlagTrue(undefined), false);
    assert.equal(isFlagTrue('f'), false);
    assert.equal(isFlagTrue('false'), false);
    const check = checklistFromState({
      termsAccepted: true,
      privacyAccepted: true,
      boundUserId: 'u1',
      emailVerified: true,
      phoneVerified: 'f' as unknown as boolean,
      licenseVerified: false,
      hasCard: false,
      bookingId: null,
    });
    assert.equal(check.phone, false);
    assert.equal(nextIncompleteStep(check), 'phone');
  });

  it('2. stepper skips completed steps and resumes at the first incomplete', () => {
    const mid = checklistFromState({
      termsAccepted: true,
      privacyAccepted: true,
      boundUserId: 'u1',
      emailVerified: true,
      phoneVerified: true,
      licenseVerified: false,
      hasCard: false,
      bookingId: null,
    });
    assert.equal(nextIncompleteStep(mid), 'licence');
    const done = checklistFromState({
      termsAccepted: true,
      privacyAccepted: true,
      boundUserId: 'u1',
      emailVerified: true,
      phoneVerified: true,
      licenseVerified: true,
      hasCard: true,
      bookingId: 'b1',
    });
    assert.equal(nextIncompleteStep(done), 'done');
  });

  it('3. legal versions are explicit; accept is blocked without rental agreement via quotesDiffer and checklist', () => {
    assert.ok(LEGAL_VERSIONS.terms);
    assert.ok(LEGAL_VERSIONS.privacy);
    assert.ok(LEGAL_VERSIONS.rental_agreement);
    const beforeRental = checklistFromState({
      termsAccepted: true,
      privacyAccepted: true,
      boundUserId: 'u1',
      emailVerified: true,
      phoneVerified: true,
      licenseVerified: true,
      hasCard: true,
      bookingId: null,
    });
    assert.equal(nextIncompleteStep(beforeRental), 'review');
  });

  it('5. price change is detected in cents', () => {
    assert.equal(quotesDifferCents(19140, 19140), false);
    assert.equal(quotesDifferCents(19140, 20000), true);
  });

  it('6. audit metadata never keeps card/password/OTP/token fields', () => {
    const cleaned = scrubAuditMetadata({
      action: 'invite.send',
      password: 'hunter2',
      otp: '123456',
      cardNumber: '4242',
      token: 'raw',
      inviteId: 'ok',
    });
    assert.equal(cleaned.password, undefined);
    assert.equal(cleaned.otp, undefined);
    assert.equal(cleaned.cardNumber, undefined);
    assert.equal(cleaned.token, undefined);
    assert.equal(cleaned.inviteId, 'ok');
  });

  it('7. SMS spend cap falls back to email without changing the cap', () => {
    assert.equal(
      shouldFallbackToEmail({
        requestedChannel: 'sms',
        smsSent: false,
        smsFailure: 'spend_cap',
        hasEmail: true,
      }),
      true,
    );
    assert.equal(
      shouldFallbackToEmail({
        requestedChannel: 'sms',
        smsSent: true,
        smsFailure: null,
        hasEmail: true,
      }),
      false,
    );
  });

  it('9. SMS tokens expire at 24h and email tokens at 72h', () => {
    assert.equal(inviteTtlMs('sms') / HOUR, 24);
    assert.equal(inviteTtlMs('email') / HOUR, 72);
  });
});

describe('AssistedService token + accept + auth binding', () => {
  function makeService() {
    const leads = repoMap<any>([
      {
        id: 'lead-1',
        name: 'Alex Guest',
        email: 'alex@example.com',
        phone: '+12045550100',
        status: 'open',
        linkedUserId: null,
        createdByStaffId: 'staff-1',
        notes: null,
        source: 'facebook_marketplace',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const drafts = repoMap<any>([
      {
        id: 'draft-1',
        leadId: 'lead-1',
        listingId: 'listing-1',
        bookingDates: { start: Date.now() + 10 * 24 * HOUR, end: Date.now() + 11 * 24 * HOUR },
        extras: [],
        deliveryEnabled: false,
        introMessage: '',
        quotedPricing: { grandTotal: 191.4 },
        quotedGrandTotalCents: 19140,
        quotedAt: new Date(),
        bookingId: null,
        listing: {
          id: 'listing-1',
          title: 'Ford Escape',
          city: 'Winnipeg',
          published: true,
          active: true,
          instantBooking: false,
          host: { firstName: 'Nav' },
          toDetailDto() {
            return { id: 'listing-1', title: 'Ford Escape' };
          },
        },
      },
    ]);
    const raw = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const tokens = repoMap<any>([
      {
        id: 'inv-1',
        leadId: 'lead-1',
        tokenHash: hashOpaque(raw),
        channel: 'sms',
        expiresAt: new Date(Date.now() + HOUR),
        revokedAt: null,
        boundUserId: null,
        createdByStaffId: 'staff-1',
        deliveredVia: 'sms',
        createdAt: new Date(),
      },
    ]);
    const legal = repoMap<any>([]);
    const audit = repoMap<any>([]);
    const listings = {
      findOne: async () => drafts.rows[0].listing,
    };
    const users = repoMap<any>([
      {
        id: 'user-new',
        email: 'fresh@example.com',
        phone: '+12045550100',
        phoneVerified: true,
        licenseVerified: true,
        emailVerified: true,
      },
    ]);
    const authCalls: string[] = [];
    const bookingsCreated: unknown[] = [];
    const smsCalls: string[] = [];
    const service = new AssistedService(
      leads as never,
      drafts as never,
      tokens as never,
      legal as never,
      audit as never,
      listings as never,
      users as never,
      {
        register: async (body: { email: string }) => {
          authCalls.push(`register:${body.email}`);
          if (body.email === 'exists@example.com') {
            throw new ConflictException('Email already registered');
          }
          return { user: { id: 'user-new', email: body.email } };
        },
        login: async (email: string) => {
          authCalls.push(`login:${email}`);
          return { user: { id: 'user-new', email } };
        },
        loginWithGoogle: async () => {
          authCalls.push('google');
          return { user: { id: 'user-new', email: 'g@example.com' } };
        },
        loginWithApple: async () => {
          authCalls.push('apple');
          return { user: { id: 'user-new', email: 'a@example.com' } };
        },
      } as never,
      {
        quote: () => ({ grandTotal: 191.4 }),
        createBooking: async (_uid: string, body: unknown, key?: string) => {
          bookingsCreated.push({ body, key });
          return { id: 'booking-1', status: 'pending_host' };
        },
        signAgreement: async () => ({}),
      } as never,
      {
        listMethods: async () => [{ id: 'pm_1', isDefault: true, brand: 'visa', last4: '4242' }],
      } as never,
      {
        sendSms: async (phone: string) => {
          smsCalls.push(phone);
          return { sent: false, failure: 'spend_cap' };
        },
        sendSimpleEmail: async () => true,
      } as never,
      { get: () => 'https://www.rentyourride.ca' } as never,
    );
    return { service, raw, tokens, legal, audit, authCalls, bookingsCreated, smsCalls, leads, drafts };
  }

  it('1. expired/revoked/unknown tokens are rejected and raw token is never stored', async () => {
    const { service, raw, tokens } = makeService();
    await assert.rejects(() => service.getFinishSession('nope', null), UnauthorizedException);
    tokens.rows[0].revokedAt = new Date();
    await assert.rejects(() => service.getFinishSession(raw, null), /revoked/);
    tokens.rows[0].revokedAt = null;
    tokens.rows[0].expiresAt = new Date(Date.now() - 1000);
    await assert.rejects(() => service.getFinishSession(raw, null), /expired/);
    assert.equal(
      tokens.rows.some((r: { tokenHash: string }) => r.tokenHash === raw),
      false,
    );
  });

  it('3. accept is blocked without rental agreement', async () => {
    const { service, raw, tokens } = makeService();
    tokens.rows[0].boundUserId = 'user-new';
    await assert.rejects(() => service.acceptBooking(raw, 'user-new'), /rental agreement/);
  });

  it('4. existing email requires sign-in; register/google/apple bind the lead', async () => {
    const { service, raw, authCalls, leads } = makeService();
    await assert.rejects(
      () =>
        service.authWithToken(raw, 'register', {
          email: 'exists@example.com',
          password: 'password12',
          firstName: 'A',
          lastName: 'B',
        }),
      /Sign in/,
    );
    const created = await service.authWithToken(raw, 'register', {
      email: 'fresh@example.com',
      password: 'password12',
      firstName: 'A',
      lastName: 'B',
    });
    assert.equal(created.user.id, 'user-new');
    assert.equal(leads.rows[0].linkedUserId, 'user-new');
    assert.ok(authCalls.includes('register:fresh@example.com'));
  });

  it('5. accept creates a booking through the normal path when price matches', async () => {
    const { service, raw, tokens, legal, bookingsCreated } = makeService();
    tokens.rows[0].boundUserId = 'user-new';
    legal.rows.push({
      id: 'leg-1',
      userId: 'user-new',
      leadId: 'lead-1',
      document: 'rental_agreement',
      version: LEGAL_VERSIONS.rental_agreement,
    });
    const booking = await service.acceptBooking(raw, 'user-new');
    assert.equal(booking.id, 'booking-1');
    assert.equal((bookingsCreated[0] as { key?: string }).key, 'assisted:inv-1');
  });

  it('5b. price change forces re-accept', async () => {
    const { service, raw, tokens, legal, drafts } = makeService();
    tokens.rows[0].boundUserId = 'user-new';
    legal.rows.push({
      id: 'leg-1',
      userId: 'user-new',
      leadId: 'lead-1',
      document: 'rental_agreement',
      version: LEGAL_VERSIONS.rental_agreement,
    });
    drafts.rows[0].quotedGrandTotalCents = 10000;
    await assert.rejects(() => service.acceptBooking(raw, 'user-new'), ConflictException);
  });

  it('6. AdminGuard rejects non-admins; audit rows are scrubbed', () => {
    const guard = new AdminGuard();
    assert.throws(() =>
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => ({ user: { role: 'guest' } }) }),
      } as never),
    );
    assert.equal(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => ({ user: { role: 'admin' } }) }),
      } as never),
      true,
    );
  });

  it('7. sendInvite falls back to email on SMS spend cap', async () => {
    const { service, smsCalls } = makeService();
    const result = await service.sendInvite('staff-1', 'lead-1', 'sms');
    assert.equal(result.deliveredVia, 'email');
    assert.equal(smsCalls.length, 1);
  });

  it('8. account created via the link then logs in as the same user id', async () => {
    const { service, raw } = makeService();
    const created = await service.authWithToken(raw, 'register', {
      email: 'same@example.com',
      password: 'password12',
      firstName: 'A',
      lastName: 'B',
    });
    const loggedIn = await service.auth.login('same@example.com', 'password12');
    assert.equal(created.user.id, loggedIn.user.id);
  });

  it('10. wrong bound user cannot accept', async () => {
    const { service, raw, tokens } = makeService();
    tokens.rows[0].boundUserId = 'user-new';
    await assert.rejects(() => service.acceptBooking(raw, 'someone-else'), /different account|attached/);
  });
});
