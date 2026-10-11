import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import type { BookingEntity } from '../entities/booking.entity';
import type { UserEntity } from '../entities/user.entity';
import {
  BookingNotificationContext,
  guestBreakdownVars,
  hostBreakdownVars,
} from './booking-context';
import type { PinpointSubstitutions } from './template-variables.builder';

const DAY = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 10, 2, 16, 0);
const TEMPLATES = join(__dirname, '..', '..', 'email-templates', 'html', 'BookingTemplates');

/** Variables a template renders, excluding Handlebars helpers. Pinpoint drops the email if any is missing. */
function templateVars(name: string): string[] {
  const html = readFileSync(join(TEMPLATES, `${name}.html`), 'utf8');
  const vars = new Set<string>();
  for (const m of html.matchAll(/\{\{\s*(?:#eq\s+)?([A-Za-z][\w.]*)/g)) {
    if (m[1] !== 'else') vars.add(m[1]);
  }
  return [...vars];
}

function assertCovers(name: string, vars: PinpointSubstitutions) {
  const missing = templateVars(name).filter((v) => !(v in vars));
  assert.deepEqual(missing, [], `${name} is missing variables`);
}

const pricing = {
  tripDays: 3,
  pricePerDay: 50,
  baseTripSubtotal: 150,
  discountedTripSubtotal: 150,
  unlimitedKmFee: 0,
  prepaidFuelFee: 0,
  prepaidCleanFee: 20,
  selectedDeliveryFee: 25,
  subtotal: 195,
  tripFee: 15,
  grandTotal: 210,
};
const host = { firstName: 'Michael', phone: '' } as UserEntity;
const guest = { firstName: 'Alex', lastName: 'S', avatarUrl: '' } as UserEntity;
const booking = {
  bookingDates: { start: START, end: START + 3 * DAY },
  pricing,
  listingSnapshot: { title: '2019 Honda Civic' },
  introMessage: '',
} as unknown as BookingEntity;
const ctx = new BookingNotificationContext(booking, guest, host);

describe('email templates get every variable they render', () => {
  const cases: Array<[string, () => PinpointSubstitutions]> = [
    ['BookingRequest', () => ctx.createRequestHostVars()],
    ['ConfirmedBookingRequestHost', () => ctx.approveHostVars()],
    ['BookingRequestConfirmedGuest', () => ctx.approveGuestVars()],
    ['YourTripIsBeginningSoonGuest', () => ctx.tripReminderGuestVars()],
    ['TripBeginningSoonHost', () => ctx.tripReminderHostVars()],
    ['YourTripIsEndingSoonGuest', () => ctx.tripEndingGuestVars()],
    ['YourTripIsEndingSoonHost', () => ctx.tripEndingHostVars()],
  ];
  for (const [name, build] of cases) {
    it(name, () => assertCovers(name, build()));
  }

  const extBase = {
    'Renter.FirstName': ['Alex'],
    'Host.FirstName': ['Michael'],
    'Vehicle.Model': ['2019 Honda Civic'],
    'Vehicle.CoverImage': [''],
    'Extension.StartDate': ['x'],
    'Extension.EndDate': ['y'],
  };
  it('YourTripExtensionIsConfirmedGuest', () =>
    assertCovers('YourTripExtensionIsConfirmedGuest', { ...extBase, ...guestBreakdownVars(pricing, 2) }));
  it('YouConfirmedATripExtension', () =>
    assertCovers('YouConfirmedATripExtension', { ...extBase, ...hostBreakdownVars(pricing, 2) }));
});

describe('guestBreakdownVars', () => {
  it('subtotal, trip fee and total from saved pricing', () => {
    const v = guestBreakdownVars(pricing, 3);
    assert.deepEqual(v['Booking.TripDaysLabel'], ['3 days']);
    assert.deepEqual(v['Booking.DiscountAmount'], ['']);
    assert.deepEqual(v['Booking.ExtraClean'], ['$20.00']);
    assert.deepEqual(v['Booking.ExtraKms'], ['']);
    assert.deepEqual(v['Booking.Subtotal'], ['$195.00']);
    assert.deepEqual(v['Booking.TripFee'], ['$15.00']);
    assert.deepEqual(v['Booking.GuestPayTotal'], ['$210.00']);
  });
});
