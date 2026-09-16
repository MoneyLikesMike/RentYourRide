import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { useEffect, useState } from 'react';

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export function isGoogleMapsConfigured(): boolean {
  return Boolean(GOOGLE_MAPS_API_KEY);
}

/**
 * Matches the offset the API applies to public listing coordinates, so the
 * circle covers the area the vehicle could actually be in.
 */
export const APPROXIMATE_RADIUS_M = 500;

export type MapsApi = {
  maps: google.maps.MapsLibrary;
  core: google.maps.CoreLibrary;
  marker: google.maps.MarkerLibrary;
};

/**
 * Plain scroll zooms on desktop. On touch the maps sit inside a scrolling page,
 * so keep the two-finger requirement or they trap the scroll.
 */
export function gestureHandling(): 'cooperative' | 'greedy' {
  return window.matchMedia('(pointer: coarse)').matches
    ? 'cooperative'
    : 'greedy';
}

/** Loads the Maps JS libraries once per page and shares them across maps. */
export function useGoogleMapsApi(): { api: MapsApi | null; failed: boolean } {
  const [api, setApi] = useState<MapsApi | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;
    let active = true;

    setOptions({ key: GOOGLE_MAPS_API_KEY, v: 'weekly' });
    Promise.all([
      importLibrary('maps'),
      importLibrary('core'),
      importLibrary('marker'),
    ])
      .then(([maps, core, marker]) => {
        if (active) setApi({ maps, core, marker });
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, []);

  return { api, failed };
}
