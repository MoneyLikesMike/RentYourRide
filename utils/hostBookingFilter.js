/** Shared guest/host booking tab filters for Rental Manager screens. */

export function normalizeHostKey(name) {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Bookings where the signed-in user is the guest. */
export function filterBookingsForGuest(bookings, authUserId) {
  return (bookings || []).filter((b) => {
    if (!authUserId) return true;
    // Never show a trip you host on the GUEST tab.
    if (b.hostUserId && String(b.hostUserId) === String(authUserId)) {
      return false;
    }
    if (b.guestUserId) {
      return String(b.guestUserId) === String(authUserId);
    }
    // Legacy rows without guestUserId — keep only if we are not the host.
    return true;
  });
}

/** Bookings where the signed-in user is the host. */
export function filterBookingsForHost(bookings, listings, firstName, lastName, authUserId) {
  const profileName = normalizeHostKey([firstName, lastName].filter(Boolean).join(' '));
  // Only listings explicitly marked owned — marketplace browse rows must not count.
  const ownedListingIds = new Set(
    (listings || []).filter((l) => l.owned === true).map((l) => String(l.id)),
  );

  return (bookings || []).filter((b) => {
    // Never show the current user's guest trip on the HOST tab.
    if (authUserId && b.guestUserId && String(b.guestUserId) === String(authUserId)) {
      return false;
    }
    if (authUserId && b.hostUserId) {
      return String(b.hostUserId) === String(authUserId);
    }
    // Offline / legacy rows without hostUserId.
    const snapId = b.listingSnapshot?.id;
    if (snapId != null && snapId !== '' && ownedListingIds.has(String(snapId))) {
      return true;
    }
    const hostOnListing = normalizeHostKey(b.listingSnapshot?.hostName);
    return !!profileName && hostOnListing === profileName;
  });
}
