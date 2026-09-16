import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getArticle, type Article } from '../api/articles';
import ArticleBody from '../components/ArticleBody';
import ContentPageHero from '../components/ContentPageHero';
import PageMeta, { SITE_ORIGIN } from '../components/PageMeta';
import SiteHeader from '../components/SiteHeader';
import { formatNewsDate } from '../content/newsUpdates';

type State =
  | { status: 'loading' }
  | { status: 'ready'; article: Article }
  | { status: 'missing' };

export default function ArticlePage() {
  const { slug = '' } = useParams();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    getArticle(slug)
      .then((article) => {
        if (active) setState({ status: 'ready', article });
      })
      .catch(() => {
        if (active) setState({ status: 'missing' });
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (state.status === 'loading') {
    return (
      <div className="content-page">
        <SiteHeader />
        <ContentPageHero crumb="News" />
        <div className="content-page-body">
          <p className="article-status">Loading…</p>
        </div>
      </div>
    );
  }

  if (state.status === 'missing') {
    return (
      <div className="content-page">
        <PageMeta title="Article not found | Rent Your Ride" />
        <SiteHeader />
        <ContentPageHero crumb="News" />
        <div className="content-page-body">
          <h1 className="content-page-title">We couldn&apos;t find that article</h1>
          <p className="article-status">
            It may have been moved or unpublished.{' '}
            <Link className="terms-email-link" to="/news">
              Browse all articles
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  const { article } = state;
  const publishedIso = article.publishedAt ?? article.createdAt;

  return (
    <div className="content-page">
      <PageMeta
        title={`${article.title} | Rent Your Ride`}
        description={article.summary}
        canonical={`${SITE_ORIGIN}/news/${article.slug}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: article.title,
          description: article.summary,
          datePublished: publishedIso,
          dateModified: article.updatedAt,
          author: { '@type': 'Organization', name: article.author },
          publisher: {
            '@type': 'Organization',
            name: 'Rent Your Ride',
            logo: {
              '@type': 'ImageObject',
              url: `${SITE_ORIGIN}/logo.png`,
            },
          },
          mainEntityOfPage: `${SITE_ORIGIN}/news/${article.slug}`,
          ...(article.coverImageUrl ? { image: [article.coverImageUrl] } : {}),
        }}
      />
      <SiteHeader />
      <ContentPageHero crumb="News" />

      <article className="content-page-body content-page-body--article">
        <p className="article-eyebrow">
          <span className="article-category">{article.category}</span>
          <span className="article-byline">
            By {article.author}
            <span aria-hidden="true"> · </span>
            <time dateTime={publishedIso.slice(0, 10)}>
              {formatNewsDate(publishedIso.slice(0, 10))}
            </time>
          </span>
        </p>

        <h1 className="article-title">{article.title}</h1>
        <p className="article-summary">{article.summary}</p>

        {article.coverImageUrl ? (
          <img className="article-cover" src={article.coverImageUrl} alt="" />
        ) : null}

        <ArticleBody body={article.body} />

        <p className="article-back">
          <Link className="news-view-all" to="/news">
            All articles
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
      </article>
    </div>
  );
}
