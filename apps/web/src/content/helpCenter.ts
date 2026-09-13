/**
 * Help centre knowledge base powering the search and topic filters on /contact.
 * Answers are plain text so they can be matched by search; anything that needs
 * the full legal wording links out to the policy pages.
 */

export type HelpAudience = 'guest' | 'host' | 'both';

export type HelpTopicId =
  | 'booking'
  | 'hosting'
  | 'payments'
  | 'insurance'
  | 'changes'
  | 'account';

export type HelpTopic = {
  id: HelpTopicId;
  label: string;
  blurb: string;
};

export type HelpArticle = {
  id: string;
  topic: HelpTopicId;
  audience: HelpAudience;
  question: string;
  /** Leading paragraphs, shown before any steps. */
  answer: string[];
  /** Rendered as a numbered list under the answer. */
  steps?: string[];
  link?: { label: string; to: string };
};

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'booking',
    label: 'Booking a ride',
    blurb: 'Finding a vehicle, requesting it and picking it up.',
  },
  {
    id: 'hosting',
    label: 'Listing your ride',
    blurb: 'Getting your vehicle listed and earning from it.',
  },
  {
    id: 'payments',
    label: 'Payments & payouts',
    blurb: 'Fees, when you are charged and when you get paid.',
  },
  {
    id: 'insurance',
    label: 'Insurance & protection',
    blurb: 'Coverage by province, tickets and damage.',
  },
  {
    id: 'changes',
    label: 'Changes & cancellations',
    blurb: 'Refunds, moving a trip and cancelled bookings.',
  },
  {
    id: 'account',
    label: 'Account & safety',
    blurb: 'Requirements, check in, check out and your account.',
  },
];

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'book-a-ride',
    topic: 'booking',
    audience: 'guest',
    question: 'How do I book a ride?',
    answer: ['Booking a vehicle on Rent Your Ride takes five steps.'],
    steps: [
      'Join the family. The RYR platform is a way to build relationships — by joining you’re joining a safe, trusted community.',
      'Find the perfect ride. Search available listings in your city and refine your results to best suit your trip.',
      'Send a booking request. The host will accept or deny your request. If it’s an instant booking you’ll get an automatic approval.',
      'Meet the host. Bring your license, do a full walk around of the vehicle and complete the check in process through the app.',
      'Return the vehicle clean and with a full tank. Do a walk around, complete the checkout process through the app and leave a review for your host.',
    ],
    link: { label: 'See how it works', to: '/how-it-works' },
  },
  {
    id: 'minimum-age',
    topic: 'booking',
    audience: 'guest',
    question: 'What is the minimum age to rent a vehicle?',
    answer: [
      'The minimum age required to rent a vehicle on our platform is 18. We want to make sure the Rent Your Ride community is safe for both guests and hosts, so it is also up to the host whether they rent their vehicle out to a certain age group.',
    ],
  },
  {
    id: 'instant-booking',
    topic: 'booking',
    audience: 'guest',
    question: 'What is the difference between a request and an instant booking?',
    answer: [
      'On a standard listing you send a booking request and the host accepts or denies it. On an instant booking listing your reservation is approved automatically as soon as you book, so there is no waiting on the host.',
    ],
  },
  {
    id: 'list-a-ride',
    topic: 'hosting',
    audience: 'host',
    question: 'How do I list my ride?',
    answer: ['Listing your vehicle and earning from it takes five steps.'],
    steps: [
      'Join the family. By joining RYR you’re joining a safe, trusted community.',
      'List your ride and start making money. Set your daily price, add a description and upload some pictures.',
      'Start responding to your guests. Guests can instantly book your ride or send a request based on your listing.',
      'Meet your guest. Provide a clean vehicle with a full tank of fuel, do a walk around and complete the check in process on the app.',
      'Receive your ride back with money in your pocket. Do a walk around, complete the checkout process through the app and leave a review for your guest.',
    ],
    link: { label: 'List your ride', to: '/profile/list-your-ride' },
  },
  {
    id: 'earnings',
    topic: 'hosting',
    audience: 'host',
    question: 'How much will I earn?',
    answer: [
      'You earn 75% of your daily rental price and 100% of any extras you include. For example, if your daily rental price is $100 a day you are paid $75 a day at the end of the trip, and if you charge a $35 delivery fee you keep all $35.',
      'For any reimbursements — fuel, tickets, excess mileage, cleaning and smoking — you receive 100% of the reimbursement.',
    ],
  },
  {
    id: 'taxes',
    topic: 'hosting',
    audience: 'host',
    question: 'How do taxes work?',
    answer: [
      'Income earned by sharing your car is taxable. You can see your total earnings in the completed trips section of the app, and we are happy to send you receipts of your trip earnings on request.',
    ],
  },
  {
    id: 'get-paid',
    topic: 'payments',
    audience: 'host',
    question: 'How do I get paid?',
    answer: [
      'Add your payout information while listing your first ride and we deposit your earnings directly into your account. It may take up to five business days after the trip has been completed.',
    ],
    link: { label: 'Payment information', to: '/profile/payment-information' },
  },
  {
    id: 'when-charged',
    topic: 'payments',
    audience: 'guest',
    question: 'When do I pay for the rental?',
    answer: [
      'When you request a vehicle your card payment is authorized. That does not mean funds have been debited — a temporary hold is placed on them. When the host accepts your request the total trip amount is charged to your card and a receipt is sent to you.',
    ],
  },
  {
    id: 'fees',
    topic: 'payments',
    audience: 'both',
    question: 'What fees will I pay?',
    answer: [
      'There is only one fee applied to every rental: the trip fee, which is 10% of the total trip price. It covers costs like transaction fees and our customer support so we can keep the platform safe and low risk.',
      'A delivery fee may also apply if the host drops the vehicle off to you — that amount is set by the host. Additional fees can be added if a vehicle is returned in a worse state than it left in.',
    ],
    link: {
      label: 'Fines and fees policy',
      to: '/terms-conditions?section=additional-usage',
    },
  },
  {
    id: 'insurance-mb',
    topic: 'insurance',
    audience: 'both',
    question: 'How does insurance work in Manitoba?',
    answer: [
      'Vehicles in Manitoba must be insured under “Udrive” insurance to have full coverage while being rented. Udrive covers up to $50,000 of vehicle value, and you can increase your maximum insured value if you want more.',
      'Liability is $200,000 with a $500 deductible, which can also be increased through extended coverage. Manitoba locals can buy additional rental car insurance through a local Autopac agent.',
    ],
    link: { label: 'Insurance details', to: '/insurance' },
  },
  {
    id: 'insurance-sk',
    topic: 'insurance',
    audience: 'both',
    question: 'How does insurance work in Saskatchewan?',
    answer: [
      'Vehicles in Saskatchewan must be insured under “Udrive” insurance to have full coverage while being rented. Udrive covers up to $50,000 of vehicle value and you can increase your maximum insured value. Liability is $200,000 with a $700 deductible.',
    ],
    link: { label: 'Insurance details', to: '/insurance' },
  },
  {
    id: 'tickets',
    topic: 'insurance',
    audience: 'both',
    question: 'What happens if the guest gets a parking or speeding ticket?',
    answer: [
      'The guest is responsible for any ticket received during their trip and it must be paid in full immediately. Guests should let the host know about any fines they had to pay, and proof of payment can be shared to keep everything transparent.',
      'If a ticket arrives later and matches the time the guest had the vehicle, send it to our support team — we authenticate it, match it to the trip and make the guest responsible. If the host was not notified during the trip or within 24 hours of the vehicle being returned, we add the full cost of the ticket and any related fees to the guest’s account.',
    ],
    link: {
      label: 'Tickets policy',
      to: '/terms-conditions?section=driving-parking-tickets',
    },
  },
  {
    id: 'refunds',
    topic: 'changes',
    audience: 'guest',
    question: 'Can I get a refund?',
    answer: ['Of course you can get a refund — here is how it works.'],
    steps: [
      'Cancel more than 24 hours in advance, or within 1 hour of booking, and there are no penalties or fees.',
      'Cancel less than 24 hours before the trip begins and you receive a 50% refund of the total trip cost, including the trip fee and delivery fee.',
      'Cancel during the trip and no refund is issued. If the cancellation is due to a dispute between guest and host, Rent Your Ride investigates and acts on its findings.',
    ],
    link: {
      label: 'Cancellation policy',
      to: '/terms-conditions?section=cancelation',
    },
  },
  {
    id: 'change-reservation',
    topic: 'changes',
    audience: 'guest',
    question: 'What if I want to change my reservation?',
    answer: [
      'We understand that plans change. Changing a reservation more than 24 hours in advance does not result in any fees. To change a reservation, cancel your current booking and send a new booking request.',
    ],
    link: {
      label: 'Cancellation policy',
      to: '/terms-conditions?section=cancelation',
    },
  },
  {
    id: 'host-cancels',
    topic: 'changes',
    audience: 'both',
    question: 'What if the host cancels the reservation?',
    answer: [
      'Hosts can cancel up to 24 hours in advance without a cancellation fee. Cancelling less than 24 hours in advance incurs one. If your host cancels, Rent Your Ride will help you find a new vehicle for your trip.',
    ],
    link: {
      label: 'Cancellation policy',
      to: '/terms-conditions?section=cancelation',
    },
  },
  {
    id: 'check-in-out',
    topic: 'account',
    audience: 'both',
    question: 'How do check in and check out work?',
    answer: [
      'At pickup, meet your host, bring your license and do a full walk around of the vehicle before completing check in through the app. At drop off, do another walk around and complete the checkout process in the app.',
      'Both steps capture the condition the vehicle went out and came back in, which protects the host and the guest if anything is ever disputed.',
    ],
  },
  {
    id: 'verification',
    topic: 'account',
    audience: 'both',
    question: 'Why do I need to verify my license?',
    answer: [
      'Verification keeps the community safe. We confirm your driver’s license before you can book or list a vehicle so hosts know who is driving and guests know they are renting from a verified member.',
    ],
    link: { label: 'Contact information', to: '/profile/contact-information' },
  },
  {
    id: 'account-changes',
    topic: 'account',
    audience: 'both',
    question: 'How do I update or delete my account?',
    answer: [
      'You can change your details any time from your profile. If you would like to deactivate or delete your account entirely, email support@rentyourride.ca and we will take care of it.',
    ],
    link: { label: 'Edit profile', to: '/profile/edit' },
  },
];

/** Free-text match across question, answer, steps and topic label. */
export function searchHelpArticles(
  articles: HelpArticle[],
  query: string,
): HelpArticle[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return articles;

  return articles.filter((article) => {
    const topic = HELP_TOPICS.find((item) => item.id === article.topic);
    const haystack = [
      article.question,
      ...article.answer,
      ...(article.steps ?? []),
      topic?.label ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}
