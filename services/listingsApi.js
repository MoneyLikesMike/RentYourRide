import { apiFetch } from './apiClient';

export async function searchListings(params = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.city) qs.set('city', params.city);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch(`/v1/listings/search${suffix}`, { method: 'GET', auth: false });
}

export async function getListing(id) {
  return apiFetch(`/v1/listings/${encodeURIComponent(id)}`, { method: 'GET', auth: false });
}

export async function vinStatus(vin) {
  return apiFetch(`/v1/listings/vin/${encodeURIComponent(vin)}/status`, {
    method: 'GET',
    auth: false,
  });
}

/** Decode VIN via bedev (NHTSA vPIC) and check duplicate in one call. */
export async function decodeVin(vin) {
  return apiFetch(`/v1/listings/vin/${encodeURIComponent(vin)}/decode`, {
    method: 'GET',
    auth: false,
  });
}

export async function hostListListings() {
  return apiFetch(`/v1/host/listings`, { method: 'GET' });
}

export async function hostCreateListing(body) {
  return apiFetch(`/v1/host/listings`, { method: 'POST', json: body });
}

export async function hostPatchListing(id, body) {
  return apiFetch(`/v1/host/listings/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    json: body,
  });
}

export async function hostPublishListing(id) {
  return apiFetch(`/v1/host/listings/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
    json: {},
  });
}

export async function hostDeleteListing(id) {
  return apiFetch(`/v1/host/listings/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** @param {{ uri: string, name?: string, type?: string }} file */
export async function hostUploadListingPhoto(id, file) {
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name || 'photo.jpg',
    type: file.type || 'image/jpeg',
  });
  return apiFetch(`/v1/host/listings/${encodeURIComponent(id)}/photos`, {
    method: 'POST',
    formData: form,
  });
}

export async function getHostListingAvailability(id) {
  return apiFetch(`/v1/host/listings/${encodeURIComponent(id)}/availability`, {
    method: 'GET',
  });
}

export async function hostListingAvailability(id, availability) {
  return apiFetch(`/v1/host/listings/${encodeURIComponent(id)}/availability`, {
    method: 'PATCH',
    json: { availability },
  });
}
