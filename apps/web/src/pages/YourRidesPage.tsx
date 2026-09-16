import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  addFavorite,
  listFavorites,
  removeFavorite,
} from '../api/favorites';
import { ApiError } from '../api/http';
import {
  deleteHostListing,
  listHostListings,
  publishHostListing,
  unpublishHostListing,
} from '../api/hostListings';
import {
  listingPhotoUrl,
  type ListingDetail,
} from '../api/listings';
import ProfileLayout from '../components/ProfileLayout';

type Tab = 'Active' | 'Deactivated';

function Stars({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(rating || 0)));
  return (
    <span className="your-rides-stars" aria-label={`${filled} of 5 stars`}>
      {'★'.repeat(filled)}
      <span className="your-rides-stars-empty">{'★'.repeat(5 - filled)}</span>
    </span>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="fyc-fav-icon"
      width="21"
      height="19"
      viewBox="0 0 24 22"
      aria-hidden
    >
      <path
        d="M12 20.5S2.5 14.2 2.5 8.4C2.5 5.1 5 2.8 8.1 2.8c1.8 0 3.4.9 3.9 2.2.5-1.3 2.1-2.2 3.9-2.2 3.1 0 5.6 2.3 5.6 5.6 0 5.8-9.5 12.1-9.5 12.1z"
        fill={filled ? '#f34949' : 'none'}
        stroke={filled ? '#f34949' : '#fff'}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      className="your-rides-btn-icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
      />
    </svg>
  );
}

function YourRidesBody() {
  const [rides, setRides] = useState<ListingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('Active');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ListingDetail | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favBusyId, setFavBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [list, favs] = await Promise.all([
          listHostListings(),
          listFavorites().catch(() => [] as ListingDetail[]),
        ]);
        if (!cancelled) {
          setRides(list);
          setFavoriteIds(new Set(favs.map((f) => String(f.id))));
        }
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

  const filtered = useMemo(
    () =>
      rides.filter((ride) =>
        tab === 'Active' ? ride.published : !ride.published,
      ),
    [rides, tab],
  );

  const togglePublish = async (ride: ListingDetail) => {
    const action = ride.published ? 'deactivate' : 'activate';
    const ok = window.confirm(
      ride.published
        ? 'Are you sure you want to deactivate this ride?'
        : 'Are you sure you want to activate this ride?',
    );
    if (!ok) return;

    setBusyId(ride.id);
    setError(null);
    try {
      const updated = ride.published
        ? await unpublishHostListing(ride.id)
        : await publishHostListing(ride.id);
      setRides((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setHoveredId(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : `Could not ${action} ride`,
      );
    } finally {
      setBusyId(null);
    }
  };

  const deleteRide = async (ride: ListingDetail) => {
    setBusyId(ride.id);
    setError(null);
    try {
      await deleteHostListing(ride.id);
      setRides((prev) => prev.filter((r) => r.id !== ride.id));
      setHoveredId(null);
      setDeleteTarget(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not delete ride',
      );
    } finally {
      setBusyId(null);
    }
  };

  const toggleFavorite = async (ride: ListingDetail) => {
    const id = String(ride.id);
    const isFav = favoriteIds.has(id);
    setFavBusyId(id);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      if (isFav) await removeFavorite(id);
      else await addFavorite(id);
    } catch (err) {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(id);
        else next.delete(id);
        return next;
      });
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not update favourite',
      );
    } finally {
      setFavBusyId(null);
    }
  };

  return (
    <div className="your-rides">
      <div className="profile-top">
        <h1 className="profile-title profile-title--bold">Your rides</h1>
        <Link to="/profile/list-your-ride" className="profile-top-link">
          + List your ride
        </Link>
      </div>

      <div className="your-rides-tabs" role="tablist" aria-label="Ride status">
        {(['Active', 'Deactivated'] as const).map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            className={`your-rides-tab${tab === name ? ' your-rides-tab--active' : ''}`}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {loading ? <p className="profile-status">Loading…</p> : null}
      {error ? <p className="profile-error">{error}</p> : null}

      {!loading && !filtered.length ? (
        <div className="your-rides-empty">
          <p className="your-rides-empty-msg">
            {rides.length && tab === 'Deactivated'
              ? "You don't have any deactivated rides."
              : "You don't have any rides listed. Do you want to add a new one?"}
          </p>
          {!(rides.length && tab === 'Deactivated') ? (
            <Link to="/profile/list-your-ride" className="your-rides-empty-cta">
              LIST A NEW RIDE
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="your-rides-grid">
        {filtered.map((ride) => {
          const photo = listingPhotoUrl(ride);
          const showActions = hoveredId === ride.id;
          const isFav = favoriteIds.has(String(ride.id));
          const vehicleType = (ride.vehicleType || '').toUpperCase() || 'CAR';
          const title =
            ride.title ||
            [ride.vehicleData?.make, ride.vehicleData?.model]
              .filter(Boolean)
              .join(' ') ||
            'Your ride';

          return (
            <div
              key={ride.id}
              className="your-rides-card"
              onMouseEnter={() => setHoveredId(ride.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="your-rides-photo-wrap">
                {photo ? (
                  <img src={photo} alt="" className="your-rides-photo" />
                ) : (
                  <div className="your-rides-photo your-rides-photo--empty" />
                )}
                {showActions && !ride.published ? (
                  <button
                    type="button"
                    className="your-rides-trash"
                    aria-label="Delete ride"
                    disabled={busyId === ride.id}
                    onClick={() => setDeleteTarget(ride)}
                  >
                    <img src="/profile/trash.png" alt="" />
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`fyc-fav your-rides-fav${isFav ? ' fyc-fav--on' : ''}`}
                  aria-label={
                    isFav ? 'Remove from favourites' : 'Add to favourites'
                  }
                  aria-pressed={isFav}
                  disabled={favBusyId === String(ride.id)}
                  onClick={() => void toggleFavorite(ride)}
                >
                  <HeartIcon filled={isFav} />
                </button>
              </div>

              {showActions ? (
                <div className="your-rides-actions">
                  <button
                    type="button"
                    className="your-rides-btn your-rides-btn--outline"
                    disabled={busyId === ride.id}
                    onClick={() => void togglePublish(ride)}
                  >
                    <img
                      src={
                        ride.published
                          ? '/profile/disabled.png'
                          : '/profile/done.png'
                      }
                      alt=""
                      className="your-rides-btn-icon"
                    />
                    {ride.published ? 'Deactivate' : 'Activate'}
                  </button>
                  <Link
                    to={`/profile/edit-ride/${ride.id}`}
                    className="your-rides-btn your-rides-btn--filled"
                  >
                    <EditIcon />
                    Edit
                  </Link>
                </div>
              ) : (
                <div className="your-rides-meta">
                  <div className="your-rides-row">
                    <div className="your-rides-title-type">
                      <span className="your-rides-name">{title}</span>
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
                    <Stars rating={ride.hostRating ?? 0} />
                    <span className="your-rides-trips">
                      {ride.hostTrips ?? 0} trips
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {deleteTarget ? (
        <div
          className="your-rides-confirm-backdrop"
          role="presentation"
          onClick={() => {
            if (!busyId) setDeleteTarget(null);
          }}
        >
          <div
            className="your-rides-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="your-rides-delete-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="your-rides-confirm-close"
              aria-label="Close"
              disabled={!!busyId}
              onClick={() => setDeleteTarget(null)}
            >
              <img src="/close.png" alt="" className="close-x-img" />
            </button>
            <h2 id="your-rides-delete-title">Delete ride?</h2>
            <p>
              Are you sure you want to permanently delete this ride? This can’t
              be undone.
            </p>
            <div className="your-rides-confirm-actions">
              <button
                type="button"
                className="your-rides-confirm-cancel"
                disabled={!!busyId}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="your-rides-confirm-delete"
                disabled={busyId === deleteTarget.id}
                onClick={() => void deleteRide(deleteTarget)}
              >
                {busyId === deleteTarget.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function YourRidesPage() {
  return (
    <ProfileLayout title="Your rides">
      {() => <YourRidesBody />}
    </ProfileLayout>
  );
}
