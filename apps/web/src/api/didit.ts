import { apiFetch } from './http';

export type DiditSession = {
  session_id: string;
  session_token: string;
  url: string;
};

/** Create a Didit license verification session (webhook updates license status). */
export async function createDiditLicenseSession(
  callback?: string,
): Promise<DiditSession> {
  return apiFetch<DiditSession>('v1/verification/didit/session', {
    method: 'POST',
    json: callback ? { callback } : {},
  });
}

export const DIDIT_RETURN_PATH_KEY = 'ryr.diditReturnPath';

export function diditWebCallbackUrl(): string {
  return `${window.location.origin}/didit/callback`;
}
