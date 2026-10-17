import ContentPageHero from '../components/ContentPageHero';
import PageMeta, { breadcrumbLd, SITE_ORIGIN } from '../components/PageMeta';
import SiteHeader from '../components/SiteHeader';
import { AppStoreBadge } from '../components/StoreBadges';
import TextDecorator from '../components/TextDecorator';
import { APP_STORE_URL } from '../constants/appStore';

export default function DownloadPage() {
  return (
    <div className="content-page">
      <PageMeta
        title="Download Rent Your Ride | App Store"
        description="Download Rent Your Ride on the App Store. Rent vehicles from local hosts, or list your ride and start earning on iPhone."
        canonical={`${SITE_ORIGIN}/download`}
        jsonLd={breadcrumbLd([{ name: 'Download', path: '/download' }])}
      />
      <SiteHeader />
      <ContentPageHero crumb="Download" />
      <div className="content-page-body content-page-body--contact">
        <h1 className="content-page-title">
          Get the{' '}
          <TextDecorator title="app" width="3.5rem" />
        </h1>
        <p className="content-page-copy">
          Rent a diverse selection of vehicles from local hosts, or list your
          ride and start earning. Download Rent Your Ride on the App Store and
          experience more, together.
        </p>
        <p className="content-page-copy">
          Android: use rentyourride.ca in your browser.
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
        </div>
      </div>
    </div>
  );
}
