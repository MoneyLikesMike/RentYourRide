import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { ParsedPlace } from '../api/maps';
import { withAuthBackground } from '../auth/authModal';
import { useAuth } from '../auth/AuthContext';
import PlacesAutocomplete from '../components/PlacesAutocomplete';
import SearchTimePicker, {
  snapSearchTime,
} from '../components/SearchTimePicker';
import PageMeta, { HOME_SEO } from '../components/PageMeta';
import CommunityExperiences from '../components/CommunityExperiences';
import PhoneMockup from '../components/PhoneMockup';
import SiteHeader from '../components/SiteHeader';
import { AppStoreBadge, GooglePlayBadge } from '../components/StoreBadges';
import TextDecorator from '../components/TextDecorator';
import type { SearchNavState } from '../types/search';
import { goToHomeTop } from '../utils/goToHomeTop';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeInput(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function combineLocal(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

function DateField({
  value,
  onChange,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  'aria-label': string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    try {
      el.showPicker?.();
    } catch {
      el.focus();
      el.click();
    }
  };

  return (
    <label className="dt-control" onClick={openPicker}>
      <span className="dt-value">{formatDisplayDate(value)}</span>
      <span className="dt-chevron" aria-hidden />
      <input
        ref={inputRef}
        type="date"
        className="dt-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      />
    </label>
  );
}

function defaultStart(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function defaultEnd(start: Date): Date {
  const d = new Date(start);
  d.setDate(d.getDate() + 1);
  return d;
}

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const initialStart = useMemo(() => defaultStart(), []);
  const initialEnd = useMemo(() => defaultEnd(initialStart), [initialStart]);

  const [addressText, setAddressText] = useState('');
  const [place, setPlace] = useState<ParsedPlace | null>(null);
  const [startDate, setStartDate] = useState(() => toDateInput(initialStart));
  const [startTime, setStartTime] = useState(() =>
    snapSearchTime(toTimeInput(initialStart)),
  );
  const [endDate, setEndDate] = useState(() => toDateInput(initialEnd));
  const [endTime, setEndTime] = useState(() =>
    snapSearchTime(toTimeInput(initialEnd)),
  );
  const [error, setError] = useState<string | null>(null);
  const [howVideo, setHowVideo] = useState<'renting' | 'listing' | null>(null);

  useEffect(() => {
    const state = location.state as { openHowItWorks?: boolean } | null;
    if (state?.openHowItWorks) {
      setHowVideo('renting');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const onOpen = () => setHowVideo('renting');
    window.addEventListener('ryr:how-it-works', onOpen);
    return () => window.removeEventListener('ryr:how-it-works', onOpen);
  }, []);

  const buildNavState = (vehicleType?: string[]): SearchNavState | null => {
    const city =
      place?.city?.trim() ||
      addressText.split(',')[0]?.trim() ||
      addressText.trim();

    const start = combineLocal(startDate, startTime);
    const end = combineLocal(endDate, endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError('Choose valid start and end dates.');
      return null;
    }
    if (end <= start) {
      setError('End must be after start.');
      return null;
    }

    return {
      location: {
        query: place?.query || addressText.trim() || city,
        city: city || 'Winnipeg',
        country: place?.country,
        latitude: place?.latitude ?? null,
        longitude: place?.longitude ?? null,
      },
      dates: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      vehicleType,
    };
  };

  const goSearch = (vehicleType?: string[]) => {
    setError(null);
    const city =
      place?.city?.trim() ||
      addressText.split(',')[0]?.trim() ||
      addressText.trim();

    if (!city && !vehicleType) {
      setError('Enter a city, airport, or address to search.');
      return;
    }

    const state = buildNavState(vehicleType ? [...vehicleType] : undefined);
    if (!state) return;
    navigate('/find-your-car', { state });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    goSearch();
  };

  /** Carries whatever they've typed over to the search page, filters open. */
  const goAdvancedSearch = () => {
    setError(null);
    const state = buildNavState();
    if (!state) return;
    navigate('/find-your-car', { state: { ...state, openFilters: true } });
  };

  const onPlaceSelected = (parsed: ParsedPlace) => {
    setPlace(parsed);
    setAddressText(parsed.query);
    setError(null);
  };

  const goAuthenticated = (path: string) => {
    if (!isAuthenticated) {
      navigate('/login', {
        state: withAuthBackground(location, { from: path }),
      });
      return;
    }
    navigate(path);
  };

  return (
    <div className="home-page">
      <PageMeta {...HOME_SEO} />
      <SiteHeader />

      <div className="home-wrapper">
        <div className="home-hero-copy">
          <h1 className="home-caption">
            Experience more,
            <br />
            together.
          </h1>
          <p className="home-subcaption">
            Rent a diverse selection of vehicles from local hosts.
          </p>

          <div className="store-buttons">
            <a
              href="https://apps.apple.com/us/app/rent-your-ride/id1495074000"
              className="store-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <AppStoreBadge className="store-badge" />
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.rentyourrideca"
              className="store-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GooglePlayBadge className="store-badge" />
            </a>
          </div>
        </div>

        <button
          type="button"
          className="how-it-works-btn"
          onClick={() => setHowVideo('renting')}
        >
          <img src="/home/play.png" alt="" className="how-play" />
          How it works?
        </button>

        <form className="sort-bar" onSubmit={onSubmit} noValidate>
          <div className="filters-side">
            <div className="location-input-wrapper">
              <PlacesAutocomplete
                value={addressText}
                onChange={(text) => {
                  setAddressText(text);
                  setPlace(null);
                }}
                onPlaceSelected={onPlaceSelected}
              />
            </div>
            <div className="sort-border" />
            <div className="option-wrapper">
              <span className="option-caption">Start</span>
              <div className="select-wrapper">
                <DateField
                  value={startDate}
                  onChange={setStartDate}
                  aria-label="Start date"
                />
                <SearchTimePicker
                  value={startTime}
                  onChange={setStartTime}
                  aria-label="Start time"
                />
              </div>
            </div>
            <div className="sort-border" />
            <div className="option-wrapper">
              <span className="option-caption">End</span>
              <div className="select-wrapper">
                <DateField
                  value={endDate}
                  onChange={setEndDate}
                  aria-label="End date"
                />
                <SearchTimePicker
                  value={endTime}
                  onChange={setEndTime}
                  aria-label="End time"
                />
              </div>
            </div>
          </div>
          <button type="submit" className="search-ride-btn">
            <img src="/home/search.png" alt="" className="search-icon" />
            Search Ride
          </button>
        </form>

        {error ? <p className="home-search-error">{error}</p> : null}
        <button
          type="button"
          className="advanced-label"
          onClick={goAdvancedSearch}
        >
          More advanced search
        </button>

        <img
          src="/home/home-background.png"
          alt=""
          className="home-background"
        />

        <p className="home-subcaption home-platform-tagline">
          Canada&apos;s next peer to peer vehicle rental platform.
        </p>

        <img src="/home/divider.png" alt="" className="divider" />

        <div className="block-wrapper">
          <img
            src="/home/big-circle.png"
            alt=""
            className="circle big-left"
          />
          <img src="/home/circle.png" alt="" className="circle middle-left" />
          <div className="block left">
            <h2 className="block-caption">
              <TextDecorator title="Unique Experiences" width="16rem" />
              That Are
              <TextDecorator title="Convenient" width="9rem" />
              For You
            </h2>
            <ol className="block-steps">
              <li className="block-step">
                <span className="block-step-num" aria-hidden>
                  1
                </span>
                <h3 className="block-step-title">Find Your Perfect Ride</h3>
                <p className="block-text">
                  Filter your search with options that work best for you.
                  Choose from a diverse selection of rental vehicles offered by
                  local hosts.
                </p>
              </li>
              <li className="block-step">
                <span className="block-step-num" aria-hidden>
                  2
                </span>
                <h3 className="block-step-title">Book Your Ride</h3>
                <p className="block-text">
                  Book trips quickly and easily through the app, message the
                  host and choose extra rental options that make your trip
                  easier and more convenient.
                </p>
              </li>
              <li className="block-step">
                <span className="block-step-num" aria-hidden>
                  3
                </span>
                <h3 className="block-step-title">Hit the Road</h3>
                <p className="block-text">
                  Have the vehicle dropped off to you or pick it up from an
                  agreed location. Check in through the app, grab the keys and
                  experience more together.
                </p>
              </li>
            </ol>
            <button
              type="button"
              className="block-button"
              onClick={() => setHowVideo('renting')}
            >
              See how it works
              <img src="/home/arrow.png" alt="" className="arrow" />
            </button>
          </div>
          <img
            src="/home/home-1.png"
            alt="A guest and a local host trading car keys for payment beside a rental vehicle."
            className="home-image"
          />
        </div>

        <img src="/home/divider.png" alt="" className="divider" />

        <div className="block-wrapper">
          <img
            src="/home/home-2.png"
            alt="A host picking up a traveller and their luggage in a car listed on Rent Your Ride."
            className="home-image"
          />
          <div className="block right">
            <h2 className="block-caption">
              Let Your Ride{' '}
              <TextDecorator title="Work" width="5rem" /> For You
            </h2>
            <ol className="block-steps">
              <li className="block-step">
                <span className="block-step-num" aria-hidden>
                  1
                </span>
                <h3 className="block-step-title">List Your Ride</h3>
                <p className="block-text">
                  List your ride in under 5 minutes. It&apos;s free! Set your
                  price and set your expectations. Choose your ride&apos;s
                  availability that best fits your schedule.
                </p>
              </li>
              <li className="block-step">
                <span className="block-step-num" aria-hidden>
                  2
                </span>
                <h3 className="block-step-title">Meet New People</h3>
                <p className="block-text">
                  With over 24,000 new users our community is growing every
                  day. You will receive booking requests. Accept a booking
                  request, confirm the trip details, and ask any questions you
                  may have. Check in through the app, exchange the keys and
                  start earning.
                </p>
              </li>
              <li className="block-step">
                <span className="block-step-num" aria-hidden>
                  3
                </span>
                <h3 className="block-step-title">Relax &amp; Earn Extra Cash</h3>
                <p className="block-text">
                  Offset your car payments. The average host earns up to $600 a
                  month. Get paid directly to your bank account a couple days
                  after each trip. You&apos;ll earn 75% of your trip price.
                </p>
              </li>
            </ol>
            <button
              type="button"
              className="block-button"
              onClick={() => setHowVideo('listing')}
            >
              See how it works
              <img src="/home/arrow.png" alt="" className="arrow" />
            </button>
          </div>
          <img
            src="/home/big-circle.png"
            alt=""
            className="circle big-right"
          />
          <img
            src="/home/small-circle.png"
            alt=""
            className="circle small-right"
          />
        </div>

        <img src="/home/divider.png" alt="" className="divider" />

        <section className="coverage-section">
          <h2 className="coverage-heading">
            <TextDecorator title="Don’t Worry" width="11rem" /> We&apos;ve Got
            You Covered
          </h2>
          <div className="block-wrapper coverage-row">
            <div className="block left coverage-copy">
              <h3 className="coverage-subheading">Peace Of Mind</h3>
              <p className="coverage-text">
                We want to make sure the Rent Your Ride community is safe for
                both users and owners of vehicles on our platform. We have
                coverage options for you to give you peace of mind!
              </p>
              <Link to="/insurance" className="block-button">
                Read More
                <img src="/home/arrow.png" alt="" className="arrow" />
              </Link>
            </div>
            <img
              src="/home/car-protection.png"
              alt="Vehicle protection and insurance."
              className="home-image coverage-image"
            />
          </div>
        </section>

        <img src="/home/divider.png" alt="" className="divider" />

        <div className="block-wrapper get-started-row">
          <img
            src="/home/half-circle-2.png"
            alt=""
            className="circle half-right"
          />
          <div className="get-started-visual">
            <PhoneMockup
              src="/about/app-listing-screen.png"
              alt="The Rent Your Ride app showing a vehicle listing ready to book."
              className="get-started-phone"
            />
            <img src="/home/mouse.png" alt="" className="get-started-mouse" />
          </div>
          <div className="block right get-started-copy">
            <h2 className="block-caption">
              Get started
              <TextDecorator title="today" width="5rem" />
            </h2>
            <p className="block-text-black">
              List your vehicle and start earning now. Pay off your car loan
              and insurance quicker, or earn extra money for whatever you need.
              Rent a vehicle for up to 35% less than your traditional rental
              companies!
            </p>
            <div className="buttons-wrapper">
              <button
                type="button"
                className="cta-rent"
                onClick={() => goToHomeTop(navigate, location.pathname)}
              >
                Rent a ride
                <img src="/home/arrow.png" alt="" className="arrow" />
              </button>
              <button
                type="button"
                className="cta-list"
                onClick={() => goAuthenticated('/profile/list-your-ride')}
              >
                List your ride
                <img src="/home/arrow.png" alt="" className="arrow" />
              </button>
            </div>
          </div>
        </div>

        <CommunityExperiences />
      </div>

      {howVideo ? (
        <div
          className="how-modal-backdrop"
          role="presentation"
          onClick={() => setHowVideo(null)}
        >
          <div
            className="how-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="how-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="how-modal-close"
              onClick={() => setHowVideo(null)}
              aria-label="Close"
            >
              <img src="/close.png" alt="" className="close-x-img" />
            </button>
            <h2 id="how-title">How it works?</h2>
            <video
              key={howVideo}
              className="how-modal-video"
              src={
                howVideo === 'listing'
                  ? '/home/how-listing-works.mp4'
                  : '/home/how-it-works.mp4'
              }
              controls
              autoPlay
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
