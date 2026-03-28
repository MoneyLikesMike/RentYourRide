import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  // Store by listing id so it works across screens.
  const [favoritesById, setFavoritesById] = useState({});

  const isFavorited = useCallback(
    (listingId) => Boolean(listingId && favoritesById[listingId]),
    [favoritesById]
  );

  const toggleFavorite = useCallback((listing) => {
    if (!listing?.id) return;
    setFavoritesById((prev) => {
      const next = { ...prev };
      if (next[listing.id]) {
        delete next[listing.id];
      } else {
        // store a snapshot so the favorites screen can render without needing listings context
        next[listing.id] = listing;
      }
      return next;
    });
  }, []);

  const favorites = useMemo(() => Object.values(favoritesById), [favoritesById]);

  const value = { favorites, favoritesById, isFavorited, toggleFavorite };

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}

