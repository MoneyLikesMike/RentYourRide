import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import * as paymentsApi from '../services/paymentsApi';

const STORAGE_KEY = '@ryr_payment_methods_v1';

const PaymentMethodsContext = createContext(null);

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function isStripePaymentMethodId(id) {
  return typeof id === 'string' && id.startsWith('pm_');
}

export function PaymentMethodsProvider({ children }) {
  const { isAuthenticated, isReady } = useAuth();
  const [state, setState] = useState({ methods: [], defaultMethodId: null });
  const [hydrated, setHydrated] = useState(false);

  const persist = useCallback(async (nextMethods, nextDefault) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ methods: nextMethods, defaultMethodId: nextDefault })
      );
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
  }, []);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !isReady) return;
    let cancelled = false;
    (async () => {
      try {
        const remote = await paymentsApi.listPaymentMethods();
        if (cancelled || !Array.isArray(remote) || remote.length === 0) return;
        const mapped = remote.map((m) => ({
          id: m.id,
          type: 'card',
          brand: m.brand || 'card',
          last4: m.last4 || '0000',
        }));
        setState({
          methods: mapped,
          defaultMethodId: mapped[0]?.id ?? null,
        });
        persist(mapped, mapped[0]?.id ?? null);
      } catch (_) {
        /* keep AsyncStorage snapshot */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, isAuthenticated, isReady, persist]);

  const refreshFromApi = useCallback(async () => {
    if (!isAuthenticated || !isReady) return;
    try {
      const remote = await paymentsApi.listPaymentMethods();
      if (!Array.isArray(remote) || remote.length === 0) return;
      const mapped = remote.map((m) => ({
        id: m.id,
        type: 'card',
        brand: m.brand || 'card',
        last4: m.last4 || '0000',
      }));
      setState({
        methods: mapped,
        defaultMethodId: mapped[0]?.id ?? null,
      });
      persist(mapped, mapped[0]?.id ?? null);
    } catch (_) {
      /* keep local */
    }
  }, [isAuthenticated, isReady, persist]);

  const addPaymentMethod = useCallback(
    async (payload) => {
      if (payload?.paymentMethodId && isAuthenticated && isReady) {
        try {
          await paymentsApi.setDefaultPaymentMethod(payload.paymentMethodId);
          await refreshFromApi();
          return payload.paymentMethodId;
        } catch (_) {
          /* fall through to local */
        }
      }
      const id = makeId();
      const entry = { id, ...payload };
      setState((s) => {
        const next = [...s.methods, entry];
        const nextDefault = s.methods.length === 0 ? id : s.defaultMethodId;
        persist(next, nextDefault);
        return { methods: next, defaultMethodId: nextDefault };
      });
      return id;
    },
    [isAuthenticated, isReady, persist, refreshFromApi],
  );

  const updatePaymentMethod = useCallback(
    (id, partial) => {
      setState((s) => {
        const next = s.methods.map((m) => (m.id === id ? { ...m, ...partial } : m));
        persist(next, s.defaultMethodId);
        return { ...s, methods: next };
      });
    },
    [persist]
  );

  const removePaymentMethod = useCallback(
    (id) => {
      setState((s) => {
        const next = s.methods.filter((m) => m.id !== id);
        let nextDefault = s.defaultMethodId;
        if (s.defaultMethodId === id) {
          nextDefault = next[0]?.id ?? null;
        }
        persist(next, nextDefault);
        return { methods: next, defaultMethodId: nextDefault };
      });
    },
    [persist]
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
        persist(s.methods, id);
        return { ...s, defaultMethodId: id };
      });
    },
    [isAuthenticated, isReady, persist, refreshFromApi],
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
    ]
  );

  return <PaymentMethodsContext.Provider value={value}>{children}</PaymentMethodsContext.Provider>;
}

export function usePaymentMethods() {
  const ctx = useContext(PaymentMethodsContext);
  if (!ctx) throw new Error('usePaymentMethods must be used within PaymentMethodsProvider');
  return ctx;
}
