/**
 * RYRA-489: signAgreement role checks + tripStart guest signature gate.
 * Run: npx tsx --test src/bookings/sign-agreement-trip-start.spec.ts
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingEntity } from '../entities/booking.entity';

function makeBooking(overrides: Partial<BookingEntity> = {}): BookingEntity {
  const b = new BookingEntity();
  b.id = 'booking-1';
  b.guestUserId = 'guest-1';
  b.hostUserId = 'host-1';
  b.status = 'checkin_pending';
  b.lifecycle = {};
  b.bookingDates = { start: Date.now() + 86_400_000, end: Date.now() + 2 * 86_400_000 };
  b.listingSnapshot = {};
  b.createdAt = new Date('2024-01-01T00:00:00.000Z');
  b.updatedAt = new Date('2024-01-01T00:00:00.000Z');
  b.toMobileDto = BookingEntity.prototype.toMobileDto.bind(b);
  Object.assign(b, overrides);
  return b;
}

function harness(booking: BookingEntity) {
  const saved: BookingEntity[] = [];
  const service = new BookingsService(
    {
      findOne: async () => booking,
      save: async (row: BookingEntity) => {
        saved.push(row);
        return row;
      },
    } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { postBookingSystemMessage: async () => undefined } as never,
    {
      bookingCheckedIn: () => undefined,
      bookingCheckedOut: () => undefined,
      hostPayoutReviewReminder: () => undefined,
    } as never,
    {
      isConfigured: () => false,
      transferHostEarningsForBooking: async () => undefined,
    } as never,
  );
  return { service, saved };
}

describe('signAgreement role checks', () => {
  it('rejects invalid role', async () => {
    const { service } = harness(makeBooking());
    await assert.rejects(
      () => service.signAgreement('guest-1', 'booking-1', { role: 'admin' }),
      (err: unknown) => err instanceof ForbiddenException,
    );
  });

  it('rejects guest role when caller is host', async () => {
    const { service } = harness(makeBooking());
    await assert.rejects(
      () => service.signAgreement('host-1', 'booking-1', { role: 'guest', signature: 'x' }),
      (err: unknown) => err instanceof ForbiddenException,
    );
  });

  it('writes guestAgreementSignedAt for guest signer', async () => {
    const booking = makeBooking();
    const { service, saved } = harness(booking);
    const dto = await service.signAgreement('guest-1', 'booking-1', {
      role: 'guest',
      signature: 'Guest Name',
    });
    assert.ok(booking.lifecycle?.guestAgreementSignedAt);
    assert.equal(booking.lifecycle?.guestAgreementSignature, 'Guest Name');
    assert.ok(booking.lifecycle?.agreementSignedAt);
    assert.equal(dto.guestAgreementSignedAt, booking.lifecycle?.guestAgreementSignedAt);
    assert.ok(saved.length >= 1);
  });

  it('writes hostAgreementSignedAt for host signer', async () => {
    const booking = makeBooking();
    const { service } = harness(booking);
    await service.signAgreement('host-1', 'booking-1', {
      role: 'host',
      signature: 'Host Name',
    });
    assert.ok(booking.lifecycle?.hostAgreementSignedAt);
    assert.equal(booking.lifecycle?.hostAgreementSignature, 'Host Name');
  });
});

describe('startTrip guest signature gate', () => {
  it('rejects when guest has not signed', async () => {
    const { service } = harness(makeBooking({ lifecycle: {} }));
    await assert.rejects(
      () => service.startTrip('host-1', 'booking-1'),
      (err: unknown) =>
        err instanceof BadRequestException &&
        String((err as BadRequestException).message).includes('guest must sign'),
    );
  });

  it('allows start when guestAgreementSignedAt is set', async () => {
    const booking = makeBooking({
      lifecycle: { guestAgreementSignedAt: Date.now() },
      status: 'checkin_pending',
    });
    const { service } = harness(booking);
    const dto = await service.startTrip('host-1', 'booking-1');
    assert.equal(booking.status, 'active');
    assert.equal(dto.status, 'active');
  });

  it('allows start when legacy rentalAgreementSignedAt is set', async () => {
    const booking = makeBooking({
      lifecycle: { rentalAgreementSignedAt: Date.now() },
      status: 'checkin_pending',
    });
    const { service } = harness(booking);
    await service.startTrip('guest-1', 'booking-1');
    assert.equal(booking.status, 'active');
  });

  it('host check-in CONTINUE (confirmed → checkin_pending) does not require agreement', async () => {
    const booking = makeBooking({ status: 'confirmed', lifecycle: {} });
    const { service } = harness(booking);
    const dto = await service.transitionStatus('host-1', 'booking-1', 'checkin_pending', [
      'confirmed',
    ]);
    assert.equal(dto.status, 'checkin_pending');
  });
});
