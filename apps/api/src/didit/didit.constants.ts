/** License Verification workflow — per-session config, not a secret. */
export const DIDIT_LICENSE_WORKFLOW_ID = 'e31253d2-97ed-4ee4-8499-ba2170fb4794';

export const DIDIT_VERIFICATION_API = 'https://verification.didit.me';

/** Staff console deep link for reviewing a session (requires Didit login). */
export const DIDIT_BUSINESS_CONSOLE_BASE = 'https://business.didit.me';

/**
 * Didit Business Console session review URL.
 *
 * Real console routes are:
 *   /console/{teamId}/{appId}/kyc/verifications?session-id={sessionId}
 * The old `/verifications/{id}` path 404s.
 *
 * Set DIDIT_CONSOLE_TEAM + DIDIT_CONSOLE_APP (org/app ids from the address bar
 * while logged into business.didit.me) in env / Secrets Manager.
 */
export function diditConsoleSessionUrl(sessionId: string | null | undefined): string {
  const id = (sessionId || '').trim();
  if (!id) return '';

  const team = (process.env.DIDIT_CONSOLE_TEAM || '').trim();
  const app = (process.env.DIDIT_CONSOLE_APP || '').trim();
  if (!team || !app) {
    // Still better than the dead /verifications/:id route — opens console home.
    return `${DIDIT_BUSINESS_CONSOLE_BASE}/console`;
  }

  const path = `/console/${encodeURIComponent(team)}/${encodeURIComponent(app)}/kyc/verifications`;
  const qs = new URLSearchParams({ 'session-id': id });
  return `${DIDIT_BUSINESS_CONSOLE_BASE}${path}?${qs.toString()}`;
}
