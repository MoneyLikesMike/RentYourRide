import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
import { useAuth } from './AuthContext';
import * as favoritesApi from '../services/favoritesApi';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { isAuthenticated, isReady } = useAuth();
  const [favoritesById, setFavoritesById] = useState({});

  const refreshFromApi = useCallback(async () => {
    if (!isAuthenticated || !isReady) return;
    try {
      const rows = await favoritesApi.listFavorites();
      const next = {};
      for (const listing of rows || []) {
        if (listing?.id != null && listing.id !== '') next[String(listing.id)] = listing;
      }
      setFavoritesById(next);
    } catch (e) {
      console.warn('[Favorites] refresh failed', e?.message || e);
    }
  }, [isAuthenticated, isReady]);

  useEffect(() => {
    if (!isAuthenticated || !isReady) {
      setFavoritesById({});
      return;
    }
    refreshFromApi();
  }, [isAuthenticated, isReady, refreshFromApi]);

  const isFavorited = useCallback(
    (listingId) => Boolean(listingId && favoritesById[String(listingId)]),
    [favoritesById],
  );

  const toggleFavorite = useCallback(
    async (listing) => {
      if (!listing?.id) return;
      const id = String(listing.id);
      if (isAuthenticated && isReady) {
        try {
          if (favoritesById[id]) {
            await favoritesApi.removeFavorite(id);
          } else {
            await favoritesApi.addFavorite(id);
          }
          await refreshFromApi();
          return;
        } catch (e) {
          console.warn('[Favorites] toggle failed', e?.message || e);
        }
      }
      setFavoritesById((prev) => {
        const next = { ...prev };
        if (next[id]) delete next[id];
        else next[id] = listing;
        return next;
      });
    },
    [isAuthenticated, isReady, favoritesById, refreshFromApi],
  );

  const favorites = useMemo(() => Object.values(favoritesById), [favoritesById]);

  const value = { favorites, favoritesById, isFavorited, toggleFavorite, refreshFavoritesFromApi: refreshFromApi };

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
