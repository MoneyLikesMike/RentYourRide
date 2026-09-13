import ContentPageHero from '../components/ContentPageHero';
import PageMeta, { breadcrumbLd, SITE_ORIGIN } from '../components/PageMeta';
import SiteHeader from '../components/SiteHeader';
import { AppStoreBadge, GooglePlayBadge } from '../components/StoreBadges';
import TextDecorator from '../components/TextDecorator';

const APP_STORE_URL =
  'https://apps.apple.com/us/app/rent-your-ride/id1495074000';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.rentyourrideca';

export default function DownloadPage() {
  return (
    <div className="content-page">
      <PageMeta
        title="Download Rent Your Ride | App Store & Google Play"
        description="Download the Rent Your Ride app. Rent vehicles from local hosts, or list your ride and start earning — available on the App Store and Google Play."
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
          ride and start earning. Download Rent Your Ride for iPhone or Android
          and experience more, together.
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
    </div>
  );
}
