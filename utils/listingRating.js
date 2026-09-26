import { averageRatingFromReviews } from './guestListingReview';

export function getListingTripCount(listing) {
  const trips = Number(listing?.hostTrips ?? listing?.trips ?? 0);
  return Number.isFinite(trips) && trips > 0 ? Math.floor(trips) : 0;
}

export function getListingReviewCount(listing) {
  const reviews = Array.isArray(listing?.guestReviews) ? listing.guestReviews : [];
  return reviews.length;
}

/** Average star rating from guest reviews only — null when there are no reviews. */
export function getListingDisplayRating(listing) {
  const reviews = Array.isArray(listing?.guestReviews) ? listing.guestReviews : [];
  if (reviews.length === 0) return null;
  return averageRatingFromReviews(reviews);
}

export function listingHasGuestReviews(listing) {
  return getListingReviewCount(listing) > 0;
}

export function isNewHostListing(listing) {
  return getListingTripCount(listing) === 0;
}

export function formatNoReviewsLabel(listing) {
  if (isNewHostListing(listing)) return 'New · No reviews yet';
  return 'No reviews yet';
}

export function formatListingTripLabel(listing) {
  const trips = getListingTripCount(listing);
  if (trips === 1) return '1 trip';
  if (trips > 1) return `${trips} trips`;
  return 'No trips yet';
}
