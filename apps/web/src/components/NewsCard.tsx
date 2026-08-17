import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { formatNewsDateShort, NEWS_DEFAULT_AUTHOR, type NewsUpdate } from '../content/newsUpdates';

type Props = {
  item: NewsUpdate;
};

function CardShell({ href, children }: { href?: string; children: ReactNode }) {
  if (!href) {
    return <div className="news-card-link news-card-link--static">{children}</div>;
  }
  if (href.startsWith('/')) {
    return (
      <Link to={href} className="news-card-link">
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className="news-card-link" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export default function NewsCard({ item }: Props) {
  return (
    <article className="news-card">
      <CardShell href={item.href}>
        <div className="news-card-cover">
          {item.image ? (
            <img className="news-card-image" src={item.image} alt="" loading="lazy" />
          ) : (
            <div className="news-card-image news-card-image--placeholder" />
          )}
          <span className="news-card-tag">{item.category}</span>
        </div>

        <p className="news-card-byline">
          By {item.author ?? NEWS_DEFAULT_AUTHOR}
          <span className="news-card-dot" aria-hidden="true">
            ·
          </span>
          <time dateTime={item.date}>{formatNewsDateShort(item.date)}</time>
        </p>

        <h3 className="news-card-title">{item.title}</h3>
        <p className="news-card-summary">{item.summary}</p>

        {item.href ? (
          <span className="news-card-more">
            <span className="news-card-more-label">Read more</span>
            <svg
              className="news-card-more-arrow"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4.5 11.5 11.5 4.5M5.75 4.5h5.75v5.75"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : null}
      </CardShell>
    </article>
  );
}
