import { apiFetch } from './apiClient';
import { getApiBaseUrl } from '../constants/api';
import * as tokens from './authTokens';

export async function connectOnboardingLink(body = {}) {
  return apiFetch(`/v1/payouts/connect/onboarding-link`, {
    method: 'POST',
    json: body,
  });
}

/** Custom Connect Get Paid — POST /v1/payouts/connect/setup */
export async function submitPayoutSetup(body) {
  return apiFetch(`/v1/payouts/connect/setup`, {
    method: 'POST',
    json: body,
  });
}

export async function payoutsAccountStatus() {
  return apiFetch(`/v1/payouts/account-status`, { method: 'GET' });
}

export async function payoutsSummary() {
  return apiFetch(`/v1/payouts/summary`, { method: 'GET' });
}

export async function listPayoutRequirements() {
  return apiFetch(`/v1/payouts/requirements`, { method: 'GET' });
}

export async function submitRequirementPersonal(body) {
  return apiFetch(`/v1/payouts/requirements/personal`, {
    method: 'POST',
    json: body,
  });
}

export async function submitRequirementSin(sin) {
  return apiFetch(`/v1/payouts/requirements/sin`, {
    method: 'POST',
    json: { sin },
  });
}

export async function submitRequirementBank(body) {
  return apiFetch(`/v1/payouts/requirements/bank`, {
    method: 'POST',
    json: body,
  });
}

export async function submitRequirementTos() {
  return apiFetch(`/v1/payouts/requirements/tos`, {
    method: 'POST',
    json: {},
  });
}

/** Multipart document upload (memory on server → Stripe files.create). */
export async function submitRequirementDocument({
  frontUri,
  backUri,
  purpose = 'identity_document',
}) {
  const base = getApiBaseUrl();
  const token = await tokens.getAccessToken();
  const form = new FormData();
  form.append('purpose', purpose);
  form.append('front', {
    uri: frontUri,
    name: 'front.jpg',
    type: 'image/jpeg',
  });
  if (backUri) {
    form.append('back', {
      uri: backUri,
      name: 'back.jpg',
      type: 'image/jpeg',
    });
  }
  const res = await fetch(`${base}/v1/payouts/requirements/document`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    const msg =
      (parsed && (parsed.message || parsed.error)) ||
      `Upload failed (${res.status})`;
    throw new Error(typeof msg === 'string' ? msg : 'Upload failed');
  }
  return parsed;
}
