import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import * as paymentsApi from '../services/paymentsApi';
import { STORAGE_PAYMENT_METHODS } from '../constants/storageKeys';

const LEGACY_STORAGE_KEY = '@ryr_payment_methods_v1';

const PaymentMethodsContext = createContext(null);

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function isStripePaymentMethodId(id) {
  return typeof id === 'string' && id.startsWith('pm_');
}

function storageKeyForUser(userId) {
  return userId ? `${STORAGE_PAYMENT_METHODS}:${userId}` : null;
}

function mapRemoteMethods(remote) {
  return (Array.isArray(remote) ? remote : []).map((m) => ({
    id: m.id,
    type: 'card',
    brand: m.brand || 'card',
    last4: m.last4 || '0000',
    isDefault: !!m.isDefault,
  }));
}

function defaultIdFromMapped(mapped) {
  const preferred = mapped.find((m) => m.isDefault);
  return preferred?.id ?? mapped[0]?.id ?? null;
}

export function PaymentMethodsProvider({ children }) {
  const { isAuthenticated, isReady, user } = useAuth();
  const userId = user?.id || null;
  const [state, setState] = useState({ methods: [], defaultMethodId: null });
  const [hydrated, setHydrated] = useState(false);

  const persist = useCallback(async (uid, nextMethods, nextDefault) => {
    const key = storageKeyForUser(uid);
    if (!key) return;
    try {
      await AsyncStorage.setItem(
        key,
        JSON.stringify({ methods: nextMethods, defaultMethodId: nextDefault }),
      );
    } catch (_) {
      /* ignore */
    }
  }, []);

  const clearState = useCallback(() => {
    setState({ methods: [], defaultMethodId: null });
  }, []);

  // Drop the old device-wide cache that leaked cards across accounts.
  useEffect(() => {
    AsyncStorage.removeItem(LEGACY_STORAGE_KEY).catch(() => {});
  }, []);

  // Reset + hydrate for the signed-in user only.
  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    clearState();

    if (!isReady) return undefined;
    if (!isAuthenticated || !userId) {
      setHydrated(true);
      return undefined;
    }

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKeyForUser(userId));
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.methods)) {
          setState({
            methods: parsed.methods,
            defaultMethodId:
              typeof parsed.defaultMethodId === 'string' ? parsed.defaultMethodId : null,
          });
        }
      } catch (_) {
        /* ignore */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isReady, isAuthenticated, userId, clearState]);

  // Always sync from Stripe for this user — empty list clears stale local cards.
  useEffect(() => {
    if (!hydrated || !isAuthenticated || !isReady || !userId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const remote = await paymentsApi.listPaymentMethods();
        if (cancelled || !Array.isArray(remote)) return;
        const mapped = mapRemoteMethods(remote);
        const nextDefault = defaultIdFromMapped(mapped);
        setState({ methods: mapped, defaultMethodId: nextDefault });
        await persist(userId, mapped, nextDefault);
      } catch (_) {
        /* keep per-user snapshot */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, isAuthenticated, isReady, userId, persist]);

  const refreshFromApi = useCallback(async () => {
    if (!isAuthenticated || !isReady || !userId) return;
    try {
      const remote = await paymentsApi.listPaymentMethods();
      if (!Array.isArray(remote)) return;
      const mapped = mapRemoteMethods(remote);
      const nextDefault = defaultIdFromMapped(mapped);
      setState({ methods: mapped, defaultMethodId: nextDefault });
      await persist(userId, mapped, nextDefault);
    } catch (_) {
      /* keep local */
    }
  }, [isAuthenticated, isReady, userId, persist]);

  const addPaymentMethod = useCallback(
    async (payload) => {
      if (payload?.paymentMethodId && isAuthenticated && isReady) {
        await paymentsApi.reportPaymentMethodAdded(payload.paymentMethodId);
        await paymentsApi.setDefaultPaymentMethod(payload.paymentMethodId);
        await refreshFromApi();
        return payload.paymentMethodId;
      }
      const id = makeId();
      const entry = { id, ...payload };
      setState((s) => {
        const next = [...s.methods, entry];
        const nextDefault = s.methods.length === 0 ? id : s.defaultMethodId;
        persist(userId, next, nextDefault);
        return { methods: next, defaultMethodId: nextDefault };
      });
      return id;
    },
    [isAuthenticated, isReady, persist, refreshFromApi, userId],
  );

  const updatePaymentMethod = useCallback(
    (id, partial) => {
      setState((s) => {
        const next = s.methods.map((m) => (m.id === id ? { ...m, ...partial } : m));
        persist(userId, next, s.defaultMethodId);
        return { ...s, methods: next };
      });
    },
    [persist, userId],
  );

  const removePaymentMethod = useCallback(
    async (id) => {
      if (isAuthenticated && isReady && isStripePaymentMethodId(id)) {
        try {
          await paymentsApi.detachPaymentMethod(id);
          await refreshFromApi();
          return;
        } catch (_) {
          /* fall through to local remove */
        }
      }
      setState((s) => {
        const next = s.methods.filter((m) => m.id !== id);
        let nextDefault = s.defaultMethodId;
        if (s.defaultMethodId === id) {
          nextDefault = next[0]?.id ?? null;
        }
        persist(userId, next, nextDefault);
        return { methods: next, defaultMethodId: nextDefault };
      });
    },
    [isAuthenticated, isReady, persist, refreshFromApi, userId],
  );

  const setDefaultPaymentMethod = useCallback(
    async (id) => {
      if (isAuthenticated && isReady && isStripePaymentMethodId(id)) {
        try {
          await paymentsApi.setDefaultPaymentMethod(id);
          await refreshFromApi();
          return;
        } catch (_) {
          /* keep local default */
        }
      }
      setState((s) => {
        persist(userId, s.methods, id);
        return { ...s, defaultMethodId: id };
      });
    },
    [isAuthenticated, isReady, persist, refreshFromApi, userId],
  );

  const value = useMemo(
    () => ({
      methods: state.methods,
      defaultMethodId: state.defaultMethodId,
      hydrated,
      addPaymentMethod,
      updatePaymentMethod,
      removePaymentMethod,
      setDefaultPaymentMethod,
      refreshFromApi,
    }),
    [
      state.methods,
      state.defaultMethodId,
      hydrated,
      addPaymentMethod,
      updatePaymentMethod,
      removePaymentMethod,
      setDefaultPaymentMethod,
      refreshFromApi,
    ],
  );

  return <PaymentMethodsContext.Provider value={value}>{children}</PaymentMethodsContext.Provider>;
}

export function usePaymentMethods() {
  const ctx = useContext(PaymentMethodsContext);
  if (!ctx) throw new Error('usePaymentMethods must be used within PaymentMethodsProvider');
  return ctx;
}
