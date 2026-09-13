import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ContentPageHero from '../components/ContentPageHero';
import { isCrispConfigured, openCrispChat } from '../components/CrispChat';
import PageMeta, { breadcrumbLd, SITE_ORIGIN } from '../components/PageMeta';
import SiteHeader, {
  CONTACT_CHAT_URL,
  CONTACT_MAILTO,
} from '../components/SiteHeader';
import TextDecorator from '../components/TextDecorator';
import {
  HELP_ARTICLES,
  HELP_TOPICS,
  searchHelpArticles,
  type HelpAudience,
  type HelpTopicId,
} from '../content/helpCenter';

const AUDIENCES: { id: HelpAudience | 'all'; label: string }[] = [
  { id: 'all', label: 'Everyone' },
  { id: 'guest', label: 'Guests' },
  { id: 'host', label: 'Hosts' },
];

const TOPIC_ICONS: Record<HelpTopicId, string> = {
  booking: 'M3 13.5 4.8 8.2A2.5 2.5 0 0 1 7.2 6.5h9.6a2.5 2.5 0 0 1 2.4 1.7L21 13.5M5 13.5h14a1.5 1.5 0 0 1 1.5 1.5v3H3.5v-3A1.5 1.5 0 0 1 5 13.5ZM6.5 18v1.5M17.5 18v1.5',
  hosting:
    'M4 11.5 12 5l8 6.5M6.5 10.5V19h11v-8.5M10 19v-4.5h4V19',
  payments:
    'M3.5 8.5h17v9a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-9ZM3.5 11.5h17M6.5 15.5h3M3.5 8.5 5.2 5.4A1.5 1.5 0 0 1 6.5 4.6h11a1.5 1.5 0 0 1 1.3.8l1.7 3.1',
  insurance: 'M12 4 5 6.6v5.2c0 4 3 6.9 7 8.2 4-1.3 7-4.2 7-8.2V6.6L12 4ZM9 12l2.2 2.2L15.5 10',
  changes:
    'M5 9a7 7 0 0 1 11.9-3.4L20 8.5M20 5v4h-4M19 15a7 7 0 0 1-11.9 3.4L4 15.5M4 19v-4h4',
  account:
    'M12 12.2a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2ZM4.8 20a7.2 7.2 0 0 1 14.4 0',
};

function TopicIcon({ topic }: { topic: HelpTopicId }) {
  return (
    <svg className="help-topic-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={TOPIC_ICONS[topic]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="help-search-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="11"
        cy="11"
        r="6.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m15.6 15.6 3.9 3.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="help-answer-chevron" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="m7 10 5 5 5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ContactPage() {
  const [query, setQuery] = useState('');
  const [audience, setAudience] = useState<HelpAudience | 'all'>('all');
  const [topic, setTopic] = useState<HelpTopicId | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const byAudience = useMemo(
    () =>
      HELP_ARTICLES.filter(
        (article) =>
          audience === 'all' ||
          article.audience === 'both' ||
          article.audience === audience,
      ),
    [audience],
  );

  const results = useMemo(() => {
    const scoped = topic
      ? byAudience.filter((article) => article.topic === topic)
      : byAudience;
    return searchHelpArticles(scoped, query.trim());
  }, [byAudience, topic, query]);

  const topicCounts = useMemo(() => {
    const searched = searchHelpArticles(byAudience, query.trim());
    return HELP_TOPICS.map((item) => ({
      ...item,
      count: searched.filter((article) => article.topic === item.id).length,
    }));
  }, [byAudience, query]);

  const activeTopic = HELP_TOPICS.find((item) => item.id === topic);
  const searching = query.trim().length > 0;

  const toggleTopic = (id: HelpTopicId) => {
    setTopic((current) => (current === id ? null : id));
    setOpenId(null);
  };

  return (
    <div className="content-page">
      <PageMeta
        title="Contact Rent Your Ride | Help Centre & Support"
        description="Search Rent Your Ride help articles or reach our team by email or live chat. Answers on booking, hosting, payments, insurance and cancellations."
        canonical={`${SITE_ORIGIN}/contact`}
        jsonLd={breadcrumbLd([{ name: 'Contact', path: '/contact' }])}
      />
      <SiteHeader />
      <ContentPageHero crumb="Contact Us" />

      <div className="content-page-body content-page-body--help">
        <header className="help-intro">
          <h1 className="content-page-title">
            How can we <TextDecorator title="help?" width="100%" />
          </h1>
          <p className="help-lead">
            When you need us we&apos;re here for you.
          </p>
          <p className="help-lead-copy">
            Search our answers below, or reach the team directly. We&apos;re
            here for you 24/7. Our number one priority is you. If you don&apos;t
            find what you need, email us or message us on our instant chat.
          </p>

          <div className="help-search">
            <SearchIcon />
            <input
              type="search"
              className="help-search-input"
              placeholder="Search questions, keywords, topics"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpenId(null);
              }}
              aria-label="Search help articles"
            />
            {searching ? (
              <button
                type="button"
                className="help-search-clear"
                onClick={() => setQuery('')}
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="help-audience" role="group" aria-label="Filter by role">
            {AUDIENCES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`help-audience-chip${
                  audience === item.id ? ' is-active' : ''
                }`}
                aria-pressed={audience === item.id}
                onClick={() => {
                  setAudience(item.id);
                  setOpenId(null);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <section className="help-section" aria-labelledby="help-topics">
          <h2 className="help-section-title" id="help-topics">
            Help by topic
          </h2>

          <div className="help-topics">
            {topicCounts.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`help-topic${topic === item.id ? ' is-active' : ''}`}
                aria-pressed={topic === item.id}
                disabled={item.count === 0}
                onClick={() => toggleTopic(item.id)}
              >
                <TopicIcon topic={item.id} />
                <span className="help-topic-label">{item.label}</span>
                <span className="help-topic-blurb">{item.blurb}</span>
                <span className="help-topic-count">
                  {item.count} {item.count === 1 ? 'answer' : 'answers'}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="help-section" aria-labelledby="help-answers">
          <div className="help-results-head">
            <h2 className="help-section-title" id="help-answers">
              {activeTopic ? activeTopic.label : 'Top questions'}
            </h2>
            {topic || searching ? (
              <button
                type="button"
                className="help-reset"
                onClick={() => {
                  setTopic(null);
                  setQuery('');
                  setOpenId(null);
                }}
              >
                Reset filters
              </button>
            ) : null}
          </div>

          {results.length > 0 ? (
            <ul className="help-answers">
              {results.map((article) => {
                const open = openId === article.id;
                return (
                  <li
                    key={article.id}
                    className={`help-answer${open ? ' is-open' : ''}`}
                  >
                    <button
                      type="button"
                      className="help-answer-question"
                      aria-expanded={open}
                      aria-controls={`help-panel-${article.id}`}
                      onClick={() => setOpenId(open ? null : article.id)}
                    >
                      <span>{article.question}</span>
                      <ChevronIcon />
                    </button>

                    {open ? (
                      <div
                        className="help-answer-panel"
                        id={`help-panel-${article.id}`}
                      >
                        {article.answer.map((paragraph) => (
                          <p key={paragraph} className="help-answer-copy">
                            {paragraph}
                          </p>
                        ))}

                        {article.steps ? (
                          <ol className="help-answer-steps">
                            {article.steps.map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                          </ol>
                        ) : null}

                        {article.link ? (
                          <Link
                            className="help-answer-link"
                            to={article.link.to}
                          >
                            {article.link.label}
                            <span aria-hidden="true">›</span>
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="help-empty">
              <p className="help-empty-title">
                No answers matched “{query.trim()}”.
              </p>
              <p className="help-empty-copy">
                Try a different word, or send us a message below and we&apos;ll
                sort it out with you.
              </p>
            </div>
          )}
        </section>

        <section className="help-contact" aria-labelledby="help-contact-title">
          <h2 className="help-section-title" id="help-contact-title">
            Still need a hand?
          </h2>
          <p className="help-section-lead">
            Our team answers every message — usually within a few hours.
          </p>

          <div className="help-contact-actions">
            {isCrispConfigured() ? (
              <button
                type="button"
                className="help-contact-card"
                onClick={openCrispChat}
              >
                <span className="help-contact-label">Instant chat</span>
                <span className="help-contact-detail">
                  Chat with us live, right here
                </span>
                <span className="help-contact-cta">Start a chat ›</span>
              </button>
            ) : (
              <a
                className="help-contact-card"
                href={CONTACT_CHAT_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="help-contact-label">Instant chat</span>
                <span className="help-contact-detail">
                  Message us on Messenger
                </span>
                <span className="help-contact-cta">Open Messenger ›</span>
              </a>
            )}

            <a className="help-contact-card" href={CONTACT_MAILTO}>
              <span className="help-contact-label">Email us</span>
              <span className="help-contact-detail">
                support@rentyourride.ca
              </span>
              <span className="help-contact-cta">Send an email ›</span>
            </a>
          </div>

          <p className="help-contact-footnote">
            Looking for policies or coverage details? Visit our{' '}
            <Link className="terms-email-link" to="/terms-conditions">
              Legal
            </Link>{' '}
            or{' '}
            <Link className="terms-email-link" to="/insurance">
              Insurance
            </Link>{' '}
            pages.
          </p>
        </section>
      </div>
    </div>
  );
}
