import { isValidElement, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ContentPageHero from '../components/ContentPageHero';
import PageMeta, { breadcrumbLd, SITE_ORIGIN } from '../components/PageMeta';
import SiteHeader from '../components/SiteHeader';
import TextDecorator from '../components/TextDecorator';

const FAQS: {
  question: string;
  answer: ReactNode;
}[] = [
  {
    question: 'How does insurance work in Manitoba?',
    answer: (
      <p className="content-page-copy">
        Vehicles in Manitoba must be insured under “Udrive” insurance to have
        full coverage while renting your vehicle. “Udrive” covers up to $50,000
        vehicle value. If you want more coverage you can increase your maximum
        insured value. Liability is $200,000 with a $500 deductible, this can
        also be increased through extended coverage. Locals from Manitoba can
        purchase additional rental car insurance through a local Autopac agent
        if they decide they want more coverage while driving a rental vehicle
        from a host.
      </p>
    ),
  },
  {
    question: 'How does insurance work in Saskatchewan?',
    answer: (
      <p className="content-page-copy">
        Vehicles in Saskatchewan must be insured under “Udrive” insurance to
        have full coverage while renting your vehicle. “Udrive” covers up to
        $50,000 vehicle value. If you want more coverage you can increase your
        maximum insured value. Liability is $200,000 with a $700 deductible.
      </p>
    ),
  },
  {
    question: 'Can I get a refund?',
    answer: (
      <>
        <p className="content-page-copy">Of course you can get a refund!</p>
        <ol className="insurance-steps">
          <li>
            Guests who cancel their trip more than 24 hours in advance or 1 hour
            after booking the trip will not receive any penalties or fees.
          </li>
          <li>
            If a guest cancels their trip less than 24 hours before their trip
            begins they will receive a 50% refund of the total trip cost, this
            includes the trip fee and delivery fee.
          </li>
          <li>
            Guests who cancel their trip during their trip will not receive a
            refund of any sort. If the cancelation is due to a dispute between
            the renter and owner Rent Your Ride will investigate the matter and
            act accordingly to their findings.
          </li>
        </ol>
      </>
    ),
  },
  {
    question: 'What happens if I want to change my reservation?',
    answer: (
      <p className="content-page-copy">
        We understand that plans change. Our goal is to make this experience as
        enjoyable for both the host and guest of a vehicle on our platform. To
        reduce any last minute inconveniences we have created policies with both
        the host and guest in mind. Changing a reservation more than 24 hours in
        advance will not result in any fees. If you would like to change your
        reservation you must cancel your current booking and send another booking
        request. Please visit our{' '}
        <Link
          className="terms-email-link"
          to="/terms-conditions?section=cancelation"
        >
          cancelation policy
        </Link>{' '}
        page to learn more.
      </p>
    ),
  },
  {
    question: 'What happens if the host wants to cancel their reservation?',
    answer: (
      <p className="content-page-copy">
        Hosts who want to cancel their reservation can cancel 24 hours in
        advance without incurring a cancelation fee. If the host cancels their
        reservation less than 24 hours in advance a cancelation fee will be
        incurred. Rent Your Ride will assist the guest in finding a new vehicle
        for their trip. Please visit our{' '}
        <Link
          className="terms-email-link"
          to="/terms-conditions?section=cancelation"
        >
          cancelation policy
        </Link>{' '}
        page to learn more.
      </p>
    ),
  },
  {
    question: 'What is the minimum required age to rent a vehicle on RYR?',
    answer: (
      <p className="content-page-copy">
        We want to make sure the Rent Your Ride community is safe for both guest
        and hosts of vehicles on our platform. To ensure the safety of both
        owners property and users the minimum age required to rent a vehicle on
        our platform is 18 years of age. It is up to the host of the vehicle if
        they would like to rent their vehicle out to a certain age group.
      </p>
    ),
  },
  {
    question: 'What are the fees for renting a vehicle on RYR?',
    answer: (
      <p className="content-page-copy">
        It is our goal to make rentals more affordable. We do this by not
        charging unnecessary fees. There is only one fee that is applied to all
        rentals which is the “trip fee”. The trip fee is a total of 10% of the
        total trip price. Since we are full disclosure here at RYR we are happy
        to explain what this fee is. The trip fee is implemented and collected
        by RYR to address a number of costs to better your experience. These
        cost may include transaction fees, and offering our customer centred
        support. Rent Your Ride strives to make the platform as safe and low
        risk as possible. Other fees that may not be applied to all rentals
        would be the delivery fee. The delivery fee is a fee that the host of a
        vehicle can charge to drop off the rental to you. This fee can also be
        set by the host. Fees can be added to the rental if a vehicle is
        returned in a state that does not meet the previous state it left in
        before your trip. Please click this link to view our{' '}
        <Link
          className="terms-email-link"
          to="/terms-conditions?section=additional-usage"
        >
          Fines and Fees Policy
        </Link>
        .
      </p>
    ),
  },
  {
    question: 'When do I pay for the rental?',
    answer: (
      <p className="content-page-copy">
        When you request a vehicle, your card payment is authorized. This does
        not mean funds have been debited from your card instead a temporary
        “hold” has been put on the funds. When the host accepts your request the
        total trip amount will be debited to your card and a receipt will be
        sent.
      </p>
    ),
  },
  {
    question: 'How do I get paid?',
    answer: (
      <p className="content-page-copy">
        Rent Your Ride is happy to send money your way! Add your payout
        information while listing your first ride. It may take up to five
        business days after your ride sharing experience has been completed. We
        will automatically deposit your earnings directly into your account.
      </p>
    ),
  },
  {
    question: 'How much will I earn?',
    answer: (
      <p className="content-page-copy">
        You will earn 75% of your daily rental price and 100% of any extras you
        include as well. For example if your daily rental price is $100 a day
        you will be paid out $75 a day at the end of your trip, if you have a
        delivery fee of $35 you will be paid out 100% of that $35. For any
        reimbursements for fuel, tickets, excess mileage, cleaning and smoking
        you will receive 100% of the reimbursement.
      </p>
    ),
  },
  {
    question: 'How do taxes work?',
    answer: (
      <p className="content-page-copy">
        Income earned by sharing your car is taxable. You can see your total
        earnings in the completed trips section of the app. We are also happy to
        send you receipts of your trip earnings upon request.
      </p>
    ),
  },
  {
    question:
      'What happens if someone renting my car gets a speeding ticket or any other ticket?',
    answer: (
      <p className="content-page-copy">
        Rent Your Ride promotes an honest environment to do business. If a
        ticket is received during the span of your trip while using a vehicle of
        our community, the guest is responsible for it and it must be paid in
        full immediately. Whether it is a parking, speeding, or any type of
        fine, all fines must be fully closed when the trip is completed and the
        vehicle is returned to the host. If a ticket is received at a later date
        and it matches the time that the guest was using the vehicle, those
        tickets can be sent to the Rent Your Ride support team to be
        authenticated and matched with the guests trip to make them responsible
        for the payment of the fine. Rent Your Ride strives to make this
        transaction as simple as possible. All guests of Rent Your Ride vehicles
        should notify the hosts of any fines that they had to pay during their
        trip. This adds to the full disclosure environment which is always good
        in a business transaction. Proof of the tickets being paid could be
        provided to the host in this situation to ensure the host that all the
        fines are settled to make this a smooth experience. If a situation
        occurs in which the host was not notified for the fine during the time
        the traveller had the vehicle before or by 24 hours after the vehicle
        has been delivered to the host, Rent Your Ride will add the full cost of
        the ticket and any related fees which could be associated to the
        violation to the guests account. Please visit our{' '}
        <Link
          className="terms-email-link"
          to="/terms-conditions?section=driving-parking-tickets"
        >
          tickets policy
        </Link>{' '}
        page to learn more.
      </p>
    ),
  },
];

/** Flattens an answer's JSX into the plain text Google expects in FAQ markup. */
function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join('');
  if (isValidElement(node)) {
    return nodeToText((node.props as { children?: ReactNode }).children);
  }
  return '';
}

const FAQ_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: nodeToText(faq.answer).replace(/\s+/g, ' ').trim(),
    },
  })),
};

export default function InsurancePage() {
  return (
    <div className="content-page">
      <PageMeta
        title="Rent Your Ride Insurance & FAQ | Coverage by Province"
        description="Rent Your Ride insurance and FAQs — coverage options for hosts and guests in Manitoba, Saskatchewan, and beyond."
        canonical={`${SITE_ORIGIN}/insurance`}
        jsonLd={[
          FAQ_LD,
          breadcrumbLd([{ name: 'Insurance', path: '/insurance' }]),
        ]}
      />
      <SiteHeader />
      <ContentPageHero crumb="Insurance" />
      <div className="content-page-body content-page-body--insurance">
        <h1 className="content-page-title">
          <TextDecorator title="Don’t Worry" width="11rem" /> You&apos;re
          Covered
        </h1>
        <p className="insurance-lead">
          We made sure there are coverage options for you.
        </p>

        <div className="insurance-faq-list">
          {FAQS.map((faq) => (
            <section key={faq.question} className="insurance-faq">
              <h2 className="content-page-heading">{faq.question}</h2>
              {faq.answer}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
