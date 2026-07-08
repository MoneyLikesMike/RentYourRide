import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as listingsApi from '../services/listingsApi';
import { payoutsAccountStatus } from '../services/payoutsApi';
import { useAuth } from './AuthContext';
import { isRemoteListingId } from '../utils/listingId';
import { draftToListingBody } from '../utils/listingDraftPayload';
import { syncListingPhotos } from '../utils/listingPhotos';

const ListingsContext = createContext(null);

const STORAGE_LISTINGS_KEY = '@ryr_listings_v1';
const STORAGE_PAYOUT_KEY = '@ryr_payout_setup_v1';

const initialDraft = {
  city: null,
  vehicleType: null,
  photos: [],
  instantBooking: false,
};

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
      owned: l.owned !== false,
    }));
  } catch {
    return [];
  }
}

export function ListingsProvider({ children }) {
  const { isAuthenticated, isReady } = useAuth();
  const [listings, setListings] = useState([]);
  const [payoutSetupComplete, setPayoutSetupComplete] = useState(false);
  const [draft, setDraft] = useState(initialDraft);
  /** When set, user is editing an existing listing from Edit hub; section screens return here instead of continuing the list flow. */
  const [editingListingId, setEditingListingId] = useState(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [[, rawListings], [, rawPayout]] = await AsyncStorage.multiGet([
          STORAGE_LISTINGS_KEY,
          STORAGE_PAYOUT_KEY,
        ]);
        if (cancelled) return;
        if (rawListings) {
          const parsed = deserializeListings(rawListings);
          setListings(parsed);
        }
        if (rawPayout === '1') {
          setPayoutSetupComplete(true);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) hydratedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_LISTINGS_KEY, serializeListings(listings));
      } catch {
        /* ignore */
      }
    })();
  }, [listings]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_PAYOUT_KEY, payoutSetupComplete ? '1' : '0');
      } catch {
        /* ignore */
      }
    })();
  }, [payoutSetupComplete]);

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
  const mergeRemoteListings = useCallback((incoming) => {
    if (!Array.isArray(incoming) || incoming.length === 0) return;
    setListings((prev) => {
      const map = new Map(prev.map((l) => [String(l.id), { ...l }]));
      for (const row of incoming) {
        if (row == null || row.id == null || row.id === '') continue;
        const id = String(row.id);
        const existing = map.get(id);
        map.set(id, {
          ...(existing || {}),
          ...row,
          id,
          owned: row.owned === true || existing?.owned === true,
          active: row.active !== false,
        });
      }
      return [...map.values()];
    });
  }, []);

  const refreshMyListingsFromApi = useCallback(async () => {
    if (!isAuthenticated || !isReady) return;
    try {
      const rows = await listingsApi.hostListListings();
      if (Array.isArray(rows)) {
        mergeRemoteListings(rows.map((r) => ({ ...r, owned: true })));
      }
    } catch (e) {
      console.warn('[Listings] hostListListings failed', e?.message || e);
    }
  }, [isAuthenticated, isReady, mergeRemoteListings]);

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
          const patch = active ? { active: true } : { active: false, published: false };
          const row = await listingsApi.hostPatchListing(id, patch);
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

  const getMyListings = useCallback(() => listings.filter((l) => l.owned !== false), [listings]);

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
    if (isRemoteListingId(editingListingId)) {
      try {
        if (draft.photos?.length) {
          await syncListingPhotos(editingListingId, draft.photos);
        }
        const row = await listingsApi.hostPatchListing(editingListingId, updates);
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
          l.city.trim().toLowerCase() === normalized
      );
    },
    [listings]
  );

  /** True once user has any owned listing or has finished Get Paid — show Listings hub & allow List ride without Get Paid. */
  const canUseListingsHub = useMemo(() => {
    const hasOwnedListing = listings.some((l) => l.owned !== false);
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
