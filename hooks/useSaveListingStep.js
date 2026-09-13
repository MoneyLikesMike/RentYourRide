import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useListings } from '../context/ListingsContext';
import { useAuth } from '../context/AuthContext';

/**
 * Save a list-ride wizard step to draft + API (when signed in).
 */
export function useSaveListingStep() {
  const { isAuthenticated, isReady } = useAuth();
  const { saveRemoteListingPatch, setDraftListing } = useListings();
  const [saving, setSaving] = useState(false);

  const saveStep = useCallback(
    async (patch, options = {}) => {
      setSaving(true);
      try {
        if (isAuthenticated && isReady) {
          await saveRemoteListingPatch(patch, options);
        } else {
          setDraftListing(patch);
        }
        return true;
      } catch (e) {
        const status = Number(e?.status);
        const rawMessage = typeof e?.message === 'string' ? e.message : '';
        const normalized = rawMessage.toLowerCase();
        const duplicateVin =
          status === 409 ||
          (normalized.includes('vin') &&
            (normalized.includes('already') || normalized.includes('duplicate')));
        Alert.alert(
          'Could not save',
          duplicateVin
            ? 'This vehicle VIN is already listed. Use a different vehicle or contact support.'
            : rawMessage || 'Try again later.',
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [isAuthenticated, isReady, saveRemoteListingPatch, setDraftListing],
  );

  return { saveStep, saving };
}
