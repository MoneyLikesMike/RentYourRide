import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@ryr_payment_methods_v1';

const PaymentMethodsContext = createContext(null);

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function PaymentMethodsProvider({ children }) {
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

  const addPaymentMethod = useCallback((payload) => {
    const id = makeId();
    const entry = { id, ...payload };
    setState((s) => {
      const next = [...s.methods, entry];
      const nextDefault = s.methods.length === 0 ? id : s.defaultMethodId;
      persist(next, nextDefault);
      return { methods: next, defaultMethodId: nextDefault };
    });
    return id;
  }, [persist]);

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
    (id) => {
      setState((s) => {
        persist(s.methods, id);
        return { ...s, defaultMethodId: id };
      });
    },
    [persist]
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
    }),
    [
      state.methods,
      state.defaultMethodId,
      hydrated,
      addPaymentMethod,
      updatePaymentMethod,
      removePaymentMethod,
      setDefaultPaymentMethod,
    ]
  );

  return <PaymentMethodsContext.Provider value={value}>{children}</PaymentMethodsContext.Provider>;
}

export function usePaymentMethods() {
  const ctx = useContext(PaymentMethodsContext);
  if (!ctx) throw new Error('usePaymentMethods must be used within PaymentMethodsProvider');
  return ctx;
}
