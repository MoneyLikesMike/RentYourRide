import type { GuestListingReview, ListingSummary } from '../api/listings';

type ListingForRating = Pick<ListingSummary, 'hostTrips' | 'hostRating'> & {
  guestReviews?: GuestListingReview[] | unknown[] | null;
  trips?: number;
};

export function getListingTripCount(listing: ListingForRating): number {
  const trips = Number(listing.hostTrips ?? listing.trips ?? 0);
  return Number.isFinite(trips) && trips > 0 ? Math.floor(trips) : 0;
}

export function getListingReviewCount(listing: ListingForRating): number {
  const reviews = Array.isArray(listing.guestReviews) ? listing.guestReviews : [];
  return reviews.length;
}

export function listingHasGuestReviews(listing: ListingForRating): boolean {
  return getListingReviewCount(listing) > 0;
}

/**
 * Display rating only from real guest reviews.
 * Returns null when review_count === 0 — never fall back to DB default 5.0.
 */
export function getListingDisplayRating(
  listing: ListingForRating,
): number | null {
  const reviews = Array.isArray(listing.guestReviews) ? listing.guestReviews : [];
  if (reviews.length === 0) return null;
  const scores = reviews
    .map((r) => Number((r as { rating?: unknown }).rating))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

export function isNewHostListing(listing: ListingForRating): boolean {
  return getListingTripCount(listing) === 0;
}

/** Card / detail copy when there are no reviews yet. */
export function formatNoReviewsLabel(listing: ListingForRating): string {
  if (isNewHostListing(listing)) return 'New · No reviews yet';
  return 'No reviews yet';
}

export function formatListingTripLabel(listing: ListingForRating): string {
  const trips = getListingTripCount(listing);
  if (trips === 1) return '1 trip';
  if (trips > 1) return `${trips} trips`;
  return 'No trips yet';
}
