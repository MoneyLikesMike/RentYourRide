import { apiFetch } from './apiClient';

export async function connectOnboardingLink(body = {}) {
  return apiFetch(`/v1/payouts/connect/onboarding-link`, {
    method: 'POST',
    json: body,
  });
}

/** Custom Connect Get Paid — POST /v1/payouts/connect/setup */
export async function submitPayoutSetup(body) {
  return apiFetch(`/v1/payouts/connect/setup`, {
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
