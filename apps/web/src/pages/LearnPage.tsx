import { Link } from 'react-router-dom';
import ContentPageHero from '../components/ContentPageHero';
import NewsCard from '../components/NewsCard';
import PageMeta, { breadcrumbLd, SITE_ORIGIN } from '../components/PageMeta';
import SiteHeader from '../components/SiteHeader';
import SocialFeed from '../components/SocialFeed';
import { AppStoreBadge, GooglePlayBadge } from '../components/StoreBadges';
import TextDecorator from '../components/TextDecorator';
import { useNewsFeed } from '../content/newsFeed';

const APP_STORE_URL =
  'https://apps.apple.com/us/app/rent-your-ride/id1495074000';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.rentyourrideca';

const TOPICS = [
  {
    to: '/how-it-works',
    title: 'How It Works',
    description:
      'Step by step guides for listing your ride and booking one, from your first search to handing back the keys.',
    points: ['List a ride in 5 steps', 'Book a ride in 5 steps', 'Check in & check out'],
  },
  {
    to: '/faq',
    title: 'FAQ',
    description:
      'Answers to the questions we hear most from hosts and guests — refunds, requirements and trip changes.',
    points: ['Refunds & cancellations', 'Fuel, cleaning & mileage', 'Trip requirements'],
  },
  {
    to: '/insurance',
    title: 'Insurance',
    description:
      'Coverage explained province by province so you know exactly how you and your vehicle are protected.',
    points: ['Manitoba coverage', 'Saskatchewan coverage', 'Extra protection options'],
  },
] as const;

export default function LearnPage() {
  const newsItems = useNewsFeed(3);

  return (
    <div className="content-page">
      <PageMeta
        title="Learn | Rent Your Ride Guides, FAQ & Insurance"
        description="Learn how Rent Your Ride works, browse frequently asked questions, and understand insurance coverage for hosts and guests."
        canonical={`${SITE_ORIGIN}/learn`}
        jsonLd={breadcrumbLd([{ name: 'Learn', path: '/learn' }])}
      />
      <SiteHeader />
      <ContentPageHero crumb="Learn" />
      <div className="content-page-body content-page-body--learn">
        <header className="learn-intro">
          <h1 className="content-page-title">Learn</h1>
          <p className="learn-lead">
            Discover more ways to travel{' '}
            <TextDecorator title="the new way." width="100%" />
          </p>
        </header>


        <nav className="learn-grid" aria-label="Learn topics">
          {TOPICS.map((topic) => (
            <Link key={topic.to} to={topic.to} className="learn-card">
              <h2 className="learn-card-title">{topic.title}</h2>
              <p className="learn-card-copy">{topic.description}</p>
              <ul className="learn-card-points">
                {topic.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <span className="learn-card-cta">
                Read more
                <img src="/home/arrow.png" alt="" className="learn-card-arrow" />
              </span>
            </Link>
          ))}
        </nav>

        <section className="learn-section" aria-labelledby="learn-news">
          <h2 className="learn-section-title" id="learn-news">
            News &amp; <TextDecorator title="Updates" width="100%" />
          </h2>
          <p className="learn-section-lead">
            What&apos;s new at Rent Your Ride.
          </p>

          <ul className="news-list">
            {newsItems.map((item) => (
              <li key={item.id} className="news-item">
                <NewsCard item={item} />
              </li>
            ))}
          </ul>

          <p className="learn-section-cta">
            <Link className="news-view-all" to="/news">
              View all articles
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4.5 11.5 11.5 4.5M5.75 4.5h5.75v5.75"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </p>
        </section>

        <section className="learn-section" aria-labelledby="learn-social">
          <h2 className="learn-section-title" id="learn-social">
            Follow <TextDecorator title="along" width="100%" />
          </h2>
          <p className="learn-section-lead">
            The latest posts from our community, straight from our feeds.
          </p>
          <SocialFeed />
        </section>

        <section className="learn-section" aria-labelledby="learn-app">
          <h2 className="learn-section-title" id="learn-app">
            Get the <TextDecorator title="app" width="100%" />
          </h2>
          <p className="learn-section-lead">
            Book a ride, message your host and check in from anywhere.
          </p>
          <div className="download-store-buttons download-store-buttons--center">
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
        </section>

        <p className="learn-footnote">
          Still need a hand? Our team is here 24/7 —{' '}
          <Link className="terms-email-link" to="/contact">
            get in touch
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
