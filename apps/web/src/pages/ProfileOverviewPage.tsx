import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  addFavorite,
  listFavorites,
  removeFavorite,
} from '../api/favorites';
import { listHostListings } from '../api/hostListings';
import {
  listingPhotoUrl,
  type ListingDetail,
} from '../api/listings';
import type { MeUser } from '../api/users';
import ProfileLayout from '../components/ProfileLayout';
import type { OverviewStats } from '../components/ProfileSidebar';

function Stars({ n }: { n: number }) {
  const filled = Math.round(n);
  return (
    <span className="overview-stars" aria-label={`${n} stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i}>{i <= filled ? '★' : '☆'}</span>
      ))}
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

function OverviewBody({
  me,
  onStats,
}: {
  me: MeUser;
  onStats: (stats: OverviewStats) => void;
}) {
  const [rides, setRides] = useState<ListingDetail[]>([]);
  const [ridesLoading, setRidesLoading] = useState(true);
  const [guestTab, setGuestTab] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favBusyId, setFavBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRidesLoading(true);
      try {
        const [list, favs] = await Promise.all([
          listHostListings(),
          listFavorites().catch(() => [] as ListingDetail[]),
        ]);
        if (!cancelled) {
          setRides(list);
          setFavoriteIds(new Set(favs.map((f) => String(f.id))));
        }
      } catch {
        if (!cancelled) setRides([]);
      } finally {
        if (!cancelled) setRidesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const guestReviews = useMemo(() => {
    const all = rides.flatMap((r) =>
      (r.guestReviews ?? []).map((rev) => ({
        ...rev,
        listingTitle: r.title,
      })),
    );
    return all.sort(
      (a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0),
    );
  }, [rides]);

  const hostReviews = useMemo(() => {
    return [] as typeof guestReviews;
  }, []);

  useEffect(() => {
    const rated = rides.filter(
      (r) => typeof r.hostRating === 'number' && r.hostRating > 0,
    );
    const avg =
      rated.length > 0
        ? rated.reduce((s, r) => s + (r.hostRating ?? 0), 0) / rated.length
        : 0;
    onStats({
      rides: rides.length,
      rating: avg,
      reviews: guestReviews.length,
    });
  }, [rides, guestReviews, onStats]);

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
    } catch {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(id);
        else next.delete(id);
        return next;
      });
    } finally {
      setFavBusyId(null);
    }
  };

  const activeReviews = guestTab ? guestReviews : hostReviews;

  return (
    <div className="profile-overview">
      <div className="profile-top">
        <h1 className="profile-title profile-title--bold">Profile Overview</h1>
        <Link to="/profile/edit" className="profile-top-link">
          <img src="/return-arrow.png" alt="" className="profile-back-arrow" />
          Go back
        </Link>
      </div>

      <section className="overview-about">
        <h2 className="profile-section-title">About</h2>
        <p className="overview-about-text">
          {me.aboutBio?.trim() ||
            'No about text yet. Add one from Edit profile so hosts and guests can get to know you.'}
        </p>
      </section>

      <section className="overview-rides">
        <h2 className="profile-section-title">Rides</h2>
        {ridesLoading ? (
          <p className="profile-status">Loading rides…</p>
        ) : rides.length === 0 ? (
          <p className="profile-status">You haven’t listed any rides yet.</p>
        ) : (
          <div className="overview-cars">
            {rides.slice(0, 4).map((ride) => {
              const photo = listingPhotoUrl(ride);
              const isFav = favoriteIds.has(String(ride.id));
              return (
                <article key={ride.id} className="overview-car">
                  <div className="overview-car-image-wrap">
                    <Link
                      to={`/find-your-car/${ride.id}`}
                      className="overview-car-image-link"
                    >
                      {photo ? (
                        <img
                          src={photo}
                          alt=""
                          className="overview-car-image"
                        />
                      ) : (
                        <div className="overview-car-image overview-car-image--empty" />
                      )}
                    </Link>
                    <button
                      type="button"
                      className={`fyc-fav${isFav ? ' fyc-fav--on' : ''}`}
                      aria-label={
                        isFav
                          ? 'Remove from favourites'
                          : 'Add to favourites'
                      }
                      aria-pressed={isFav}
                      disabled={favBusyId === String(ride.id)}
                      onClick={() => void toggleFavorite(ride)}
                    >
                      <HeartIcon filled={isFav} />
                    </button>
                  </div>
                  <Link
                    to={`/find-your-car/${ride.id}`}
                    className="overview-car-body"
                  >
                    <div className="overview-car-row">
                      <div className="overview-car-left">
                        <span className="overview-car-name">{ride.title}</span>
                        {ride.vehicleType ? (
                          <span className="overview-car-type">
                            {ride.vehicleType}
                          </span>
                        ) : null}
                      </div>
                      <div className="overview-car-right">
                        <span className="overview-car-price">
                          ${Math.round(ride.pricePerDay)}
                        </span>
                        <span className="overview-car-cad">CAD</span>
                      </div>
                    </div>
                    <div className="overview-car-meta">
                      <Stars n={ride.hostRating ?? 0} />
                      <span className="overview-trips">
                        {ride.hostTrips ?? 0} trips
                      </span>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="overview-review-count">
        {guestReviews.length + hostReviews.length} reviews
      </p>
      <div className="overview-review-tabs">
        <button
          type="button"
          className={guestTab ? 'is-active' : ''}
          onClick={() => setGuestTab(true)}
        >
          From guests ({guestReviews.length})
        </button>
        <button
          type="button"
          className={!guestTab ? 'is-active' : ''}
          onClick={() => setGuestTab(false)}
        >
          From hosts ({hostReviews.length})
        </button>
      </div>

      <div className="overview-reviews">
        {activeReviews.length ? (
          activeReviews.map((rev) => (
            <article
              key={`${rev.bookingId}-${rev.submittedAt}`}
              className="overview-review"
            >
              <span className="overview-review-date">
                {rev.submittedAt
                  ? new Date(rev.submittedAt).toLocaleString('en-CA', {
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Recent'}
              </span>
              <p className="overview-review-text">{rev.publicText}</p>
              <div className="overview-review-user">
                <img src={rev.guestPhotoUri || '/no-avatar.jpg'} alt="" />
                <div>
                  <span className="overview-review-name">
                    {rev.guestName || 'Guest'}
                  </span>
                  <span className="overview-review-joined">
                    {rev.listingTitle}
                  </span>
                </div>
              </div>
            </article>
          ))
        ) : (
          <p className="profile-status">
            {guestTab ? 'No guest reviews yet.' : 'No host reviews yet.'}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ProfileOverviewPage() {
  const [stats, setStats] = useState<OverviewStats>({
    rides: 0,
    rating: 0,
    reviews: 0,
  });

  return (
    <ProfileLayout
      title="Profile overview"
      overviewSidebar
      overviewStats={stats}
    >
      {(me) => <OverviewBody me={me} onStats={setStats} />}
    </ProfileLayout>
  );
}
