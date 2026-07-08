import { apiFetch } from './apiClient';

/** @returns {{ session_id: string, session_token: string, url: string }} */
export async function createDiditLicenseSession() {
  return apiFetch('/v1/verification/didit/session', { method: 'POST', json: {} });
}
