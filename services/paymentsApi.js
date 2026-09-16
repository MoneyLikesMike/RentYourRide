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

export async function setDefaultPaymentMethod(paymentMethodId) {
  return apiFetch(`/v1/payments/methods/default`, {
    method: 'POST',
    json: { paymentMethodId },
  });
}
