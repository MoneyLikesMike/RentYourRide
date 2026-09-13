import { apiFetch } from './http';
import type { ListingDetail } from './listings';

export async function listFavorites(): Promise<ListingDetail[]> {
  return apiFetch<ListingDetail[]>('v1/favorites', { method: 'GET' });
}

export async function addFavorite(listingId: string): Promise<void> {
  await apiFetch(`v1/favorites/${encodeURIComponent(listingId)}`, {
    method: 'PUT',
    json: {},
  });
}

export async function removeFavorite(listingId: string): Promise<void> {
  await apiFetch(`v1/favorites/${encodeURIComponent(listingId)}`, {
    method: 'DELETE',
  });
}
