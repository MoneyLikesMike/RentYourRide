import { apiFetch } from './apiClient';
export { forgotPassword, resetPassword } from './authApi';

export async function getReferralsSummary() {
  return apiFetch(`/v1/referrals`, { method: 'GET' });
}

export async function applyReferralCode(code) {
  return apiFetch(`/v1/referrals/apply-code`, {
    method: 'POST',
    json: { code },
  });
}
