import { apiFetch } from './http';

export type PayoutAccountStatus = {
  onboarded: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled?: boolean;
};

/** True when Stripe Connect onboarding is far enough along to receive payouts. */
export function isPayoutAccountReady(
  status: PayoutAccountStatus | null | undefined,
): boolean {
  if (!status) return false;
  return Boolean(
    status.onboarded || status.detailsSubmitted || status.payoutsEnabled,
  );
}

export async function payoutsAccountStatus(): Promise<PayoutAccountStatus> {
  return apiFetch<PayoutAccountStatus>('v1/payouts/account-status', {
    method: 'GET',
  });
}

export async function connectOnboardingLink(body: {
  refreshUrl: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  return apiFetch<{ url: string }>('v1/payouts/connect/onboarding-link', {
    method: 'POST',
    json: body,
  });
}

export type PayoutSetupInput = {
  firstName: string;
  lastName: string;
  email: string;
  /** YYYY-MM-DD */
  dateOfBirth: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  /** Two-letter province/state code. */
  region: string;
  postalCode: string;
  country: 'CA' | 'US';
  phone: string;
  businessDescription?: string;
  currency: 'CAD' | 'USD';
  bankCountry: 'CA' | 'US';
  accountNumber: string;
  transitNumber?: string;
  institutionNumber?: string;
  routingNumber?: string;
  refreshUrl: string;
  returnUrl: string;
};

export type PayoutSetupResult = {
  /** Present only when Stripe still needs something from the host. */
  url: string | null;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  requiresOnboarding: boolean;
};

export async function submitPayoutSetup(
  body: PayoutSetupInput,
): Promise<PayoutSetupResult> {
  return apiFetch<PayoutSetupResult>('v1/payouts/connect/setup', {
    method: 'POST',
    json: body,
  });
}

export type PayoutsSummary = {
  pendingAmount: number;
  currency: string;
  transfers?: unknown[];
};

export async function payoutsSummary(): Promise<PayoutsSummary> {
  return apiFetch<PayoutsSummary>('v1/payouts/summary', { method: 'GET' });
}
