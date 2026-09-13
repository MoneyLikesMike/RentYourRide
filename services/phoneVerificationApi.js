import { apiFetch } from './apiClient';

export async function startPhoneVerification(phoneNumber) {
  return apiFetch('/v1/auth/start-phone-verification', {
    method: 'POST',
    json: { phoneNumber },
  });
}

export async function finishPhoneVerification(code) {
  return apiFetch('/v1/auth/finish-phone-verification', {
    method: 'POST',
    json: { code },
  });
}
