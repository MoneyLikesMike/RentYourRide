import { apiFetch } from './apiClient';

export async function listFavorites() {
  return apiFetch(`/v1/favorites`, { method: 'GET' });
}

export async function addFavorite(listingId) {
  return apiFetch(`/v1/favorites/${encodeURIComponent(listingId)}`, {
    method: 'PUT',
    json: {},
  });
}

export async function removeFavorite(listingId) {
  return apiFetch(`/v1/favorites/${encodeURIComponent(listingId)}`, {
    method: 'DELETE',
  });
}
