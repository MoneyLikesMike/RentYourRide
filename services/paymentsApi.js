import { apiFetch } from './apiClient';

export async function createSetupIntent() {
  return apiFetch(`/v1/payments/setup-intent`, { method: 'POST', json: {} });
}

export async function createPaymentIntent(body) {
  return apiFetch(`/v1/payments/payment-intent`, { method: 'POST', json: body });
}

export async function listPaymentMethods() {
  return apiFetch(`/v1/payments/methods`, { method: 'GET' });
}

/** Tells the API a card was just saved so it can send the "new card" email. */
export async function reportPaymentMethodAdded(paymentMethodId) {
  await apiFetch(`/v1/payments/methods/added`, {
    method: 'POST',
    json: { paymentMethodId },
  });
}

export async function setDefaultPaymentMethod(paymentMethodId) {
  return apiFetch(`/v1/payments/methods/default`, {
    method: 'POST',
    json: { paymentMethodId },
  });
}

export async function updatePaymentMethodBilling(paymentMethodId, body) {
  return apiFetch(`/v1/payments/methods/${encodeURIComponent(paymentMethodId)}`, {
    method: 'PATCH',
    json: body,
  });
}

export async function detachPaymentMethod(paymentMethodId) {
  return apiFetch(`/v1/payments/methods/${encodeURIComponent(paymentMethodId)}`, {
    method: 'DELETE',
  });
}
