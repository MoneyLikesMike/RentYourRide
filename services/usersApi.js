import { apiFetch } from './apiClient';

export async function getMe() {
  return apiFetch(`/v1/users/me`, { method: 'GET' });
}

export async function patchMe(body) {
  return apiFetch(`/v1/users/me`, { method: 'PATCH', json: body });
}

export async function patchPassword(body) {
  return apiFetch(`/v1/users/me/password`, { method: 'PATCH', json: body });
}

export async function getNotificationSettings() {
  return apiFetch(`/v1/users/me/notification-settings`, { method: 'GET' });
}

export async function patchNotificationSettings(settings) {
  return apiFetch(`/v1/users/me/notification-settings`, {
    method: 'PATCH',
    json: { settings },
  });
}

export async function registerPushToken(token, platform) {
  return apiFetch(`/v1/users/me/push-token`, {
    method: 'POST',
    json: { token, platform },
  });
}

/** @param {{ uri: string, name?: string, type?: string }} file RN image picker shape */
export async function uploadAvatar(file) {
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name || 'avatar.jpg',
    type: file.type || 'image/jpeg',
  });
  return apiFetch(`/v1/users/me/avatar`, { method: 'POST', formData: form });
}
