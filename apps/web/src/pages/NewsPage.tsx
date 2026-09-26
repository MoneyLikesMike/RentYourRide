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
        title="Follow Our Journey | Rent Your Ride News"
        description="Stay on the road to more experiences with Rent Your Ride’s company updates, platform updates, partnerships and press releases."
        canonical={`${SITE_ORIGIN}/news`}
        jsonLd={breadcrumbLd([{ name: 'News', path: '/news' }])}
      />
      <SiteHeader />
      <ContentPageHero crumb="News" />
      <div className="content-page-body content-page-body--learn">
        <header className="learn-intro">
          <h1 className="content-page-title">
            Follow Our <TextDecorator title="Journey" width="100%" />
          </h1>
          <p className="learn-lead">
            Stay on the road to more experiences with Rent Your Ride&apos;s
            company updates, platform updates, partnerships and press releases.
          </p>
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
