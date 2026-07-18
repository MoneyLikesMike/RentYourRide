import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listHostListings } from '../api/hostListings';
import {
  listingPhotoUrl,
  type ListingDetail,
} from '../api/listings';
import type { MeUser } from '../api/users';
import ProfileLayout from '../components/ProfileLayout';

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

function OverviewBody({ me }: { me: MeUser }) {
  const [rides, setRides] = useState<ListingDetail[]>([]);
  const [ridesLoading, setRidesLoading] = useState(true);
  const [guestTab, setGuestTab] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRidesLoading(true);
      try {
        const list = await listHostListings();
        if (!cancelled) setRides(list);
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
          <p className="profile-status">
            You haven’t listed any rides yet.
          </p>
        ) : (
          <div className="overview-cars">
            {rides.slice(0, 4).map((ride) => {
              const photo = listingPhotoUrl(ride);
              return (
                <Link
                  key={ride.id}
                  to={`/find-your-car/${ride.id}`}
                  className="overview-car"
                >
                  <div className="overview-car-image-wrap">
                    {photo ? (
                      <img src={photo} alt="" className="overview-car-image" />
                    ) : (
                      <div className="overview-car-image overview-car-image--empty" />
                    )}
                  </div>
                  <div className="overview-car-row">
                    <div>
                      <span className="overview-car-name">{ride.title}</span>
                      {ride.vehicleType ? (
                        <span className="overview-car-type">
                          {ride.vehicleType}
                        </span>
                      ) : null}
                    </div>
                    <div>
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
              );
            })}
          </div>
        )}
      </section>

      <p className="overview-review-count">
        {guestReviews.length} review{guestReviews.length === 1 ? '' : 's'}
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
          From hosts (0)
        </button>
      </div>

      <div className="overview-reviews">
        {guestTab ? (
          guestReviews.length ? (
            guestReviews.map((rev) => (
              <article key={`${rev.bookingId}-${rev.submittedAt}`} className="overview-review">
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
                  <img
                    src={rev.guestPhotoUri || '/no-avatar.jpg'}
                    alt=""
                  />
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
            <p className="profile-status">No guest reviews yet.</p>
          )
        ) : (
          <p className="profile-status">No host reviews yet.</p>
        )}
      </div>
    </div>
  );
}

export default function ProfileOverviewPage() {
  return (
    <ProfileLayout overviewSidebar>
      {(me) => <OverviewBody me={me} />}
    </ProfileLayout>
  );
}
