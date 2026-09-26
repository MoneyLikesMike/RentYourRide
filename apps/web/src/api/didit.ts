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

/** Clear sticky in_progress after the user cancels Didit mid-flow. */
export async function abandonDiditLicenseSession(): Promise<{
  ok?: boolean;
  licenseVerificationStatus?: string;
}> {
  return apiFetch('v1/verification/didit/abandon', {
    method: 'POST',
    json: {},
  });
}

export const DIDIT_RETURN_PATH_KEY = 'ryr.diditReturnPath';

export function diditWebCallbackUrl(): string {
  return `${window.location.origin}/didit/callback`;
}
