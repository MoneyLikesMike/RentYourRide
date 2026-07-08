import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getMe } from '../services/usersApi';
import { buildAccountSetupSteps } from '../utils/accountSetupSteps';

const EMPTY = buildAccountSetupSteps(null);

export function useAccountSetupSteps() {
  const { isAuthenticated, isReady } = useAuth();
  const [state, setState] = useState(EMPTY);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated || !isReady) {
        setState(EMPTY);
        return undefined;
      }
      let cancelled = false;
      (async () => {
        try {
          const me = await getMe();
          if (!cancelled) setState(buildAccountSetupSteps(me));
        } catch (_) {
          if (!cancelled) setState(EMPTY);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [isAuthenticated, isReady]),
  );

  return state;
}
