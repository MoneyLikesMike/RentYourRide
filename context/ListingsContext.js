import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const removeListing = useCallback((id) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const setListingActive = useCallback((id, active) => {
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, active } : l)));
  }, []);

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

  const saveEditedListingFromDraft = useCallback(() => {
    if (!editingListingId) return false;
    const { id: _draftId, createdAt: _ca, ...raw } = draft;
    const updates = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== undefined)
    );
    updateListing(editingListingId, updates);
    setEditingListingId(null);
    setDraft(initialDraft);
    return true;
  }, [editingListingId, draft, updateListing]);

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
