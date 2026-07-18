import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as listingsApi from '../services/listingsApi';
import { payoutsAccountStatus } from '../services/payoutsApi';
import { useAuth } from './AuthContext';
import { isRemoteListingId } from '../utils/listingId';
import { draftToListingBody } from '../utils/listingDraftPayload';
import { syncListingPhotos } from '../utils/listingPhotos';

const ListingsContext = createContext(null);

const STORAGE_LISTINGS_PREFIX = '@ryr_listings_v1';
const STORAGE_PAYOUT_PREFIX = '@ryr_payout_setup_v1';
/** Legacy shared keys — cleared after migrating to per-user keys. */
const LEGACY_LISTINGS_KEY = '@ryr_listings_v1';
const LEGACY_PAYOUT_KEY = '@ryr_payout_setup_v1';

const initialDraft = {
  city: null,
  vehicleType: null,
  photos: [],
  instantBooking: false,
};

function listingsStorageKey(userId) {
  return userId ? `${STORAGE_LISTINGS_PREFIX}:${userId}` : `${STORAGE_LISTINGS_PREFIX}:anon`;
}

function payoutStorageKey(userId) {
  return userId ? `${STORAGE_PAYOUT_PREFIX}:${userId}` : `${STORAGE_PAYOUT_PREFIX}:anon`;
}

function serializeListings(list) {
  return JSON.stringify(list);
}

function deserializeListings(raw) {
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((l) => ({
      ...l,
      active: l.active !== false,
      // Default false — older caches omitted `owned` and were incorrectly treated as owned.
      owned: l.owned === true,
    }));
  } catch {
    return [];
  }
}

function listingOwnedByUser(listing, authUserId) {
  if (!listing) return false;
  if (authUserId && listing.hostUserId && String(listing.hostUserId) !== String(authUserId)) {
    return false;
  }
  if (listing.owned === true) return true;
  if (authUserId && listing.hostUserId && String(listing.hostUserId) === String(authUserId)) {
    return true;
  }
  return false;
}

export function ListingsProvider({ children }) {
  const { isAuthenticated, isReady, user } = useAuth();
  const authUserId = user?.id ?? null;
  const [listings, setListings] = useState([]);
  const [payoutSetupComplete, setPayoutSetupComplete] = useState(false);
  const [draft, setDraft] = useState(initialDraft);
  /** When set, user is editing an existing listing from Edit hub; section screens return here instead of continuing the list flow. */
  const [editingListingId, setEditingListingId] = useState(null);
  const hydratedRef = useRef(false);
  const hydratedUserIdRef = useRef(undefined);

  // Load/persist listings scoped to the signed-in user so accounts never share "My listings".
  useEffect(() => {
    if (!isReady) return undefined;
    let cancelled = false;
    const uid = authUserId;
    (async () => {
      hydratedRef.current = false;
      try {
        // Drop legacy shared cache so a previous account's owned flags can't leak.
        await AsyncStorage.multiRemove([LEGACY_LISTINGS_KEY, LEGACY_PAYOUT_KEY]).catch(() => {});
        if (!uid) {
          if (!cancelled) {
            setListings([]);
            setPayoutSetupComplete(false);
            setDraft(initialDraft);
            setEditingListingId(null);
            hydratedUserIdRef.current = null;
            hydratedRef.current = true;
          }
          return;
        }
        const [[, rawListings], [, rawPayout]] = await AsyncStorage.multiGet([
          listingsStorageKey(uid),
          payoutStorageKey(uid),
        ]);
        if (cancelled) return;
        const parsed = rawListings ? deserializeListings(rawListings) : [];
        // Never keep another host's listings as owned for this account.
        setListings(
          parsed.map((l) => ({
            ...l,
            owned: listingOwnedByUser({ ...l, owned: l.owned === true }, uid),
          })),
        );
        setPayoutSetupComplete(rawPayout === '1');
        setDraft(initialDraft);
        setEditingListingId(null);
        hydratedUserIdRef.current = uid;
      } catch {
        if (!cancelled) {
          setListings([]);
          hydratedUserIdRef.current = uid;
        }
      } finally {
        if (!cancelled) hydratedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, authUserId]);

  useEffect(() => {
    if (!hydratedRef.current || hydratedUserIdRef.current !== authUserId) return;
    if (!authUserId) return;
    (async () => {
      try {
        await AsyncStorage.setItem(listingsStorageKey(authUserId), serializeListings(listings));
      } catch {
        /* ignore */
      }
    })();
  }, [listings, authUserId]);

  useEffect(() => {
    if (!hydratedRef.current || hydratedUserIdRef.current !== authUserId) return;
    if (!authUserId) return;
    (async () => {
      try {
        await AsyncStorage.setItem(
          payoutStorageKey(authUserId),
          payoutSetupComplete ? '1' : '0',
        );
      } catch {
        /* ignore */
      }
    })();
  }, [payoutSetupComplete, authUserId]);

  const addListing = useCallback((listing) => {
    const id = `${Date.now()}`;
    const newListing = {
      ...listing,
      id,
      createdAt: new Date().toISOString(),
      city: listing.city || 'Winnipeg',
      title: listing.title || 'My vehicle',
      vehicleType: listing.vehicleType || 'SEDAN',
      photos: listing.photos || [],
      pricePerDay: listing.pricePerDay,
      trips: listing.trips ?? 0,
      rating: listing.rating ?? 4,
      owned: true,
      active: listing.active !== false,
    };
    setListings((prev) => [newListing, ...prev]);
    return id;
  }, []);

  const updateListing = useCallback((id, updates) => {
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates, id: l.id } : l))
    );
  }, []);

  /** Upsert marketplace listings from GET /v1/listings/search (does not strip locally owned listings). */
  const mergeRemoteListings = useCallback(
    (incoming) => {
      if (!Array.isArray(incoming) || incoming.length === 0) return;
      setListings((prev) => {
        const map = new Map(prev.map((l) => [String(l.id), { ...l }]));
        for (const row of incoming) {
          if (row == null || row.id == null || row.id === '') continue;
          const id = String(row.id);
          const existing = map.get(id);
          const merged = {
            ...(existing || {}),
            ...row,
            id,
            active: row.active !== false,
          };
          const explicitOwned =
            row.owned === true ? true : row.owned === false ? false : existing?.owned === true;
          merged.owned = listingOwnedByUser({ ...merged, owned: explicitOwned }, authUserId);
          map.set(id, merged);
        }
        return [...map.values()];
      });
    },
    [authUserId],
  );

  const refreshMyListingsFromApi = useCallback(async () => {
    if (!isAuthenticated || !isReady || !authUserId) return;
    try {
      const rows = await listingsApi.hostListListings();
      const ownedRows = Array.isArray(rows) ? rows : [];
      const ownedIds = new Set(ownedRows.map((r) => String(r.id)));
      setListings((prev) => {
        const map = new Map(
          prev.map((l) => {
            const id = String(l.id);
            // Remote listings not returned by /host/listings are not mine.
            const owned = ownedIds.has(id)
              ? true
              : isRemoteListingId(id)
                ? false
                : l.owned === true;
            return [id, { ...l, owned }];
          }),
        );
        for (const row of ownedRows) {
          if (row?.id == null) continue;
          const id = String(row.id);
          map.set(id, {
            ...(map.get(id) || {}),
            ...row,
            id,
            owned: true,
            active: row.active !== false,
            hostUserId: row.hostUserId || authUserId,
          });
        }
        return [...map.values()];
      });
    } catch (e) {
      console.warn('[Listings] hostListListings failed', e?.message || e);
    }
  }, [isAuthenticated, isReady, authUserId]);

  const refreshPayoutStatusFromApi = useCallback(async () => {
    if (!isAuthenticated || !isReady) return;
    try {
      const status = await payoutsAccountStatus();
      if (status?.onboarded || status?.detailsSubmitted || status?.payoutsEnabled) {
        setPayoutSetupComplete(true);
      }
    } catch (e) {
      console.warn('[Listings] payout status failed', e?.message || e);
    }
  }, [isAuthenticated, isReady]);

  useEffect(() => {
    if (!isAuthenticated || !isReady) return;
    refreshMyListingsFromApi();
    refreshPayoutStatusFromApi();
  }, [isAuthenticated, isReady, refreshMyListingsFromApi, refreshPayoutStatusFromApi]);

  const removeListing = useCallback(
    async (id) => {
      if (isRemoteListingId(id) && isAuthenticated && isReady) {
        try {
          await listingsApi.hostDeleteListing(id);
        } catch (e) {
          console.warn('[Listings] hostDeleteListing failed', e?.message || e);
        }
      }
      setListings((prev) => prev.filter((l) => l.id !== id));
    },
    [isAuthenticated, isReady],
  );

  const setListingActive = useCallback(
    async (id, active) => {
      if (isRemoteListingId(id) && isAuthenticated && isReady) {
        try {
          let row = await listingsApi.hostPatchListing(id, { active: !!active });
          if (!active) {
            row = (await listingsApi.hostUnpublishListing(id)) || row;
          }
          if (row) {
            mergeRemoteListings([{ ...row, owned: true }]);
            return;
          }
        } catch (e) {
          console.warn('[Listings] setListingActive patch failed', e?.message || e);
        }
      }
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, active } : l)));
    },
    [isAuthenticated, isReady, mergeRemoteListings],
  );

  const getMyListings = useCallback(
    () => listings.filter((l) => l.owned === true),
    [listings],
  );

  const setDraftCity = useCallback((city) => {
    setDraft((prev) => ({ ...prev, city }));
  }, []);

  const setDraftListing = useCallback((updates) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearDraft = useCallback(() => {
    setDraft(initialDraft);
  }, []);

  const beginEditListing = useCallback((id) => {
    const listing = listings.find((l) => l.id === id);
    if (!listing) return false;
    setEditingListingId(id);
    setDraft({ ...initialDraft, ...listing });
    return true;
  }, [listings]);

  const clearEditListingSession = useCallback(() => {
    setEditingListingId(null);
    setDraft(initialDraft);
  }, []);

  const resolveRemoteListingId = useCallback(
    (currentDraft) => {
      if (editingListingId && isRemoteListingId(editingListingId)) return editingListingId;
      if (currentDraft?.serverListingId && isRemoteListingId(currentDraft.serverListingId)) {
        return currentDraft.serverListingId;
      }
      return null;
    },
    [editingListingId],
  );

  const ensureServerDraftListing = useCallback(async (draftSnapshot) => {
    const d = draftSnapshot ?? draft;
    const existingId = resolveRemoteListingId(d);
    if (existingId) return existingId;
    if (!isAuthenticated || !isReady) return null;
    try {
      const created = await listingsApi.hostCreateListing(draftToListingBody(d));
      const id = created?.id;
      if (id) {
        setDraft((prev) => ({ ...prev, serverListingId: id }));
        mergeRemoteListings([{ ...created, owned: true }]);
      }
      return id ?? null;
    } catch (e) {
      console.warn('[Listings] ensureServerDraftListing failed', e?.message || e);
      return null;
    }
  }, [draft, isAuthenticated, isReady, resolveRemoteListingId, mergeRemoteListings]);

  /** Persist wizard/edit draft section to API when authenticated. */
  const saveRemoteListingPatch = useCallback(
    async (patch, { uploadPhotos = false, syncAvailability = false } = {}) => {
      const nextDraft = { ...draft, ...patch };
      setDraft(nextDraft);
      if (!isAuthenticated || !isReady) return { ok: true, listingId: null };

      let listingId = resolveRemoteListingId(nextDraft);
      if (!listingId) {
        listingId = await ensureServerDraftListing(nextDraft);
        if (!listingId) return { ok: true, listingId: null };
      }

      try {
        if (uploadPhotos && patch.photos) {
          const uploaded = await syncListingPhotos(listingId, patch.photos);
          if (uploaded) {
            mergeRemoteListings([{ ...uploaded, owned: true }]);
            setDraft((prev) => ({ ...prev, photos: uploaded.photos ?? patch.photos }));
          }
        }
        const row = await listingsApi.hostPatchListing(listingId, draftToListingBody(nextDraft));
        if (row) mergeRemoteListings([{ ...row, owned: true }]);
        if (syncAvailability && Array.isArray(patch.availability)) {
          const savedRanges = await listingsApi.hostListingAvailability(listingId, patch.availability);
          if (savedRanges) {
            setDraft((prev) => ({ ...prev, availability: savedRanges }));
          }
        }
        return { ok: true, listingId };
      } catch (e) {
        throw e;
      }
    },
    [
      draft,
      isAuthenticated,
      isReady,
      resolveRemoteListingId,
      ensureServerDraftListing,
      mergeRemoteListings,
    ],
  );

  const saveEditedListingFromDraft = useCallback(async () => {
    if (!editingListingId) return false;
    const updates = draftToListingBody(draft);
    // Edit hub Save should keep active listings on the marketplace (legacy did not
    // clear verification on update). Also recovers listings unpublished by the old
    // draftToListingBody `published: false` bug.
    const keepPublished = draft.active !== false;
    if (isRemoteListingId(editingListingId)) {
      try {
        if (draft.photos?.length) {
          await syncListingPhotos(editingListingId, draft.photos);
        }
        let row = await listingsApi.hostPatchListing(editingListingId, updates);
        if (keepPublished) {
          try {
            const published = await listingsApi.hostPublishListing(editingListingId);
            if (published) row = published;
          } catch (pubErr) {
            console.warn('[Listings] hostPublishListing after edit failed', pubErr?.message || pubErr);
          }
        }
        if (row) mergeRemoteListings([{ ...row, owned: true }]);
        if (Array.isArray(draft.availability) && draft.availability.length > 0) {
          await listingsApi.hostListingAvailability(editingListingId, draft.availability);
        }
      } catch (e) {
        console.warn('[Listings] hostPatchListing failed', e?.message || e);
        updateListing(editingListingId, { ...draft });
      }
    } else {
      updateListing(editingListingId, { ...draft });
    }
    setEditingListingId(null);
    setDraft(initialDraft);
    return true;
  }, [editingListingId, draft, updateListing, mergeRemoteListings]);

  const getListingsByCity = useCallback(
    (city) => {
      if (!city || typeof city !== 'string') return [];
      const normalized = city.trim().toLowerCase();
      return listings.filter(
        (l) =>
          l.active !== false &&
          l.city &&
          l.city.trim().toLowerCase() === normalized &&
          (l.owned === true || l.published !== false),
      );
    },
    [listings]
  );

  /** True once user has any owned listing or has finished Get Paid — show Listings hub & allow List ride without Get Paid. */
  const canUseListingsHub = useMemo(() => {
    const hasOwnedListing = listings.some((l) => l.owned === true);
    return hasOwnedListing || payoutSetupComplete;
  }, [listings, payoutSetupComplete]);

  const value = {
    listings,
    payoutSetupComplete,
    setPayoutSetupComplete,
    canUseListingsHub,
    draft,
    editingListingId,
    addListing,
    updateListing,
    removeListing,
    setListingActive,
    getMyListings,
    setDraftCity,
    setDraftListing,
    clearDraft,
    beginEditListing,
    clearEditListingSession,
    saveEditedListingFromDraft,
    getListingsByCity,
    mergeRemoteListings,
    refreshMyListingsFromApi,
    ensureServerDraftListing,
    saveRemoteListingPatch,
  };

  return (
    <ListingsContext.Provider value={value}>
      {children}
    </ListingsContext.Provider>
  );
}

export function useListings() {
  const ctx = useContext(ListingsContext);
  if (!ctx) throw new Error('useListings must be used within ListingsProvider');
  return ctx;
}
