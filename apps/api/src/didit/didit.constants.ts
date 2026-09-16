/** License Verification workflow — per-session config, not a secret. */
export const DIDIT_LICENSE_WORKFLOW_ID = 'e31253d2-97ed-4ee4-8499-ba2170fb4794';

export const DIDIT_VERIFICATION_API = 'https://verification.didit.me';

/** Staff console deep link for reviewing a session (requires Didit login). */
export const DIDIT_BUSINESS_CONSOLE_BASE = 'https://business.didit.me';

export function diditConsoleSessionUrl(sessionId: string | null | undefined): string {
  const id = (sessionId || '').trim();
  if (!id) return '';
  return `${DIDIT_BUSINESS_CONSOLE_BASE}/verifications/${encodeURIComponent(id)}`;
}
