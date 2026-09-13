import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/http';
import {
  fetchAllBookings,
  type BookingDto,
} from '../api/bookings';
import { useAuth } from '../auth/AuthContext';
import ProfileLayout from '../components/ProfileLayout';
import TripBookingCard from '../components/TripBookingCard';
import {
  filterActiveForPerspective,
  filterBookingsForGuest,
  filterBookingsForHost,
  isHistoryForPerspective,
  splitBookingBuckets,
} from '../utils/trips';

export type TripsSection =
  | 'requests'
  | 'active'
  | 'history'
  | 'agreements';

const TITLES: Record<TripsSection, string> = {
  requests: 'Rental requests',
  active: 'Active rentals',
  history: 'Rental history',
  agreements: 'Rental agreements',
};

function TripsSectionBody({ section }: { section: TripsSection }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const authUserId = user?.id;
  const [tab, setTab] = useState<'guest' | 'host'>('guest');
  const [all, setAll] = useState<BookingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchAllBookings();
        if (!cancelled) setAll(rows);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Could not load trips',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const isHost = tab === 'host';
    const scoped = isHost
      ? filterBookingsForHost(all, authUserId)
      : filterBookingsForGuest(all, authUserId);
    const { pending, active } = splitBookingBuckets(scoped);

    if (section === 'requests') {
      return pending.filter((b) => !(isHost && b.instantBooking === true));
    }
    if (section === 'active') {
      return filterActiveForPerspective(active, isHost);
    }
    if (section === 'history') {
      return scoped.filter((b) => isHistoryForPerspective(b, isHost));
    }
    // agreements — checkout agreement signed for this perspective
    return scoped.filter((b) =>
      isHost
        ? b.hostCheckoutRentalAgreementSignedAt != null
        : b.guestCheckoutRentalAgreementSignedAt != null,
    );
  }, [all, authUserId, section, tab]);

  const emptyCopy =
    section === 'requests'
      ? tab === 'guest'
        ? "You haven't sent any rental requests yet."
        : "You don't have any rental requests yet."
      : section === 'active'
        ? tab === 'guest'
          ? "You don't have any active rentals."
          : "You don't have any active rentals yet."
        : section === 'history'
          ? 'No rental history yet.'
          : 'No completed check-out agreements yet.';

  const emptyCta =
    tab === 'guest'
      ? { to: '/find-your-car', label: 'Find a ride' }
      : { to: '/profile/list-your-ride', label: 'List a ride' };

  return (
    <div className="trips-page">
      <div className="trips-page-head">
        <button
          type="button"
          className="trips-back"
          aria-label="Back"
          onClick={() => navigate('/profile/trips')}
        >
          ‹
        </button>
        <h1 className="trips-page-title">{TITLES[section]}</h1>
      </div>

      <div className="trips-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={`trips-tab${tab === 'guest' ? ' is-active' : ''}`}
          aria-selected={tab === 'guest'}
          onClick={() => setTab('guest')}
        >
          Guest
        </button>
        <button
          type="button"
          role="tab"
          className={`trips-tab${tab === 'host' ? ' is-active' : ''}`}
          aria-selected={tab === 'host'}
          onClick={() => setTab('host')}
        >
          Host
        </button>
      </div>

      {loading ? <p className="profile-status">Loading…</p> : null}
      {error ? <p className="trips-error">{error}</p> : null}

      {!loading && rows.length === 0 ? (
        <div className="trips-empty">
          <img src="/trips/EmptyRoad.png" alt="" className="trips-empty-icon" />
          <p>{emptyCopy}</p>
          <Link to={emptyCta.to} className="trips-empty-cta">
            {emptyCta.label}
          </Link>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <ul className="trips-list">
          {rows.map((b) => (
            <TripBookingCard
              key={b.id}
              booking={b}
              isHost={tab === 'host'}
              to={`/profile/trips/${b.id}`}
              showPrimaryAction={section === 'active'}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function TripsRequestsPage() {
  return (
    <ProfileLayout title="Trip requests">
      {() => <TripsSectionBody section="requests" />}
    </ProfileLayout>
  );
}

export function TripsActivePage() {
  return (
    <ProfileLayout title="Active trips">
      {() => <TripsSectionBody section="active" />}
    </ProfileLayout>
  );
}

export function TripsHistoryPage() {
  return (
    <ProfileLayout title="Trip history">
      {() => <TripsSectionBody section="history" />}
    </ProfileLayout>
  );
}

export function TripsAgreementsPage() {
  return (
    <ProfileLayout title="Rental agreements">
      {() => <TripsSectionBody section="agreements" />}
    </ProfileLayout>
  );
}
