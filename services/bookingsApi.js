import { apiFetch } from './apiClient';

export async function listBookings(role, status) {
  const qs = new URLSearchParams({ role });
  if (status) qs.set('status', status);
  return apiFetch(`/v1/bookings?${qs.toString()}`, { method: 'GET' });
}

export async function getBooking(id) {
  return apiFetch(`/v1/bookings/${encodeURIComponent(id)}`, { method: 'GET' });
}

export async function quoteBooking(body) {
  return apiFetch(`/v1/bookings/quote`, { method: 'POST', json: body });
}

export async function createBooking(body, idempotencyKey) {
  const headers = {};
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  return apiFetch(`/v1/bookings`, {
    method: 'POST',
    json: body,
    headers,
  });
}

export async function cancelBooking(id) {
  return apiFetch(`/v1/bookings/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    json: {},
  });
}

export async function acceptBooking(id) {
  return apiFetch(`/v1/bookings/${encodeURIComponent(id)}/accept`, {
    method: 'POST',
    json: {},
  });
}

export async function declineBooking(id) {
  return apiFetch(`/v1/bookings/${encodeURIComponent(id)}/decline`, {
    method: 'POST',
    json: {},
  });
}

export async function checkinStart(id) {
  return apiFetch(`/v1/bookings/${encodeURIComponent(id)}/checkin/start`, {
    method: 'POST',
    json: {},
  });
}

export async function tripStart(id) {
  return apiFetch(`/v1/bookings/${encodeURIComponent(id)}/trip/start`, {
    method: 'POST',
    json: {},
  });
}

export async function checkoutStart(id) {
  return apiFetch(`/v1/bookings/${encodeURIComponent(id)}/checkout/start`, {
    method: 'POST',
    json: {},
  });
}

export async function completeBooking(id) {
  return apiFetch(`/v1/bookings/${encodeURIComponent(id)}/complete`, {
    method: 'POST',
    json: {},
  });
}

export async function signAgreement(id, body) {
  return apiFetch(`/v1/bookings/${encodeURIComponent(id)}/agreement/sign`, {
    method: 'POST',
    json: body,
  });
}

export async function addConditionPhotos(id, body) {
  return apiFetch(`/v1/bookings/${encodeURIComponent(id)}/condition-photos`, {
    method: 'POST',
    json: body,
  });
}

export async function submitReview(id, body) {
  return apiFetch(`/v1/bookings/${encodeURIComponent(id)}/reviews`, {
    method: 'POST',
    json: body,
  });
}
