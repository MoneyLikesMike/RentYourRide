import ContentPageHero from '../components/ContentPageHero';
import PageMeta, { breadcrumbLd, SITE_ORIGIN } from '../components/PageMeta';
import PhoneMockup from '../components/PhoneMockup';
import SiteHeader from '../components/SiteHeader';
import { AppStoreBadge, GooglePlayBadge } from '../components/StoreBadges';
import TeamGrid from '../components/TeamGrid';
import TextDecorator from '../components/TextDecorator';

const APP_STORE_URL =
  'https://apps.apple.com/us/app/rent-your-ride/id1495074000';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.rentyourrideca';

export default function AboutPage() {
  return (
    <div className="content-page">
      <PageMeta
        title="About Rent Your Ride | Peer to Peer Car Rentals"
        description="Learn about Rent Your Ride — Canada’s peer-to-peer vehicle sharing platform connecting hosts and travellers."
        canonical={`${SITE_ORIGIN}/about`}
        jsonLd={breadcrumbLd([{ name: 'About', path: '/about' }])}
      />
      <SiteHeader />
      <ContentPageHero crumb="About" />
      <div className="content-page-body content-page-body--about">
        <section className="about-row about-row--text-left">
          <div className="about-copy">
            <img
              src="/home/big-circle.png"
              alt=""
              className="about-circle about-circle--big-left"
            />
            <img
              src="/home/circle.png"
              alt=""
              className="about-circle about-circle--small-left"
            />
            <h1 className="content-page-title">
              <TextDecorator title="Who are we?" width="100%" />
            </h1>
            <p className="content-page-copy">
              Rent Your Ride is a Peer to Peer vehicle sharing platform that
              provides a cost effective, diverse selection of rental vehicles
              for travellers to choose from. We&apos;ve created a space that
              allows vehicle owners to list their rides for rent while
              connecting them with travellers who are looking to rent a
              vehicle.
            </p>
          </div>
          <img
            src="/about/people-c.png"
            alt="Two people walking together."
            className="about-image about-image--people about-image--flip"
          />
        </section>

        <section className="about-row about-row--text-right">
          <div className="about-copy">
            <img
              src="/home/big-circle.png"
              alt=""
              className="about-circle about-circle--big-right"
            />
            <img
              src="/home/small-circle.png"
              alt=""
              className="about-circle about-circle--small-right"
            />
            <h2 className="content-page-title">
              <TextDecorator title="How we came to be." width="100%" />
            </h2>
            <p className="content-page-copy">
              The sharing economy is growing quickly. From your phone you can
              connect with millions of people at any given moment. With the tap
              of a button you&apos;re able to rent someone&apos;s personal home
              in a foreign country. You can hail a driver who is ready to take
              you to your desired destination with their personal vehicle.
            </p>
            <p className="content-page-copy">
              You have the ability to start your own business in minutes and
              earn money from sharing a car. Why not make renting vehicles that
              easy?
            </p>
          </div>
          <img
            src="/about/people-a.png"
            alt="Two people walking toward new opportunities."
            className="about-image about-image--people"
          />
        </section>

        <section className="about-mission">
          <img
            src="/home/big-circle.png"
            alt=""
            className="about-circle about-circle--big-center"
          />
          <img
            src="/home/small-circle.png"
            alt=""
            className="about-circle about-circle--small-center"
          />
          <h2 className="content-page-title">
            <TextDecorator title="Our Mission" width="100%" />
          </h2>
          <p className="content-page-copy">
            Rent Your Ride’s mission is to change the rental industry through
            innovation and sharing by connecting vehicle owners with those who
            are looking to rent a vehicle, while providing world class customer
            service.
          </p>
        </section>

        <section className="about-family">
          <h2 className="content-page-title">
            <TextDecorator title="The Family" width="100%" />
          </h2>
          <TeamGrid />
        </section>

        <section className="about-row about-row--text-right">
          <div className="about-copy">
            <img
              src="/home/circle.png"
              alt=""
              className="about-circle about-circle--big-right"
            />
            <img
              src="/home/small-circle.png"
              alt=""
              className="about-circle about-circle--small-right"
            />
            <h2 className="content-page-title">
              <TextDecorator title="Book The Perfect Ride" width="100%" />
            </h2>
            <p className="content-page-copy">
              Choose from a diverse selection of vehicles offered by local
              vehicle hosts. Browse through luxury cars, trucks and your
              everyday ride.
            </p>
            <div className="download-store-buttons">
              <a
                href={APP_STORE_URL}
                className="store-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <AppStoreBadge className="store-badge" />
              </a>
              <a
                href={PLAY_STORE_URL}
                className="store-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GooglePlayBadge className="store-badge" />
              </a>
            </div>
          </div>
          <PhoneMockup
            src="/about/app-listing-screen.png"
            alt="The Rent Your Ride app showing a vehicle listing ready to book."
          />
        </section>
      </div>
    </div>
  );
}
