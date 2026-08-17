import type { ContentBlock } from '../pages/legalContentTypes';

export const VEHICLE_CLEANING_POLICY_BLOCKS: ContentBlock[] = [
  { type: 'updated', text: 'Last updated: July 28, 2026' },
  { type: 'section', title: 'Cleaning Policy' },
  {
    type: 'p',
    text: 'Rent Your Ride hosts are expected to provide a clean vehicle before the trip starts. Rent Your Ride guests are expected to return a clean vehicle when the trip has ended.',
  },
  {
    type: 'p',
    text: 'If a guest arrives for their trip and the vehicle is unacceptably dirty to do begin the trip. Contact Rent Your Ride support and document the vehicles condition by taking photos. Rent Your Ride will help the guest find a new vehicle to rent or come to a resolution with the vehicle owner for compensation of providing a dirty vehicle.',
  },
  {
    type: 'p',
    text: 'If a guest returns a vehicle unacceptably dirty document the vehicles condition by taking photos. Contact Rent Your Ride support. There are different levels of cleanliness defined by Rent Your Ride with different fees associated.',
  },
  { type: 'section', title: 'Clean' },
  {
    type: 'p',
    text: 'A vehicle that is returned clean is ineligible for fines to the guest or refunds to the host. A vehicle is considered clean after a trip if there is light dirt, water sports, bugs caused by daily driving. If there is minimal amounts of trash in the vehicle. If the floor mats have dirt or crumbs that can be shaken off or vacuumed. If there are any marks on the vehicle that can be cleaned off with ease by hand.',
  },
  { type: 'section', title: 'Moderately Clean' },
  {
    type: 'p',
    text: 'A vehicle is considered moderately clean if it is returned with a significant amount of dirt that can’t be removed easily. If the floor mats or upholstery require a heavy vacuum. If the vehicle is returned with light stains o residue on surfaces of the vehicle. A guest who returns a vehicle moderately clean is subject to a $50 cleaning fee.',
  },
  { type: 'section', title: 'Dirty' },
  {
    type: 'p',
    text: 'A vehicle is considered dirty if it is returned with heavy stains or residue on the vehicle that require a detail. Guests who return a vehicle dirty are subject to a $100 cleaning fee.',
  },
  { type: 'section', title: 'Very Dirty' },
  {
    type: 'p',
    text: 'A vehicle is considered very dirty if it is returned with enormous amounts dirt, heavy stains or residue on the vehicle. If the vehicle requires a heavy detail it is considered very dirty. A guest who returns a vehicle very dirty is subject to a $150 cleaning fee.',
  },
  { type: 'section', title: 'Smoking Policy Guests' },
  {
    type: 'p',
    text: 'Smoking is not permitted by guests and passengers while using a non-smoking vehicle from the Rent Your Ride community.',
  },
  {
    type: 'p',
    text: 'To ensure this policy is enforced at all times, Rent Your Ride does deal with reports of smoking very seriously. If the host of a non smoking vehicle reports a smoke smell within the first 24 hours prior to getting the vehicle back, the user who is renting the vehicle off of the owner is subjected to a fine and potential removal from the community. The smoking fee applicable to guests is $150.',
  },
  {
    type: 'p',
    text: 'If you are a smoker, we strongly suggest that this is taken into serious consideration while selecting your next vehicle while using Rent Your Ride to prevent the consequences which come along with not following our policies. If a smoke smell is present in a non-smoking vehicle at the start of a trip, the guest should immediately inform Rent Your Ride to avoid being held responsible for the violation.',
  },
  { type: 'section', title: 'Smoking Policy Hosts' },
  {
    type: 'p',
    text: 'Each vehicle listed within the Rent Your Ride community must indicate whether it is a smoking or non-smoking vehicle to ensure all users are aware of this detail. If the host fails to be honest about this detail, the guest has the option to decline the trip without charge and will receive a full refund. The owner will then be subjected to fines and potentially the removal from the community. The fee applicable to a host for failing to notify the guest of a vehicle that is smoked in is $50.',
  },
  { type: 'section', title: 'Pets Policy' },
  {
    type: 'p',
    text: 'We know that pets are very cute and are a part of your family! We care for pets as much as we care for each other but.... They are not allowed in any vehicle without explicit content from the vehicle host. If a report is filed that a guest has transported a pet without the permission of the host, the guest will be subjected to pay additional fees. This will also result in potential negative reviews on the guests file and potential removal from the Rent Your Ride community for violating the Terms of Service. A pet fee of $150 will be subjected to the guest who booked the vehicle.',
  },
  { type: 'section', title: 'Fee Overview' },
  {
    type: 'table',
    headers: ['Violation', 'Fee'],
    rows: [
      ['Host supplying a dirty vehicle.', 'Cancelled trip.'],
      ['Guest returning a vehicle clean.', '$0'],
      ['Guest returning a vehicle moderately clean.', '$50'],
      ['Guest returning a vehicle dirty.', '$100'],
      ['Guest returning a vehicle very dirty.', '$150'],
      ['Host failing to notify their vehicle is smoked in.', '$50'],
      ['Pets in vehicle.', '$150'],
    ],
  },
];
