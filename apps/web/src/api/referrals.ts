import { apiFetch } from './http';

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

export function inviteLink(code: string): string {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://app.rentyourride.ca';
  return `${origin}/signup?ref=${encodeURIComponent(code)}`;
}
