import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { ParsedPlace } from '../api/maps';
import PlacesAutocomplete from '../components/PlacesAutocomplete';
import SiteHeader from '../components/SiteHeader';
import { AppStoreBadge, GooglePlayBadge } from '../components/StoreBadges';
import TextDecorator from '../components/TextDecorator';
import type { SearchNavState } from '../types/search';

const RIDE_TYPES = [
  {
    title: 'Exotic',
    text:
      "Ride in style. You'll find an array of speedy, sexy, and luxurious vehicles available just for you. Stand out & shine!",
    image: '/home/exotics.png',
    value: ['SUV'],
  },
  {
    title: 'Everyday rides',
    text:
      'For the economical and ordinary commuter. You want to get from point A to B, why overspend? Get where you need to go.',
    image: '/home/everyday-rides.png',
    value: ['Car'],
  },
  {
    title: 'Offroad',
    text:
      "You're looking for adventure. You're looking in the right place. Browse a variety of off-road vehicles for wherever life takes you!",
    image: '/home/off-road.png',
    value: ['Pickup Truck'],
  },
  {
    title: 'Motorcycles',
    text:
      "For the daring & passionate. You'll find a variety of bikes available for your next adventure. What's stopping you? Get riding.",
    image: '/home/motorcycles.png',
    value: ['Mooped And Scooter'],
  },
] as const;

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
  const initialStart = useMemo(() => defaultStart(), []);
  const initialEnd = useMemo(() => defaultEnd(initialStart), [initialStart]);

  const [addressText, setAddressText] = useState('');
  const [place, setPlace] = useState<ParsedPlace | null>(null);
  const [startDate, setStartDate] = useState(() => toDateInput(initialStart));
  const [startTime, setStartTime] = useState(() => toTimeInput(initialStart));
  const [endDate, setEndDate] = useState(() => toDateInput(initialEnd));
  const [endTime, setEndTime] = useState(() => toTimeInput(initialEnd));
  const [error, setError] = useState<string | null>(null);
  const [howOpen, setHowOpen] = useState(false);

  useEffect(() => {
    const state = location.state as { openHowItWorks?: boolean } | null;
    if (state?.openHowItWorks) {
      setHowOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const onOpen = () => setHowOpen(true);
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

  const onPlaceSelected = (parsed: ParsedPlace) => {
    setPlace(parsed);
    setAddressText(parsed.query);
    setError(null);
  };

  return (
    <div className="home-page">
      <SiteHeader onHowItWorks={() => setHowOpen(true)} />

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
          onClick={() => setHowOpen(true)}
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
                <input
                  type="date"
                  className="dt-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-label="Start date"
                />
                <input
                  type="time"
                  className="dt-input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  aria-label="Start time"
                />
              </div>
            </div>
            <div className="sort-border" />
            <div className="option-wrapper">
              <span className="option-caption">End</span>
              <div className="select-wrapper">
                <input
                  type="date"
                  className="dt-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  aria-label="End date"
                />
                <input
                  type="time"
                  className="dt-input"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
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
        <span className="advanced-label">More advanced search</span>

        <img
          src="/home/home-background.png"
          alt=""
          className="home-background"
        />

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
              <TextDecorator title="Earn" width="4rem" />
              Money or
              <TextDecorator title="Save" width="4rem" />
              Money
            </h2>
            <p className="block-text">
              Let your ride work for you, list your vehicle and start earning
              now. Save from traditional rental companies by renting the
              perfect ride from a local vehicle owner.
            </p>
            <button
              type="button"
              className="block-button"
              onClick={() => setHowOpen(true)}
            >
              See how it works
              <img src="/home/arrow.png" alt="" className="arrow" />
            </button>
          </div>
          <img src="/home/home-1.png" alt="" className="home-image" />
        </div>

        <img src="/home/divider.png" alt="" className="divider" />

        <div className="block-wrapper">
          <img src="/home/home-2.png" alt="" className="home-image" />
          <div className="block right">
            <h2 className="block-caption">
              <TextDecorator title="Don’t worry!" width="11rem" />
              We have you covered.
            </h2>
            <p className="block-text">
              We want to make sure the Rent Your Ride community is safe for
              both users and owners of vehicles on our platform. We have
              coverage options for you to give you peace of mind!
            </p>
            <button type="button" className="block-button">
              Coverage Options
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

        <div className="block-wrapper center">
          <img
            src="/home/half-circle.png"
            alt=""
            className="circle half-left"
          />
          <div className="block center">
            <h2 className="block-caption">
              <TextDecorator title="Types of ride" width="11rem" />
            </h2>
            <div className="ride-types-wrapper">
              {RIDE_TYPES.map((type) => (
                <div className="type" key={type.title}>
                  <img
                    src={type.image}
                    alt=""
                    className="type-image"
                  />
                  <span className="type-caption">{type.title}</span>
                  <span className="block-text center">{type.text}</span>
                  <button
                    type="button"
                    className="block-button center"
                    onClick={() => goSearch([...type.value])}
                  >
                    Rent
                    <img src="/home/arrow.png" alt="" className="arrow" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <img src="/home/divider.png" alt="" className="divider" />

        <div className="block-wrapper center">
          <img
            src="/home/half-circle-2.png"
            alt=""
            className="circle half-right"
          />
          <div className="block center">
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
                onClick={() => goSearch()}
              >
                Rent car
                <img src="/home/arrow.png" alt="" className="arrow" />
              </button>
              <Link to="/signup" className="cta-list">
                List car
                <img src="/home/arrow.png" alt="" className="arrow" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {howOpen ? (
        <div
          className="how-modal-backdrop"
          role="presentation"
          onClick={() => setHowOpen(false)}
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
              onClick={() => setHowOpen(false)}
              aria-label="Close"
            >
              <img src="/close.png" alt="" className="close-x-img" />
            </button>
            <h2 id="how-title">How it works?</h2>
            <p>
              Search for a ride near you, book instantly or request approval,
              then pick up and go. Hosts list their vehicles and earn when
              guests rent.
            </p>
            <button
              type="button"
              className="search-ride-btn how-modal-cta"
              onClick={() => setHowOpen(false)}
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
