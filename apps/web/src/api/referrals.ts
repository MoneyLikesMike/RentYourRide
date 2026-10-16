import { apiFetch } from './http';
import { SITE_ORIGIN } from '../components/PageMeta';

export type ReferralSummary = {
  referralCode: string;
  creditsBalance: string | number;
};

export async function getReferralsSummary(): Promise<ReferralSummary> {
  return apiFetch<ReferralSummary>('v1/referrals', { method: 'GET' });
}

export async function applyReferralCode(
  code: string,
): Promise<ReferralSummary> {
  return apiFetch<ReferralSummary>('v1/referrals/apply-code', {
    method: 'POST',
    json: { code },
  });
}

/** Shareable invite URL on the canonical www origin (apex deep links 404). */
export function inviteLink(code: string): string {
  return `${SITE_ORIGIN}/invite?code=${encodeURIComponent(code)}`;
}
