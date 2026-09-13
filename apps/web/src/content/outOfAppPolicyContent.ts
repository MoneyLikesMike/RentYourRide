import type { ContentBlock } from '../pages/legalContentTypes';

export const OUT_OF_APP_POLICY_BLOCKS: ContentBlock[] = [
  { type: 'updated', text: 'Last updated: July 28, 2026' },
  {
    type: 'p',
    text: 'Rent Your Ride’s number one priority is safety. Rent Your Ride has created a platform that allows guest and hosts perform safe transactions between each other. Accepting any transactions outside of the Rent Your Ride platform is prohibited. This includes making payments, accepting payments, or requesting payments outside of Rent Your Ride. Completing transactions through Rent Your Ride offers extra protection against fraud and allows all transactions to be monitored and tracked.',
  },
  { type: 'section', title: 'Prohibited Transactions' },
  {
    type: 'p',
    text: 'Rent Your Ride is not able to condone or guarantee the safety of the following transactions outside of the app or website through ex. Paypal, Interact E-Transfer, cash, cheque, credit card, and crypto currency. Any of these transactions outside of the Rent Your Ride website to app are prohibited. The following transactions outside of Rent Your Ride are also prohibited.',
  },
  {
    type: 'bullets',
    items: [
      'Deposits',
      'Payments for extras',
      'Trip Cost',
      'Trip Extension',
      'Drop fee',
      'Reimbursement for driving fines (tickets)',
      'Reimbursement for cleaning costs',
      'Reimbursement for fuel',
      'Deposits',
      'Additional mileage charges',
      'Late fees or Irresponsible Return Fee',
    ],
  },
  { type: 'section', title: 'Guest Transactions' },
  {
    type: 'p',
    text: 'Guest can make transactions through the website or the app. If payments are made outside of Rent Your Ride, we are unable to monitor or provide quality service in the event that there is a dispute.',
  },
  {
    type: 'p',
    text: 'If you are making a payment to the host, use the reimbursement tool. If a host asks for payment outside of Rent Your Ride contact our Support Team immediately.',
  },
  { type: 'section', title: 'Host Transactions' },
  {
    type: 'p',
    text: 'Hosts can make transactions through the website or the app. If payments are made outside of Rent Your Ride, we are unable to monitor or provide quality service in the event that there is a dispute.',
  },
  {
    type: 'p',
    text: 'If you are requesting for a payment from the guest after a trip due to additional usage, tickets etc. use our reimbursement tool. If a guest asks for payment outside of Rent Your Ride contact our Support Team immediately.',
  },
];
