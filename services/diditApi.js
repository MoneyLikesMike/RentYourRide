import { apiFetch } from './apiClient';

/** @returns {{ session_id: string, session_token: string, url: string }} */
export async function createDiditLicenseSession() {
  return apiFetch('/v1/verification/didit/session', { method: 'POST', json: {} });
}

/** Clear sticky in_progress after the user cancels Didit mid-flow. */
export async function abandonDiditLicenseSession() {
  return apiFetch('/v1/verification/didit/abandon', { method: 'POST', json: {} });
}
