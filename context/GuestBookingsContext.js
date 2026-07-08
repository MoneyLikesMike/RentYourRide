import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import * as bookingsApi from '../services/bookingsApi';
import { isRemoteBookingId } from '../utils/bookingId';
import { syncBookingPatchToApi as runBookingLifecycleSync } from '../utils/bookingLifecycleSync';

const STORAGE_KEY = '@ryr_guest_bookings_v1';

const GuestBookingsContext = createContext(null);

function makeLocalId() {
  return `gb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const ACTIVE_STATUSES = new Set([
  'confirmed',
  'checkin_pending',
  'active',
  'checkout_pending',
]);

export function GuestBookingsProvider({ children }) {
  const { isAuthenticated, isReady } = useAuth();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeRentals, setActiveRentals] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  const persist = useCallback(async (pending, active) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ pendingRequests: pending, activeRentals: active }),
      );
    } catch (_) {
      /* ignore */
    }
  }, []);

  const refreshFromApi = useCallback(async () => {
    if (!isAuthenticated || !isReady) return;
    try {
      const [guestRows, hostRows] = await Promise.all([
        bookingsApi.listBookings('guest'),
        bookingsApi.listBookings('host'),
      ]);
      const map = new Map();
      for (const b of [...(guestRows || []), ...(hostRows || [])]) {
        if (!b?.id) continue;
        const created =
          typeof b.createdAt === 'number'
            ? b.createdAt
            : new Date(b.createdAt || Date.now()).getTime();
        map.set(String(b.id), { ...b, createdAt: created });
      }
      const all = [...map.values()];
      const pending = all.filter((b) => b.status === 'pending_host');
      const active = all.filter((b) => ACTIVE_STATUSES.has(b.status));
      setPendingRequests(pending);
      setActiveRentals(active);
      await persist(pending, active);
    } catch (e) {
      console.warn('[GuestBookings] refresh failed', e?.message || e);
    }
  }, [isAuthenticated, isReady, persist]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled || !raw) return;
        const p = JSON.parse(raw);
        if (Array.isArray(p.pendingRequests)) setPendingRequests(p.pendingRequests);
        if (Array.isArray(p.activeRentals)) setActiveRentals(p.activeRentals);
      } catch (_) {
        /* ignore */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (isAuthenticated && isReady) {
      refreshFromApi();
    }
  }, [hydrated, isAuthenticated, isReady, refreshFromApi]);

  useEffect(() => {
    if (!hydrated) return;
    persist(pendingRequests, activeRentals);
  }, [pendingRequests, activeRentals, hydrated, persist]);

  const addGuestBooking = useCallback(
    async (snapshot) => {
      if (isAuthenticated && isReady) {
        const idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        try {
          const row = await bookingsApi.createBooking(
            {
              listingSnapshot: snapshot.listingSnapshot,
              bookingDates: snapshot.bookingDates,
              pickupAddress: snapshot.pickupAddress,
              dropoffAddress: snapshot.dropoffAddress,
              deliveryEnabled: snapshot.deliveryEnabled,
              extras: snapshot.extras,
              introMessage: snapshot.introMessage,
              pricing: snapshot.pricing,
              selectedPaymentMethod: snapshot.selectedPaymentMethod,
              stripePaymentIntentId: snapshot.stripePaymentIntentId,
              instantBooking: snapshot.instantBooking,
              guestName: snapshot.guestName,
            },
            idempotencyKey,
          );
          await refreshFromApi();
          return row.id;
        } catch (e) {
          console.warn('[GuestBookings] createBooking failed', e?.message || e);
        }
      }

      const id = makeLocalId();
      const entry = { id, createdAt: Date.now(), ...snapshot };
      if (snapshot.instantBooking === true) {
        setActiveRentals((prev) => [entry, ...prev]);
      } else {
        setPendingRequests((prev) => [entry, ...prev]);
      }
      return id;
    },
    [isAuthenticated, isReady, refreshFromApi],
  );

  const cancelGuestBooking = useCallback(
    async (id) => {
      if (isRemoteBookingId(id)) {
        try {
          await bookingsApi.cancelBooking(id);
          await refreshFromApi();
          return;
        } catch (e) {
          console.warn('[GuestBookings] cancel failed', e?.message || e);
        }
      }
      setPendingRequests((prev) => prev.filter((b) => b.id !== id));
      setActiveRentals((prev) => prev.filter((b) => b.id !== id));
    },
    [refreshFromApi],
  );

  const declineGuestBooking = useCallback(
    async (id) => {
      if (isRemoteBookingId(id)) {
        try {
          await bookingsApi.declineBooking(id);
          await refreshFromApi();
          return;
        } catch (e) {
          console.warn('[GuestBookings] decline failed', e?.message || e);
        }
      }
      setPendingRequests((prev) => prev.filter((b) => b.id !== id));
    },
    [refreshFromApi],
  );

  const acceptGuestBooking = useCallback(
    async (id) => {
      if (isRemoteBookingId(id)) {
        try {
          await bookingsApi.acceptBooking(id);
          await refreshFromApi();
          return;
        } catch (e) {
          console.warn('[GuestBookings] accept failed', e?.message || e);
        }
      }
      setPendingRequests((prev) => {
        const entry = prev.find((b) => b.id === id);
        if (!entry) return prev;
        setActiveRentals((ar) => [{ ...entry, acceptedAt: Date.now() }, ...ar]);
        return prev.filter((b) => b.id !== id);
      });
    },
    [refreshFromApi],
  );

  const getBookingById = useCallback(
    (id) => {
      return pendingRequests.find((b) => b.id === id) || activeRentals.find((b) => b.id === id) || null;
    },
    [pendingRequests, activeRentals],
  );

  const syncBookingPatchToApi = useCallback(
    async (id, patch) => {
      await runBookingLifecycleSync(id, patch, {
        isAuthenticated,
        isReady,
        refreshFromApi,
      });
    },
    [isAuthenticated, isReady, refreshFromApi],
  );

  const updateGuestBooking = useCallback(
    async (id, patch) => {
      if (isRemoteBookingId(id) && isAuthenticated && isReady) {
        await syncBookingPatchToApi(id, patch);
      }
      const map = (b) => (b.id === id ? { ...b, ...patch } : b);
      setPendingRequests((prev) => prev.map(map));
      setActiveRentals((prev) => prev.map(map));
    },
    [isAuthenticated, isReady, syncBookingPatchToApi],
  );

  const value = useMemo(
    () => ({
      pendingRequests,
      activeRentals,
      addGuestBooking,
      cancelGuestBooking,
      declineGuestBooking,
      acceptGuestBooking,
      updateGuestBooking,
      getBookingById,
      refreshBookingsFromApi: refreshFromApi,
    }),
    [
      pendingRequests,
      activeRentals,
      addGuestBooking,
      cancelGuestBooking,
      declineGuestBooking,
      acceptGuestBooking,
      updateGuestBooking,
      getBookingById,
      refreshFromApi,
    ],
  );

  return (
    <GuestBookingsContext.Provider value={value}>{children}</GuestBookingsContext.Provider>
  );
}

export function useGuestBookings() {
  const ctx = useContext(GuestBookingsContext);
  if (!ctx) throw new Error('useGuestBookings must be used within GuestBookingsProvider');
  return ctx;
}
