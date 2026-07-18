import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/http';
import { listHostListings } from '../api/hostListings';
import {
  listingPhotoUrl,
  type ListingDetail,
} from '../api/listings';
import ProfileLayout from '../components/ProfileLayout';

function YourRidesBody() {
  const [rides, setRides] = useState<ListingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await listHostListings();
        if (!cancelled) setRides(list);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Could not load your rides',
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

  return (
    <div className="your-rides">
      <div className="profile-top">
        <h1 className="profile-title profile-title--bold">Your rides</h1>
        <Link to="/profile/list-your-ride" className="profile-top-link">
          + List your ride
        </Link>
      </div>

      {loading ? <p className="profile-status">Loading…</p> : null}
      {error ? <p className="profile-error">{error}</p> : null}

      {!loading && !rides.length ? (
        <p className="profile-status">
          You haven’t listed any rides yet.{' '}
          <Link to="/profile/list-your-ride">List your first ride</Link>
        </p>
      ) : null}

      <div className="your-rides-grid">
        {rides.map((ride) => {
          const photo = listingPhotoUrl(ride);
          return (
            <Link
              key={ride.id}
              to={`/find-your-car/${ride.id}`}
              className="your-rides-card"
            >
              {photo ? (
                <img src={photo} alt="" className="your-rides-photo" />
              ) : (
                <div className="your-rides-photo your-rides-photo--empty" />
              )}
              <div className="your-rides-meta">
                <span className="your-rides-name">{ride.title}</span>
                <span className="your-rides-status">
                  {ride.published ? 'Published' : 'Draft'} · $
                  {Math.round(ride.pricePerDay)}/day
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function YourRidesPage() {
  return (
    <ProfileLayout>
      {() => <YourRidesBody />}
    </ProfileLayout>
  );
}
