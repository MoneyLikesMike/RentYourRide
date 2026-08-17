import { useRef, useState } from 'react';
import ContentPageHero from '../components/ContentPageHero';
import PageMeta, { breadcrumbLd, SITE_ORIGIN } from '../components/PageMeta';
import SiteHeader from '../components/SiteHeader';
import TextDecorator from '../components/TextDecorator';

const LIST_STEPS = [
  'Join the family! The RYR platform is a way to build relationships. By joining RYR you’re joining a safe trusted community.',
  'List your ride and start making money! Set your daily price, add a description and upload some pictures.',
  'Start responding to your guests. Guests can instantly book your ride or send a request based on your listing.',
  'Meet your guest! Provide a clean vehicle with a full tank of fuel. Do a walk around of the vehicle and complete the check in process on the app.',
  'Receive your ride with a new friendship and money in your pocket! Do a walk around of the vehicle. Complete the checkout process through the app and leave a review for your guest.',
] as const;

const BOOK_STEPS = [
  'Join the family! The RYR platform is a way to build relationships. By joining RYR you’re joining a safe trusted community.',
  'Find the perfect ride! Search available listings in your city and refine your results to best suit your trip.',
  'Send a booking request! The host will then accept or deny your request. If it’s an instant booking you will get an automatic approval.',
  'Meet the host! Bring your license, do a full walk around of the vehicle and complete the check in process through the app. If you have any questions just ask your friendly host.',
  'Return the vehicle clean, with a full tank, a new friendship and a positive experience. Do a walk around on the vehicle and complete the checkout process through the app. Don’t forget to leave a review for the host!',
] as const;

function StepList({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="how-steps">
      {steps.map((step, i) => (
        <li key={step} className="how-step">
          <span className="how-step-num" aria-hidden>
            {i + 1}
          </span>
          <p className="how-step-text">{step}</p>
        </li>
      ))}
    </ol>
  );
}

function HowColumnVideo({
  src,
  poster,
  label,
}: {
  src: string;
  poster: string;
  label: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    setPlaying(true);
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => {
      /* autoplay may be blocked; controls remain available */
    });
  };

  return (
    <div className={`how-column-video-wrap${playing ? ' is-playing' : ''}`}>
      <video
        ref={videoRef}
        className="how-column-video"
        src={src}
        poster={poster}
        controls={playing}
        playsInline
        preload="none"
        onEnded={() => setPlaying(false)}
        onPause={(e) => {
          if (e.currentTarget.ended) setPlaying(false);
        }}
      />
      {!playing ? (
        <button
          type="button"
          className="how-column-video-cover"
          onClick={play}
          aria-label={`Play ${label} video`}
        >
          <img src={poster} alt="" className="how-column-video-poster" />
          <span className="how-column-video-play" aria-hidden>
            <img src="/home/play.svg" alt="" />
          </span>
        </button>
      ) : null}
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="content-page">
      <PageMeta
        title="How Rent Your Ride Works | List & Book a Vehicle"
        description="See how Rent Your Ride works for hosts and guests — list your ride to earn, or book vehicles from local hosts across Canada."
        canonical={`${SITE_ORIGIN}/how-it-works`}
        jsonLd={breadcrumbLd([{ name: 'How It Works', path: '/how-it-works' }])}
      />
      <SiteHeader />
      <ContentPageHero crumb="How It Works" />
      <div className="content-page-body content-page-body--how">
        <h1 className="content-page-title">
          How Rent Your Ride{' '}
          <TextDecorator title="Works" width="6.5rem" />
        </h1>

        <h2 className="how-mission-heading">
          <TextDecorator title="Innovation" width="100%" />, World Class{' '}
          <TextDecorator title="Customer Service" width="100%" /> &amp;{' '}
          <TextDecorator title="Sharing" width="100%" />
        </h2>

        <p className="content-page-copy">
          Rent Your Ride’s mission is to change the rental industry through
          innovation and sharing by connecting vehicle owners with those who
          are looking to rent a vehicle, while providing world class customer
          service.
        </p>
        <p className="content-page-copy">
          We are creating a place where both locals and travellers are able to
          rent a diverse selection of vehicles with ease, anywhere in the
          world…. Where a vehicle owner can turn their ride into a source of
          income to help drive future adventures; and a tool to build
          relationships and connections around the globe.
        </p>

        <div className="how-columns">
          <section className="how-column">
            <h3 className="how-column-title">
              <TextDecorator title="List A Ride" width="100%" />
            </h3>
            <StepList steps={LIST_STEPS} />
            <HowColumnVideo
              src="/home/how-listing-works.mp4"
              poster="/home/how-listing-works-cover.jpg"
              label="List A Ride"
            />
          </section>

          <div className="how-columns-divider" aria-hidden />

          <section className="how-column">
            <h3 className="how-column-title">
              <TextDecorator title="Book A Ride" width="100%" />
            </h3>
            <StepList steps={BOOK_STEPS} />
            <HowColumnVideo
              src="/home/how-it-works.mp4"
              poster="/home/how-it-works-cover.jpg"
              label="Book A Ride"
            />
          </section>
        </div>
      </div>
    </div>
  );
}
