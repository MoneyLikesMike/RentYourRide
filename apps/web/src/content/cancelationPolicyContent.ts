import type { ContentBlock } from '../pages/legalContentTypes';

export const CANCELATION_POLICY_BLOCKS: ContentBlock[] = [
  { type: 'updated', text: 'Last updated: July 28, 2026' },
  {
    type: 'p',
    text: 'Rent Your Ride has created a cancellation policy that allows users to have the flexibility of cancelling their trips with both hosts and guests in mind. A guest or host who wants to cancel their trip must notify the guest or host through the Rent Your Ride website or app. Sometimes Rent Your Ride may cancel a trip on the guest or host’s behalf. Rent Your Ride will notify the guest and host in the event this happens.',
  },
  { type: 'section', title: 'Guest Cancelation' },
  {
    type: 'p',
    text: 'Guests can cancel their trip at any time through our mobile app or website. The cancellation is effective immediately and is based on the local time in respect to the vehicle location. The refunded amount will depend on when the trip has been canceled in reference to the trip start time and the length of her trip.',
  },
  { type: 'section', title: 'Free Cancelation' },
  {
    type: 'p',
    text: 'Guests who cancel their trip more than 24 hours in advance will not have to pay a cancellation fee. A guest can receive free cancelation if they cancel a trip within one hour after booking a trip within a shorter time period of 24 hours or less from when the trip begins.',
  },
  { type: 'section', title: 'Guest Cancelation Fees' },
  {
    type: 'p',
    text: 'If a guest cancels a trip that is two days or longer in duration they are charged one day’s trip cost including the trip fee. If a guest cancels a trip that is one day in duration or less the guest will be charged 50% of the trip cost including the trip fee. If a delivery fee was applicable to the total rental cost, 50% of the delivery fee will be refunded regardless of the trip length.',
  },
];
