import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  addFavorite,
  listFavorites,
  removeFavorite,
} from '../api/favorites';
import { ApiError } from '../api/http';
import {
  listingPhotoUrl,
  type ListingDetail,
} from '../api/listings';
import ProfileLayout from '../components/ProfileLayout';
import {
  formatListingTripLabel,
  formatNoReviewsLabel,
  getListingDisplayRating,
  listingHasGuestReviews,
} from '../utils/listingRating';
import HeartIcon from '../components/FavoriteHeartIcon';

function Stars({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(rating || 0)));
  return (
    <span className="your-rides-stars" aria-label={`${filled} of 5 stars`}>
      {'★'.repeat(filled)}
      <span className="your-rides-stars-empty">{'★'.repeat(5 - filled)}</span>
    </span>
  );
}

function FavouritesBody() {
  const [rides, setRides] = useState<ListingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await listFavorites();
        if (!cancelled) setRides(list);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Could not load favourites',
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

  const remove = async (ride: ListingDetail) => {
    setBusyId(ride.id);
    setError(null);
    try {
      await removeFavorite(ride.id);
      setRides((prev) => prev.filter((r) => r.id !== ride.id));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not update favourite',
      );
      try {
        await addFavorite(ride.id);
      } catch {
        /* ignore rollback failure */
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="your-rides">
      <div className="profile-top">
        <h1 className="profile-title profile-title--bold">Favourites</h1>
        <Link to="/find-your-car" className="profile-top-link">
          Find a ride
        </Link>
      </div>

      {loading ? <p className="profile-status">Loading…</p> : null}
      {error ? <p className="profile-error">{error}</p> : null}

      {!loading && !rides.length ? (
        <div className="your-rides-empty">
          <p className="your-rides-empty-msg">No favourites yet</p>
          <p className="profile-status">
            Tap the heart on a ride to save it here.
          </p>
          <Link to="/" className="your-rides-empty-cta">
            Browse rides
          </Link>
        </div>
      ) : null}

      <div className="your-rides-grid">
        {rides.map((ride) => {
          const photo = listingPhotoUrl(ride);
          const vehicleType = (ride.vehicleType || '').toUpperCase() || 'CAR';
          return (
            <article key={ride.id} className="your-rides-card">
              <div className="your-rides-photo-wrap">
                <Link to={`/find-your-car/${ride.id}`}>
                  {photo ? (
                    <img src={photo} alt="" className="your-rides-photo" />
                  ) : (
                    <div className="your-rides-photo your-rides-photo--empty" />
                  )}
                </Link>
                <button
                  type="button"
                  className="fyc-fav fyc-fav--on your-rides-fav"
                  aria-label="Remove from favourites"
                  disabled={busyId === ride.id}
                  onClick={() => void remove(ride)}
                >
                  <HeartIcon filled />
                </button>
              </div>
              <Link
                to={`/find-your-car/${ride.id}`}
                className="your-rides-meta your-rides-meta-link"
              >
                <div className="your-rides-row">
                  <div className="your-rides-title-type">
                    <span className="your-rides-name">{ride.title}</span>
                    <span className="your-rides-type">{vehicleType}</span>
                  </div>
                  <div className="your-rides-price">
                    <span className="your-rides-amount">
                      ${Math.round(ride.pricePerDay)}
                    </span>
                    <span className="your-rides-cad"> CAD</span>
                  </div>
                </div>
                <div className="your-rides-row your-rides-row--bottom">
                  {listingHasGuestReviews(ride) ? (
                    <Stars rating={getListingDisplayRating(ride) ?? 0} />
                  ) : (
                    <span className="your-rides-new-host">
                      {formatNoReviewsLabel(ride)}
                    </span>
                  )}
                  <span className="your-rides-trips">
                    {formatListingTripLabel(ride)}
                  </span>
                </div>
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function FavouritesPage() {
  return (
    <ProfileLayout title="Favourites">
      {() => <FavouritesBody />}
    </ProfileLayout>
  );
}
