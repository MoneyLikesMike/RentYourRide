import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ADDITIONAL_USAGE_POLICY_BLOCKS } from '../content/additionalUsagePolicyContent';
import { BOOKING_TIME_RULES_BLOCKS } from '../content/bookingTimeRulesContent';
import { CANCELATION_POLICY_BLOCKS } from '../content/cancelationPolicyContent';
import { DAMAGE_POLICY_BLOCKS } from '../content/damagePolicyContent';
import { DRIVING_PARKING_TICKETS_POLICY_BLOCKS } from '../content/drivingParkingTicketsPolicyContent';
import { OUT_OF_APP_POLICY_BLOCKS } from '../content/outOfAppPolicyContent';
import { PRIVACY_POLICY_BLOCKS } from '../content/privacyPolicyContent';
import { TERMS_OF_SERVICE_BLOCKS } from '../content/termsOfServiceContent';
import { VEHICLE_CLEANING_POLICY_BLOCKS } from '../content/vehicleCleaningPolicyContent';
import ContentPageHero from '../components/ContentPageHero';
import PageMeta, { breadcrumbLd, SITE_ORIGIN } from '../components/PageMeta';
import SiteHeader, { CONTACT_MAILTO } from '../components/SiteHeader';
import TextDecorator from '../components/TextDecorator';
import type { ContentBlock } from './legalContentTypes';

const PLACEHOLDER =
  'Content for this section is coming soon. Please check back shortly for the full policy details.';

const SUPPORT_EMAIL = 'support@rentyourride.ca';

function linkifySupportEmail(text: string): ReactNode {
  if (!text.includes(SUPPORT_EMAIL)) return text;
  const parts = text.split(SUPPORT_EMAIL);
  return parts.reduce<ReactNode[]>((nodes, part, index) => {
    if (index > 0) {
      nodes.push(
        <a
          key={`email-${index}`}
          className="terms-email-link"
          href={CONTACT_MAILTO}
        >
          {SUPPORT_EMAIL}
        </a>,
      );
    }
    if (part) nodes.push(part);
    return nodes;
  }, []);
}

type LegalSection = {
  id: string;
  title: string;
  heading?: string;
  body?: string;
  blocks?: ContentBlock[];
};

type LegalGroup = {
  id: string;
  title: string;
  sections: LegalSection[];
};

const TERMS_CONDITIONS_BLOCKS: ContentBlock[] = [
  { type: 'updated', text: 'Last updated: July 28, 2026' },
  {
    type: 'p',
    text: 'The Host hereby agrees to rent to the Guest and the Guest hereby agrees to rent from the Host the vehicle described in the Rent Your Ride booking program (the “Vehicle”), subject to all of the terms and conditions herein. The terms and specifications of the booking rental made through the Rent Your Ride online marketplace, the Rent Your Ride Cancellation Policy and the Rent Your Ride Fines and Fees Policy each as in effect at the date hereof (collectively, the “RYR Terms”) are incorporated by reference herein.',
  },
  {
    type: 'clause',
    n: 1,
    text: 'The Guest will return the vehicle to the Host, together with all tires, tools, equipment, accessories, plates and documents, in the same condition as when received, ordinary wear and tear excepted, on the date and time specified or required by the RYR Terms, and to the location specified in the RYR Terms. Late Fees as set out in the RYR Terms shall apply in the event the Guest fails to return the Vehicle in accordance with this Section 1.1.',
  },
  {
    type: 'clause',
    n: 2,
    text: 'Each of the Guest and the Host shall complete and execute the Renter’s Acknowledgement attached as Schedule “A” hereto (the “Acknowledgement”) or the check in/check out program through the platform hereto (“Check In/ Check Out”). The RYR Renters Acknowledgement, Check In/ Check Out and all related services (together, the “Agreement”). By executing the Agreement, the Guest acknowledges that the Vehicle was received by him or her in good condition and repair except as noted in the Agreement.',
  },
  {
    type: 'clause',
    n: 3,
    text: 'The Guest acknowledges that the Vehicle is and will be at all times solely and exclusively under his or her possession and control until returned to the Host and nothing contained in this Agreement is intended to be construed otherwise.',
  },
  {
    type: 'clause',
    n: 4,
    text: 'The Guest may allow another individual to drive the Vehicle during the term of the rental (an “Additional Driver”) only if the name and information of such driver(s) have been disclosed to the Host prior to the Host’s acceptance of the booking request. In such event, the Additional Driver shall be jointly and severally liable for the obligations of the Guest hereunder.',
  },
  {
    type: 'clause',
    n: 5,
    text: 'During the term of the rental and until the Vehicle has been returned to the Host in accordance with the provisions of this Agreement, the Guest shall be responsible for ensuring the following:',
    bullets: [
      'That the vehicle is returned to the Host free of stains, dirt, pet hair, odour or soilage;',
      'That no smoking (of any tobacco, marijuana, e-cigarettes or other products) is to take place in the Vehicle and the Vehicle is returned free of the smell of smoke;',
      'That no animals or pets are to enter the Vehicle unless contained in an enclosed pet carrier and such use complies with Section 1.4(a) above.',
    ],
  },
  {
    type: 'clause',
    n: 6,
    text: 'Additional Fees as set out in the RYR Terms shall apply in the event the Guest fails to adhere to the terms of this Section 1.4.',
  },
  {
    type: 'clause',
    n: 7,
    text: 'The Guest shall only be entitled to drive the Vehicle for the number of kilometres indicated in the RYR Terms (the “Kilometre Limit”). The Guest shall pay the Host additional fees as set out in the RYR Terms for any kilometres driven in excess of the Kilometre Limit. It shall be conclusively presumed that the number of miles and/or kilometres for which the Vehicle shall have been operated pursuant to this Agreement shall be the number of miles and/or kilometres recorded by the standard mileage recording device attached to the vehicle by the manufacturer thereof or by the Host. These fees may be retrieved by RYR on behalf of the Host.',
  },
  {
    type: 'clause',
    n: 8,
    text: 'The Guest agrees to pay the Host the fees set out in the RYR Terms. With the exception of any damage noted in the Agreement, the Guest is responsible for and will reimburse the Host on demand for all uninsured loss or damage of any kind or nature to the Vehicle, or the tires, tools, accessories and equipment therein or thereon, provided however, that the Guest shall not be responsible for damage or loss that is not covered by insurance due to a breach of this Agreement by the Host, including the failure of the Host to maintain in good standing insurance for the Vehicle as required by Section 18 hereof. The Renter hereby authorizes and directs RYR to collect from the Guest any amounts owing pursuant to the RYR Terms.',
  },
  {
    type: 'clause',
    n: 9,
    text: 'The Guest and each Additional Driver hereby represents that he or she is a capable and validly licensed driver, which driver’s license is and shall remain active for the term of the rental. The Host has the right to verify that the Guest’s and each Additional Driver’s license has been validly issued and is in good standing and remains in good standing as a condition precedent to the rental of the Vehicle.',
  },
  {
    type: 'clause',
    n: 10,
    text: 'The Guest covenants and agrees to assist the Host in taking any steps the Host deems necessary to verify that the license of the Guest (or an Additional Driver) has been validly issued and remains active for the term of the rental, including providing written permission to the Host to obtaining a driver record (abstract) at the sole cost and expense of the Host.',
  },
  {
    type: 'clause',
    n: 11,
    text: 'The following operation, use or driving of the Vehicle is prohibited, and the Guest agrees that the Vehicle shall not be used, operated or driven:',
    bullets: [
      'For the transportation of persons or property for compensation including receiving payment as a courier or taxi service (using the Vehicle for the purposes of attending work or school is allowed);',
      'By any person other than the Guest;',
      'Other than in accordance with all applicable laws, rules, statutes, regulations, orders, judgments, decrees, treaties or other requirements having the force of law;',
      'In any race, speed test or contest;',
      'With the intention to cause damage to, or with reckless disregard for, persons or property;',
      'For the purpose of towing or propelling any trailer or other vehicle unless authorized by the Host;',
      'In a manner that allows the Vehicle to be propelled or towed other than by an established towing service or authorized service vehicle unless authorized by the Host;',
      'For the transportation of dangerous, toxic, poisonous, flammable or illegal goods or materials;',
      'By the Guest or any other person while under the influence of alcohol, marijuana, intoxicants or narcotics;',
      'In any instance where the speedometer and/or any hub odometer of the Vehicle has been tampered with or disconnected;',
      'By any person who has given the Host a fictitious, false or fraudulent name or address;',
      'In breach of any of the terms, conditions and exclusions of the Policy of Insurance; and',
      'Where the Vehicle has a manual transmission, by an individual that does not have significant experience in driving a vehicle with a manual transmission.',
      'The foregoing restrictions are cumulative and each of them shall apply to every use, operation or driving of the Vehicle.',
    ],
  },
  {
    type: 'clause',
    n: 12,
    text: 'The Guest is required to notify the Host, as soon as practicable, of any accident or circumstance giving rise to a claim and to provide the Host with particulars of it, the identity of the driver, and to furnish the Host with information as might reasonably be requested to:',
    bullets: [
      'enable the Host to be fully acquainted with the circumstances of the incident; and',
      'to take any steps necessary to make a claim under any policy of insurance.',
      'The Host shall not be liable for loss or damage to any property kept, left, stored, located in or upon or transported by the Guest, or any other person in or upon the Vehicle, either before or after the return thereof to the Host.',
    ],
  },
  {
    type: 'clause',
    n: 13,
    text: 'The Guest and each Additional Driver will use and operate the Vehicle in a prudent and careful manner and in accordance with all laws and manufacturer’s instructions. The Guest will not modify or alter the Vehicle in any fashion and will take reasonable care to safeguard it from damage, theft, unreasonable wear and tear and other loss.',
  },
  {
    type: 'clause',
    n: 14,
    text: 'The Guest shall use the Vehicle at his or her own risk. The Host shall have no liability to the Guest or any third party for any loss, damage, injury or death caused by the Vehicle or use thereof during the term of the rental and thereafter prior to its return to the Host.',
  },
  {
    type: 'clause',
    n: 15,
    text: 'Notwithstanding anything herein contained to the contrary, the Guest shall be solely liable and responsible for all fines, penalties and forfeitures imposed for parking or traffic violations (including photo radar tickets) while vehicle is held, used, operated or driven pursuant to this Agreement, and the Guest agrees to pay to the Host all monies, including reasonable legal fees and costs which may be incurred by the Host on account of the imposition of any such fines, penalties or forfeitures.',
  },
  {
    type: 'clause',
    n: 16,
    text: 'The Guest shall indemnify and save harmless Host from and against any and all claims, demands, liabilities, losses, costs, damages and expenses which may be suffered or incurred by the Host arising from any damage to or loss of property, or injury to or death of any person, arising from the use, operation, storage or transportation of the Vehicle at any time prior to its return to the Host, and the Guest shall be responsible for and indemnify the Host for any insurance deductible payable by the Host in respect of loss or damage incurred in accordance with this Section.',
  },
  {
    type: 'clause',
    n: 17,
    text: 'The Host shall provide evidence that the Vehicle has been insured with coverage to facilitate peer to peer vehicle rentals. The Guest shall provide evidence that the Guest holds the necessary class of driver’s license required to operate the Vehicle within RYR’s policies.',
  },
  {
    type: 'clause',
    n: 18,
    text: 'The Host represents that the Vehicle is registered and covered by an automobile liability insurance policy to facilitate peer to peer vehicle rentals (the “Insurance Policy”), evidence of which shall be made available for inspection by the Guest and shall remain in the Vehicle while the Guest has possession of the Vehicle. The Guest agrees to comply with and to be bound by all of the terms, conditions, limitations and restrictions of this Agreement and the Insurance Policy, which are hereby incorporated by reference herein and made a part of this Agreement as fully as if set forth at length including those terms, conditions, limitations and restrictions of which no specific mention is made herein. It is a requirement of this Agreement that the Guest of the vehicle must immediately report any accident, collision or impact to the Host, and must immediately deliver to the Host at said location or to the insurer, every demand, notice, summons, process, pleading or proceeding received by the Renter or the driver of vehicle or the representative of either in connection with any accident or occurrence involving the Vehicle. The Guest and/or driver shall cooperate with the Host and the insurer in the investigation of any claim or suit, and neither shall do anything after loss to prejudice the Host’s or insurer’s rights under the Insurance Policy.',
  },
  {
    type: 'clause',
    n: 19,
    text: 'If the Vehicle has been rented by any person who has given to the Host a false or a fictitious name, address or driver’s license, or if the Guest fails or refuses to return the Vehicle to the Host within 24 hours of the return time set out in the RYR Terms, the Guest shall be conclusively presumed to be in unlawful possession of the Vehicle and under such circumstances, the Host or RYR shall be entitled to pursue whatever remedies are available at law.',
  },
  {
    type: 'clause',
    n: 20,
    text: 'All right, title and interest in and to the Vehicle remains with the Host and nothing in this Agreement is to be taken as transferring to the Guest any proprietary interest.',
  },
  {
    type: 'clause',
    n: 21,
    text: 'In the event that the Guest violates any of the terms or conditions of this Agreement, the Guest shall pay to the Host, on demand, all expenses incurred by the Host in connection with enforcement of any of the terms, conditions or provisions of this Agreement by court action, including reasonable legal fees.',
  },
  {
    type: 'clause',
    n: 22,
    text: 'The terms and conditions contained in this Agreement may not be modified or waived except by written agreement.',
  },
];

const GROUPS: LegalGroup[] = [
  {
    id: 'general-terms',
    title: 'General Terms',
    sections: [
      {
        id: 'terms-conditions',
        title: 'Terms & Conditions',
        heading: 'Rental Agreement Terms & Conditions',
        blocks: TERMS_CONDITIONS_BLOCKS,
      },
      {
        id: 'terms-of-service',
        title: 'Terms of Service',
        heading: 'Rent Your Ride Terms of Service',
        blocks: TERMS_OF_SERVICE_BLOCKS,
      },
      {
        id: 'drivers-acknowledgment',
        title: 'Drivers Acknowledgment',
        body: PLACEHOLDER,
      },
    ],
  },
  {
    id: 'policies-rules',
    title: 'Policies & Rules',
    sections: [
      {
        id: 'additional-usage',
        title: 'Additional Usage Policy',
        heading: 'Additional Usage Policy',
        blocks: ADDITIONAL_USAGE_POLICY_BLOCKS,
      },
      {
        id: 'cancelation',
        title: 'Cancelation Policy',
        heading: 'Cancelation Policy',
        blocks: CANCELATION_POLICY_BLOCKS,
      },
      {
        id: 'damage',
        title: 'Damage Policy',
        heading: 'Damage Policy',
        blocks: DAMAGE_POLICY_BLOCKS,
      },
      {
        id: 'driving-parking-tickets',
        title: 'Driving & Parking Tickets Policies',
        heading: 'Driving & Parking Tickets Policy',
        blocks: DRIVING_PARKING_TICKETS_POLICY_BLOCKS,
      },
      {
        id: 'out-of-app',
        title: 'Out of App: Website Transaction Policy',
        heading: 'Out of App / Website Transaction Policy',
        blocks: OUT_OF_APP_POLICY_BLOCKS,
      },
      {
        id: 'privacy',
        title: 'Privacy Policy',
        heading: 'Privacy Policy',
        blocks: PRIVACY_POLICY_BLOCKS,
      },
      {
        id: 'vehicle-cleaning',
        title: 'Vehicle Cleaning Policies',
        heading: 'Vehicle Cleaning Policies',
        blocks: VEHICLE_CLEANING_POLICY_BLOCKS,
      },
      {
        id: 'booking-time-rules',
        title: 'Booking Time Rules',
        heading: 'Booking Time Rules',
        blocks: BOOKING_TIME_RULES_BLOCKS,
      },
    ],
  },
];

const ALL_SECTIONS = GROUPS.flatMap((g) => g.sections);

function LegalBlocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === 'updated') {
          return (
            <p key={i} className="terms-updated">
              {block.text}
            </p>
          );
        }
        if (block.type === 'p') {
          return (
            <p key={i} className="content-page-copy">
              {linkifySupportEmail(block.text)}
            </p>
          );
        }
        if (block.type === 'section') {
          return (
            <h3 key={i} className="terms-section-title">
              {block.title}
            </h3>
          );
        }
        if (block.type === 'acceptance') {
          return (
            <p key={i} className="terms-acceptance">
              {block.text}
            </p>
          );
        }
        if (block.type === 'bullets') {
          return (
            <ul key={i} className="terms-bullets">
              {block.items.map((item, bi) => (
                <li key={bi}>{item}</li>
              ))}
            </ul>
          );
        }
        if (block.type === 'letters') {
          return (
            <ul key={i} className="terms-letters">
              {block.items.map((item, li) => (
                <li key={li}>
                  <span className="terms-letter-mark">{item.mark}</span>{' '}
                  {item.text}
                  {item.sub?.length ? (
                    <ul className="terms-letters terms-letters--nested">
                      {item.sub.map((s, si) => (
                        <li key={si}>
                          <span className="terms-letter-mark">{s.mark}</span>{' '}
                          {s.text}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === 'table') {
          return (
            <div key={i} className="terms-table-wrap">
              <table className="terms-table">
                <thead>
                  <tr>
                    {block.headers.map((header) => (
                      <th key={header} scope="col">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (block.type === 'sub') {
          return (
            <div key={i} className="terms-clause">
              <p className="content-page-copy">
                <span className="terms-clause-num">{block.id}</span>{' '}
                {linkifySupportEmail(block.text)}
              </p>
              {block.letters?.length ? (
                <ul className="terms-letters">
                  {block.letters.map((item, li) => (
                    <li key={li}>
                      <span className="terms-letter-mark">{item.mark}</span>{' '}
                      {item.text}
                      {item.sub?.length ? (
                        <ul className="terms-letters terms-letters--nested">
                          {item.sub.map((s, si) => (
                            <li key={si}>
                              <span className="terms-letter-mark">{s.mark}</span>{' '}
                              {s.text}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        }
        return (
          <div key={i} className="terms-clause">
            <p className="content-page-copy">
              <span className="terms-clause-num">{block.n}.</span> {block.text}
            </p>
            {block.bullets?.length ? (
              <ul className="terms-bullets">
                {block.bullets.map((item, bi) => (
                  <li key={bi}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export default function TermsConditionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionParam = searchParams.get('section');
  const initialId =
    ALL_SECTIONS.find((s) => s.id === sectionParam)?.id ?? ALL_SECTIONS[0].id;
  const [activeId, setActiveId] = useState<string>(initialId);
  const active = ALL_SECTIONS.find((s) => s.id === activeId) ?? ALL_SECTIONS[0];

  useEffect(() => {
    if (!sectionParam) return;
    const match = ALL_SECTIONS.find((s) => s.id === sectionParam);
    if (match) setActiveId(match.id);
  }, [sectionParam]);

  const selectSection = (id: string) => {
    setActiveId(id);
    setSearchParams(id === ALL_SECTIONS[0].id ? {} : { section: id }, {
      replace: true,
    });
  };

  return (
    <div className="content-page">
      <PageMeta
        title="Rent Your Ride Legal | Terms, Privacy & Policies"
        description="Rent Your Ride terms of service, privacy policy, and rental policies for hosts and guests."
        canonical={`${SITE_ORIGIN}/terms-conditions`}
        jsonLd={breadcrumbLd([{ name: 'Legal', path: '/terms-conditions' }])}
      />
      <SiteHeader />
      <ContentPageHero crumb="Legal" />
      <div className="content-page-body content-page-body--terms">
        <h1 className="content-page-title">
          <TextDecorator title="Legal" width="5.5rem" />
        </h1>

        <div className="terms-layout">
          <nav className="terms-sidebar" aria-label="Legal sections">
            {GROUPS.map((group) => (
              <div key={group.id} className="terms-sidebar-group">
                <p className="terms-sidebar-group-title">{group.title}</p>
                {group.sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={`terms-sidebar-link${activeId === section.id ? ' is-active' : ''}`}
                    onClick={() => selectSection(section.id)}
                  >
                    {section.title}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="terms-panel">
            <h2 className="content-page-heading">
              {active.heading ?? active.title}
            </h2>
            {active.blocks ? (
              <LegalBlocks blocks={active.blocks} />
            ) : (
              (active.body ?? PLACEHOLDER).split('\n\n').map((para, i) => (
                <p key={i} className="content-page-copy">
                  {para}
                </p>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
