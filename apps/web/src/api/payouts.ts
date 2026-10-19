import { apiFetch, apiUrl } from './http';
import { getAccessToken } from './storage';

export type PayoutAccountStatus = {
  payoutsReady?: boolean;
  status?: 'enabled' | 'verifying' | 'action_needed' | 'not_started';
  onboarded?: boolean;
  detailsSubmitted?: boolean;
  payoutsEnabled?: boolean;
  currentlyDue?: string[];
  pastDue?: string[];
  eventuallyDue?: string[];
  currentDeadline?: string | null;
  errors?: Array<{ requirement?: string; code?: string; label?: string; reason?: string }>;
};

/** True only when Stripe reports payoutsReady (payouts_enabled && transfers active). */
export function isPayoutAccountReady(
  status: PayoutAccountStatus | null | undefined,
): boolean {
  if (!status) return false;
  return Boolean(status.payoutsReady);
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
  dateOfBirth: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
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

export type PayoutSetupResult = PayoutAccountStatus & {
  status: 'enabled' | 'verifying' | 'action_needed' | 'not_started';
  payoutsEnabled: boolean;
  currentlyDue: string[];
  pastDue: string[];
  eventuallyDue: string[];
  errors: Array<{ requirement?: string; code?: string; label?: string }>;
};

export async function submitPayoutSetup(
  body: PayoutSetupInput,
): Promise<PayoutSetupResult> {
  return apiFetch<PayoutSetupResult>('v1/payouts/connect/setup', {
    method: 'POST',
    json: body,
  });
}

export type PayoutRequirement = {
  requirement: string;
  screen:
    | 'personal'
    | 'address'
    | 'sin'
    | 'id_document'
    | 'address_document'
    | 'bank'
    | 'tos'
    | 'unknown';
  label: string;
  errorReason?: string;
};

export async function listPayoutRequirements(): Promise<{
  payoutsReady: boolean;
  requirements: PayoutRequirement[];
}> {
  return apiFetch('v1/payouts/requirements', { method: 'GET' });
}

export async function submitRequirementPersonal(body: Record<string, string>) {
  return apiFetch('v1/payouts/requirements/personal', {
    method: 'POST',
    json: body,
  });
}

export async function submitRequirementSin(sin: string) {
  return apiFetch('v1/payouts/requirements/sin', {
    method: 'POST',
    json: { sin },
  });
}

export async function submitRequirementBank(body: {
  accountNumber: string;
  transitNumber: string;
  institutionNumber: string;
  accountHolderName: string;
}) {
  return apiFetch('v1/payouts/requirements/bank', {
    method: 'POST',
    json: body,
  });
}

export async function submitRequirementTos() {
  return apiFetch('v1/payouts/requirements/tos', {
    method: 'POST',
    json: {},
  });
}

export async function submitRequirementDocument(opts: {
  front: File;
  back?: File | null;
  purpose: 'identity_document' | 'additional_verification';
}) {
  const form = new FormData();
  form.append('purpose', opts.purpose);
  form.append('front', opts.front);
  if (opts.back) form.append('back', opts.back);
  const token = getAccessToken();
  const res = await fetch(apiUrl('v1/payouts/requirements/document'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  const parsed = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      (parsed && (parsed.message || parsed.error)) || 'Upload failed',
    );
  }
  return parsed;
}

export type PayoutsSummary = {
  pendingAmount: number;
  currency: string;
  transfers?: unknown[];
};

export async function payoutsSummary(): Promise<PayoutsSummary> {
  return apiFetch<PayoutsSummary>('v1/payouts/summary', { method: 'GET' });
}
