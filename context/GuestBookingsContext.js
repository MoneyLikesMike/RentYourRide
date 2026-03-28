import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@ryr_guest_bookings_v1';

const GuestBookingsContext = createContext(null);

function makeId() {
  return `gb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function GuestBookingsProvider({ children }) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeRentals, setActiveRentals] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  const persist = useCallback(async (pending, active) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ pendingRequests: pending, activeRentals: active }));
    } catch (_) {
      /* ignore */
    }
  }, []);

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
    persist(pendingRequests, activeRentals);
  }, [pendingRequests, activeRentals, hydrated, persist]);

  const addGuestBooking = useCallback((snapshot) => {
    const id = makeId();
    const entry = { id, createdAt: Date.now(), ...snapshot };
    if (snapshot.instantBooking === true) {
      setActiveRentals((prev) => [entry, ...prev]);
    } else {
      setPendingRequests((prev) => [entry, ...prev]);
    }
    return id;
  }, []);

  const cancelGuestBooking = useCallback((id) => {
    setPendingRequests((prev) => prev.filter((b) => b.id !== id));
    setActiveRentals((prev) => prev.filter((b) => b.id !== id));
  }, []);

  /** Move a pending request into active rentals (host accepted). */
  const acceptGuestBooking = useCallback((id) => {
    setPendingRequests((prev) => {
      const entry = prev.find((b) => b.id === id);
      if (!entry) return prev;
      setActiveRentals((ar) => [{ ...entry, acceptedAt: Date.now() }, ...ar]);
      return prev.filter((b) => b.id !== id);
    });
  }, []);

  const getBookingById = useCallback(
    (id) => {
      return pendingRequests.find((b) => b.id === id) || activeRentals.find((b) => b.id === id) || null;
    },
    [pendingRequests, activeRentals]
  );

  const updateGuestBooking = useCallback((id, patch) => {
    const map = (b) => (b.id === id ? { ...b, ...patch } : b);
    setPendingRequests((prev) => prev.map(map));
    setActiveRentals((prev) => prev.map(map));
  }, []);

  const value = useMemo(
    () => ({
      pendingRequests,
      activeRentals,
      addGuestBooking,
      cancelGuestBooking,
      acceptGuestBooking,
      updateGuestBooking,
      getBookingById,
    }),
    [
      pendingRequests,
      activeRentals,
      addGuestBooking,
      cancelGuestBooking,
      acceptGuestBooking,
      updateGuestBooking,
      getBookingById,
    ]
  );

  return <GuestBookingsContext.Provider value={value}>{children}</GuestBookingsContext.Provider>;
}

export function useGuestBookings() {
  const ctx = useContext(GuestBookingsContext);
  if (!ctx) throw new Error('useGuestBookings must be used within GuestBookingsProvider');
  return ctx;
}
