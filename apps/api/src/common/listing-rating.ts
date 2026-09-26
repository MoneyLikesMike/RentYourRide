/**
 * Honest listing ratings: never invent a 5.0 default when there are no
 * guest reviews. DB column `host_rating` historically defaults to 5.
 */

type ReviewLike = { rating?: unknown };

export function guestReviewCount(
  guestReviews: unknown[] | null | undefined,
): number {
  return Array.isArray(guestReviews) ? guestReviews.length : 0;
}

/** Average of guest review ratings, or 0 when there are no reviews. */
export function honestHostRating(
  guestReviews: unknown[] | null | undefined,
): number {
  const reviews = Array.isArray(guestReviews) ? guestReviews : [];
  if (reviews.length === 0) return 0;
  const scores = reviews
    .map((r) => Number((r as ReviewLike)?.rating))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (scores.length === 0) return 0;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
}
