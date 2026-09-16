import { apiFetch } from './apiClient';

export async function connectOnboardingLink(body = {}) {
  return apiFetch(`/v1/payouts/connect/onboarding-link`, {
    method: 'POST',
    json: body,
  });
}

export async function payoutsAccountStatus() {
  return apiFetch(`/v1/payouts/account-status`, { method: 'GET' });
}

export async function payoutsSummary() {
  return apiFetch(`/v1/payouts/summary`, { method: 'GET' });
}
