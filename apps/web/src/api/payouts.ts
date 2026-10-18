import { apiFetch } from './http';

export type PayoutAccountStatus = {
  status?: 'enabled' | 'verifying' | 'action_needed' | 'not_started';
  onboarded?: boolean;
  detailsSubmitted?: boolean;
  payoutsEnabled?: boolean;
  currentlyDue?: string[];
  pastDue?: string[];
  eventuallyDue?: string[];
  errors?: Array<{ requirement?: string; code?: string; reason?: string }>;
};

/** True only when Stripe reports payouts_enabled (Custom Connect). */
export function isPayoutAccountReady(
  status: PayoutAccountStatus | null | undefined,
): boolean {
  if (!status) return false;
  return Boolean(status.payoutsEnabled);
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
  refreshUrl?: string;
  returnUrl?: string;
};

export type PayoutSetupResult = {
  status: 'enabled' | 'verifying' | 'action_needed' | 'not_started';
  payoutsEnabled: boolean;
  detailsSubmitted?: boolean;
  currentlyDue: string[];
  pastDue: string[];
  eventuallyDue: string[];
  errors: Array<{ requirement?: string; code?: string; reason?: string }>;
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
