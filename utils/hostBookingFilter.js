/** Host sees bookings where the listing is owned (id) or hostName matches profile. */

export function normalizeHostKey(name) {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function filterBookingsForHost(bookings, listings, firstName, lastName) {
  const profileName = normalizeHostKey([firstName, lastName].filter(Boolean).join(' '));
  const ownedListingIds = new Set((listings || []).map((l) => String(l.id)));

  return (bookings || []).filter((b) => {
    const snapId = b.listingSnapshot?.id;
    if (snapId != null && snapId !== '' && ownedListingIds.has(String(snapId))) {
      return true;
    }
    const hostOnListing = normalizeHostKey(b.listingSnapshot?.hostName);
    return !!profileName && hostOnListing === profileName;
  });
}
