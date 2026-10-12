import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import type { BookingEntity } from '../entities/booking.entity';
import type { UserEntity } from '../entities/user.entity';
import {
  BookingNotificationContext,
  formatDateTime,
  guestBreakdownVars,
  hostBreakdownVars,
  listingVehicleVars,
  reviewVars,
  agreementSections,
} from './booking-context';
import type { PinpointSubstitutions } from './template-variables.builder';

const DAY = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 10, 2, 16, 0);
const HTML = join(__dirname, '..', '..', 'email-templates', 'html');

/** Variables a template renders, excluding Handlebars helpers. Pinpoint drops the email if any is missing. */
function templateVars(name: string, folder = 'BookingTemplates'): string[] {
  const html = readFileSync(join(HTML, folder, `${name}.html`), 'utf8');
  const vars = new Set<string>();
  for (const m of html.matchAll(/\{\{\s*(?:#eq\s+)?([A-Za-z][\w.]*)/g)) {
    if (m[1] !== 'else') vars.add(m[1]);
  }
  return [...vars];
}

function assertCovers(name: string, vars: PinpointSubstitutions, folder?: string) {
  const missing = templateVars(name, folder).filter((v) => !(v in vars));
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

  it('ListingApproved', () =>
    assertCovers(
      'ListingApproved',
      {
        'Host.FirstName': ['Michael'],
        ...listingVehicleVars({ title: '2019 Honda Civic', photos: [{ uri: 'https://x/y.jpg' }] }),
      },
      'ListingTemplates',
    ));
});

describe('listingVehicleVars', () => {
  it('uses the listing title and first photo', () => {
    const v = listingVehicleVars({ title: '2019 Honda Civic', photos: [{ uri: 'https://x/y.jpg' }] });
    assert.deepEqual(v['Vehicle.Model'], ['2019 Honda Civic']);
    assert.deepEqual(v['Vehicle.CoverImage'], ['https://x/y.jpg']);
  });

  it('fixes all-caps makes but keeps acronyms and model codes', () => {
    const name = (title: string) => listingVehicleVars({ title })['Vehicle.Model'][0];
    assert.equal(name('2019 HONDA Civic'), '2019 Honda Civic');
    assert.equal(name('2021 MERCEDES-BENZ C300'), '2021 Mercedes-Benz C300');
    assert.equal(name('2020 KIA Soul'), '2020 Kia Soul');
    assert.equal(name('2018 BMW X3'), '2018 BMW X3');
    assert.equal(name('2022 TOYOTA RAV4'), '2022 Toyota RAV4');
    assert.equal(name('2017 HONDA CR-V'), '2017 Honda CR-V');
  });

  it('still sets both keys with no title or photos', () => {
    const v = listingVehicleVars({});
    assert.deepEqual(v['Vehicle.Model'], ['Vehicle']);
    assert.deepEqual(v['Vehicle.CoverImage'], ['']);
  });
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

describe('new payment method email', () => {
  it('renders every variable', () =>
    assertCovers(
      'AccountActivityNewPaymentMethod',
      { 'User.FirstName': ['Michael'], 'Card.Brand': ['Visa'], 'Card.CreatedAt': ['x'] },
      'AccountTemplates',
    ));

  it('shows the time in Winnipeg time', () => {
    assert.equal(formatDateTime(Date.UTC(2026, 9, 11, 18, 8)), 'October 11, 2026 at 1:08 PM');
  });
});

describe('review received emails', () => {
  const reviewed = new BookingNotificationContext(
    {
      ...booking,
      lifecycle: { guestReview: { rating: 4, text: 'Great car!' }, hostReview: { rating: 5, text: '' } },
    } as unknown as BookingEntity,
    guest,
    host,
  );

  it('GuestNameWroteAReview', () =>
    assertCovers('GuestNameWroteAReview', reviewed.reviewReceivedVars('guest'), 'ReviewTemplates'));
  it('HostWroteYouAReview', () =>
    assertCovers('HostWroteYouAReview', reviewed.reviewReceivedVars('host'), 'ReviewTemplates'));

  it('shows stars, rating and comment', () => {
    const v = reviewed.reviewReceivedVars('guest');
    assert.deepEqual(v['Review.Stars'], ['★★★★☆']);
    assert.deepEqual(v['Review.Rating'], ['4']);
    assert.deepEqual(v['Review.Comment'], ['Great car!']);
    assert.deepEqual(v['Vehicle.Model'], ['2019 Honda Civic']);
  });

  it('clamps rating and allows an empty comment', () => {
    assert.deepEqual(reviewVars({ rating: 9 })['Review.Stars'], ['★★★★★']);
    assert.deepEqual(reviewVars(undefined)['Review.Rating'], ['1']);
    assert.deepEqual(reviewVars({ rating: 3, text: '  ' })['Review.Comment'], ['']);
  });
});

describe('booking date labels', () => {
  it('car-local bookings show the car timezone', () => {
    const local = new BookingNotificationContext(
      {
        ...booking,
        bookingDates: {
          start: Date.parse('2026-10-12T17:00:00Z'),
          end: Date.parse('2026-10-13T17:00:00Z'),
          startTime: '12:00 PM',
          endTime: '12:00 PM',
          timeZone: 'America/Winnipeg',
        },
      } as unknown as BookingEntity,
      guest,
      host,
      'America/Winnipeg',
    );
    assert.equal(local.startLabel(), 'October 12, 2026 at 12:00 PM CT');
    assert.equal(local.endLabel(), 'October 13, 2026 at 12:00 PM CT');
  });
});

describe('admin agreement sections', () => {
  it('matches the app breakdown and hides empty rows', () => {
    const sections = agreementSections(
      { pricePerDay: 56, baseTripSubtotal: 56, discountedTripSubtotal: 56, subtotal: 56, tripFee: 5.6000000000000005, grandTotal: 61.6, selectedExtras: [] },
      1,
      '200 km',
    );
    assert.deepEqual(sections, [
      {
        title: 'Guest Pays',
        arr: [
          { title: '$56.00 × 1 day', value: '$56.00' },
          { title: 'Subtotal', value: '$56.00' },
          { title: 'Trip fee', value: '$5.60' },
          { title: 'Total', value: '$61.60' },
        ],
      },
      {
        title: 'Host Receives',
        arr: [
          { title: 'Subtotal', value: '$56.00' },
          { title: 'Service fee (25%)', value: '($14.00)' },
          { title: 'Host receives', value: '$42.00' },
        ],
      },
      {
        title: 'Trip',
        arr: [
          { title: 'Days', value: '1' },
          { title: 'Kilometres included', value: '200 km' },
        ],
      },
    ]);
  });
});
