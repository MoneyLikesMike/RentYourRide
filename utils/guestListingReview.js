/**
 * Guest reviews stored on listings (see GuestHostReviewScreen submit).
 * @typedef {{ bookingId: string, rating: number, publicText: string, badgeKeys: string[], guestName: string, guestPhotoUri?: string | null, guestJoinedYear?: number | null, submittedAt: number, vehicleTitle?: string }} GuestListingReview
 */

export function averageRatingFromReviews(reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) return null;
  const sum = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}
