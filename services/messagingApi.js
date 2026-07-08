import { apiFetch } from './apiClient';

export async function listConversations() {
  return apiFetch('/v1/conversations', { method: 'GET' });
}

export async function unreadCount() {
  return apiFetch('/v1/conversations/unread-count', { method: 'GET' });
}

export async function getConversation(id) {
  return apiFetch(`/v1/conversations/${encodeURIComponent(id)}`, { method: 'GET' });
}

export async function findOrCreateForBooking(bookingId) {
  return apiFetch(`/v1/conversations/booking/${encodeURIComponent(bookingId)}`, {
    method: 'POST',
    json: {},
  });
}

export async function listMessages(conversationId, { before, take } = {}) {
  const qs = new URLSearchParams();
  if (before) qs.set('before', String(before));
  if (take) qs.set('take', String(take));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch(
    `/v1/conversations/${encodeURIComponent(conversationId)}/messages${suffix}`,
    { method: 'GET' },
  );
}

export async function sendMessage(conversationId, text) {
  return apiFetch(
    `/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: 'POST', json: { text } },
  );
}

export async function markConversationRead(conversationId) {
  return apiFetch(
    `/v1/conversations/${encodeURIComponent(conversationId)}/read`,
    { method: 'POST', json: {} },
  );
}
