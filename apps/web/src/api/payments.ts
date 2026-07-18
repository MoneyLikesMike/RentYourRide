import { apiFetch } from './http';

export type StripePaymentMethod = {
  id: string;
  type: string;
  brand: string;
  last4: string;
  funding?: string | null;
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

export async function setDefaultPaymentMethod(
  paymentMethodId: string,
): Promise<{ ok?: boolean }> {
  return apiFetch('v1/payments/methods/default', {
    method: 'POST',
    json: { paymentMethodId },
  });
}

export function isStripeClientSecret(secret: string | null | undefined): boolean {
  return typeof secret === 'string' && /^(seti_|pi_)/.test(secret);
}
