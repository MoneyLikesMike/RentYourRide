import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchAllBookings,
  type BookingDto,
} from '../api/bookings';
import {
  isPayoutAccountReady,
  payoutsAccountStatus,
} from '../api/payouts';
import { listHostListings } from '../api/hostListings';
import ProfileLayout from '../components/ProfileLayout';

const TILES = [
  {
    label: 'List a new ride',
    to: '/profile/list-your-ride',
    icon: '/trips/list-a-new-ride.png',
  },
  {
    label: 'Rental requests',
    to: '/profile/trips/requests',
    icon: '/trips/suitcaseAlt.png',
  },
  {
    label: 'Active rentals',
    to: '/profile/trips/active',
    icon: '/trips/usersAlt.png',
  },
  {
    label: 'Rental agreements',
    to: '/profile/trips/agreements',
    icon: '/trips/text.png',
  },
  {
    label: 'Payouts',
    to: '/profile/trips/payouts',
    icon: '/trips/price.png',
  },
  {
    label: 'Rental history',
    to: '/profile/trips/history',
    icon: '/trips/icHistory24Px.png',
  },
] as const;

function TripsHubBody() {
  const navigate = useNavigate();
  const [canUseListingsHub, setCanUseListingsHub] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [listings, status] = await Promise.all([
          listHostListings().catch(() => []),
          payoutsAccountStatus().catch(() => null),
        ]);
        let local = false;
        try {
          local = sessionStorage.getItem('ryr_payout_setup_complete') === '1';
        } catch {
          local = false;
        }
        if (!cancelled) {
          setCanUseListingsHub(
            listings.length > 0 || isPayoutAccountReady(status) || local,
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

  const onTile = (to: string) => {
    if (to === '/profile/list-your-ride' && !canUseListingsHub) {
      navigate('/profile/list-your-ride');
      return;
    }
    if (to === '/profile/trips/payouts' && !canUseListingsHub) {
      navigate('/profile/trips/payouts?empty=1');
      return;
    }
    navigate(to);
  };

  return (
    <div className="trips-hub">
      <h1 className="trips-hub-title">Rental manager</h1>
      <div className="trips-hub-rule" />
      {loading ? <p className="profile-status">Loading…</p> : null}
      <div className="trips-tile-grid">
        {TILES.map((tile) => (
          <button
            key={tile.to}
            type="button"
            className="trips-tile"
            onClick={() => onTile(tile.to)}
          >
            <img src={tile.icon} alt="" className="trips-tile-icon" />
            {tile.label}
          </button>
        ))}
      </div>
      {/* Warm bookings cache for list pages */}
      <WarmBookingsCache />
    </div>
  );
}

function WarmBookingsCache() {
  useEffect(() => {
    void fetchAllBookings().catch(() => [] as BookingDto[]);
  }, []);
  return null;
}

export default function TripsPage() {
  return (
    <ProfileLayout title="Rental manager">{() => <TripsHubBody />}</ProfileLayout>
  );
}
