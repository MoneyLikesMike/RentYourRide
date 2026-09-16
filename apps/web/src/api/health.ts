import { apiFetch } from './http';

export type HealthResponse = { ok: boolean };

export function fetchHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('v1/health', {
    method: 'GET',
    auth: false,
  });
}
