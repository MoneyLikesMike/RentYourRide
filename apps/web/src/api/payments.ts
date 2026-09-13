import { apiFetch } from './http';

export type StripePaymentMethod = {
  id: string;
  type: string;
  brand: string;
  last4: string;
  funding?: string | null;
  expMonth?: number | null;
  expYear?: number | null;
  isDefault?: boolean;
  cardholderName?: string | null;
  country?: string | null;
  postalCode?: string | null;
};

export async function createSetupIntent(): Promise<{
  clientSecret: string;
  customerId: string;
}> {
  return apiFetch('v1/payments/setup-intent', {
    method: 'POST',
    json: {},
  });
}

export async function listPaymentMethods(): Promise<StripePaymentMethod[]> {
  return apiFetch<StripePaymentMethod[]>('v1/payments/methods', {
    method: 'GET',
  });
}

/** Tells the API a card was just saved so it can send the "new card" email. */
export async function reportPaymentMethodAdded(
  paymentMethodId: string,
): Promise<void> {
  try {
    await apiFetch('v1/payments/methods/added', {
      method: 'POST',
      json: { paymentMethodId },
    });
  } catch {
    // The card is already saved — a missed notification must not fail the flow.
  }
}

export async function setDefaultPaymentMethod(
  paymentMethodId: string,
): Promise<{ ok?: boolean }> {
  return apiFetch('v1/payments/methods/default', {
    method: 'POST',
    json: { paymentMethodId },
  });
}

export async function deletePaymentMethod(
  paymentMethodId: string,
): Promise<{ ok?: boolean }> {
  return apiFetch(`v1/payments/methods/${encodeURIComponent(paymentMethodId)}`, {
    method: 'DELETE',
  });
}

export async function updatePaymentMethodBilling(
  paymentMethodId: string,
  body: {
    cardholderName?: string;
    country?: string;
    postalCode?: string;
  },
): Promise<{ ok?: boolean }> {
  return apiFetch(
    `v1/payments/methods/${encodeURIComponent(paymentMethodId)}`,
    {
      method: 'PATCH',
      json: body,
    },
  );
}

export function isStripeClientSecret(secret: string | null | undefined): boolean {
  return typeof secret === 'string' && /^(seti_|pi_)/.test(secret);
}

export function formatCardExpiry(
  month?: number | null,
  year?: number | null,
): string {
  if (!month || !year) return '';
  const mm = String(month).padStart(2, '0');
  const yyyy = year < 100 ? 2000 + year : year;
  return `${mm}/${yyyy}`;
}

export function formatCardNumberMask(last4: string): string {
  return `XXXX - XXXX - XXXX - ${last4}`;
}
