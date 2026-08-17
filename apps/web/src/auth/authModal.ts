import type { Location } from 'react-router-dom';

export type AuthLocationState = {
  backgroundLocation?: Location;
  from?: string;
  listingDetail?: unknown;
  checkout?: unknown;
};

/** Keep the current page under login/signup as a blurred backdrop. */
export function withAuthBackground(
  location: Location,
  extra: Omit<AuthLocationState, 'backgroundLocation'> = {},
): AuthLocationState {
  const existing = (location.state as AuthLocationState | null) ?? null;
  if (existing?.backgroundLocation) {
    return {
      ...existing,
      ...extra,
      backgroundLocation: existing.backgroundLocation,
    };
  }
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return { ...extra };
  }
  return { ...extra, backgroundLocation: location };
}
