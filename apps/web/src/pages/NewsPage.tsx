import ContentPageHero from '../components/ContentPageHero';
import NewsCard from '../components/NewsCard';
import PageMeta, { breadcrumbLd, SITE_ORIGIN } from '../components/PageMeta';
import SiteHeader from '../components/SiteHeader';
import TextDecorator from '../components/TextDecorator';
import { useNewsFeed } from '../content/newsFeed';

export default function NewsPage() {
  const items = useNewsFeed(24);

  return (
    <div className="content-page">
      <PageMeta
        title="News & Updates | Rent Your Ride"
        description="Product news, app updates and travel tips from the Rent Your Ride team."
        canonical={`${SITE_ORIGIN}/news`}
        jsonLd={breadcrumbLd([{ name: 'News', path: '/news' }])}
      />
      <SiteHeader />
      <ContentPageHero crumb="News" />
      <div className="content-page-body content-page-body--learn">
        <header className="learn-intro">
          <h1 className="content-page-title">
            News &amp; <TextDecorator title="Updates" width="100%" />
          </h1>
          <p className="learn-lead">Everything new at Rent Your Ride.</p>
        </header>

        <ul className="news-list">
          {items.map((item) => (
            <li key={item.id} className="news-item">
              <NewsCard item={item} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
