import type { ContentBlock } from '../pages/legalContentTypes';

export const ADDITIONAL_USAGE_POLICY_BLOCKS: ContentBlock[] = [
  { type: 'updated', text: 'Last updated: July 28, 2026' },
  {
    type: 'p',
    text: 'It is very important that guests return vehicles at the scheduled trip end time. When a guest is late it can cause a disruption in the hosts schedule and unnecessary stress. If a guest needs to extend their trip or will be late it is always recommended that they contact the host as soon as possible and send a trip extension to avoid any issues related to scheduling and or stress to the host. We recommend that the host and guest stay in regular contact to avoid situations like this from arising.',
  },
  { type: 'section', title: 'Guest Obligation' },
  {
    type: 'p',
    text: 'It is the guests obligation to return the vehicle to the host on time. We expect guests to be aware of the effects that returning a vehicle late can have on a host. If there is the possibility of returning the vehicle late to the host we always recommend that the host is contacted right away as well as Rent Your Ride support. It is also recommended that a trip extension is sent as soon as possible. Trip extensions are only valid if they are booked through the platform. Anything booked outside of the platform is not permitted whether it be a verbal or written transaction. A trip extension can’t be booked if there is insufficient funds or if the vehicle is not available. If this is the case the vehicle must be returned to the host at the scheduled end time of the trip. If the vehicle is returned more than 30 minutes after the trip end time the guest is subject to fines and fees for late return.',
  },
  { type: 'section', title: 'Host Obligation' },
  {
    type: 'p',
    text: 'It is the hosts obligation to try to accommodate any late returns or trip extensions within reason. We expect hosts to stay in regular contact with the guest regarding return times and trip usage. If the host would like to charge the guest for additional usage of the vehicle they must message the guest as soon as possible notifying them to extend the trip and that they will be charged for additional usage.',
  },
  { type: 'section', title: 'Late Return Fee' },
  {
    type: 'p',
    text: 'If a guest returns a vehicle more than 30 minutes after the scheduled trip has ended they may be charged a $20 late return fee plus the cost of the additional hours they have used the vehicle.',
  },
];
