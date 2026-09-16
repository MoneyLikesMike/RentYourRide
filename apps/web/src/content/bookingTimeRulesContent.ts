import type { ContentBlock } from '../pages/legalContentTypes';

export const BOOKING_TIME_RULES_BLOCKS: ContentBlock[] = [
  { type: 'updated', text: 'Last updated: July 28, 2026' },

  { type: 'section', title: 'Notice Times' },
  {
    type: 'p',
    text: 'Hosts can choose how much advance notice guests must give when booking. Response windows and booking rules are outlined below.',
  },
  {
    type: 'table',
    headers: ['Notice setting', 'Guest booking rule', 'Host response window'],
    rows: [
      [
        'Instant Booking',
        'Guests can book instantly with no notice.',
        'No host approval required.',
      ],
      [
        '12 hour notice',
        'Guests must book at least 12 hours in advance.',
        'Host has 8 hours to respond before the trip is automatically canceled.',
      ],
      [
        '1 day notice',
        'Guests must book at least 1 day in advance.',
        'Host has 8 hours to respond before the trip is automatically canceled.',
      ],
      [
        '2 day notice',
        'Guests must book at least 2 days in advance.',
        'Host has 8 hours to respond before the trip is automatically canceled.',
      ],
    ],
  },

  { type: 'section', title: 'Trip Extensions' },
  {
    type: 'p',
    text: 'Guests must book a trip extension a maximum of 1 hour before the trip ends. Extensions can’t be sent after the trip ends. How long the host has to respond depends on when the extension was sent:',
  },
  {
    type: 'table',
    headers: ['Extension sent', 'Host response window'],
    rows: [
      ['1 hour before the trip ends', '30 minutes'],
      ['2 hours before the trip ends', '1 hour'],
      ['1 day before the trip ends', '12 hours'],
    ],
  },

  { type: 'section', title: 'Time Between Bookings' },
  {
    type: 'p',
    text: 'Hosts should have a 1 hour minimum gap between bookings so a car can be returned and prepared. If a guest returns a car at 5:00pm, another guest shouldn’t be able to book the vehicle with a start time earlier than 6:00pm.',
  },

  { type: 'section', title: 'Charges' },
  {
    type: 'p',
    text: 'A Rent Your Ride trip day is 24 hours. We charge a single-day trip minimum for the first day only. After that, Rent Your Ride charges by the hour. The same rule applies to trip extensions.',
  },
  {
    type: 'table',
    headers: ['Example', 'Duration', 'Charge'],
    rows: [
      [
        'Day-rate vehicle at $100/day',
        '18 hours',
        '1 day minimum ($100)',
      ],
      [
        'Day-rate vehicle at $100/day',
        '1 day + 12 hours',
        '1 day + 12 hours ($150)',
      ],
      [
        'Trip extension',
        'A couple of hours',
        '1 day minimum charge',
      ],
      [
        'Trip extension',
        '1 day + 12 hours',
        '1 day + hourly rate',
      ],
    ],
  },
];
