import { apiFetch } from './http';
import { setTokenPair, setUserJson } from './storage';
import type { LoginPayload } from './types';

export type FinishSession = {
  leadFirstName: string;
  expiresAt: string;
  bound: boolean;
  legalVersions: { terms: string; privacy: string; rental_agreement: string };
  legal: { terms: boolean; privacy: boolean; rentalAgreement: boolean };
  checklist: {
    legal: boolean;
    account: boolean;
    phone: boolean;
    licence: boolean;
    card: boolean;
    review: boolean;
  };
  nextStep: string;
  draft: {
    listingId: string;
    title: string;
    city: string | null;
    photoUri?: string | null;
    hostName?: string | null;
    bookingDates: Record<string, unknown>;
    extras: unknown;
    deliveryEnabled: boolean;
    introMessage?: string | null;
    quote: {
      grandTotal?: number;
      tripDays?: number;
      pricePerDay?: number;
      tripFee?: number;
      subtotal?: number;
      kmIncludedLabel?: string;
    };
  };
  bookingId: string | null;
};

export function getFinishSession(token: string) {
  return apiFetch<FinishSession>(`v1/assisted/finish/${encodeURIComponent(token)}`, {
    method: 'GET',
  });
}

export function acceptFinishLegal(token: string, documents: string[]) {
  return apiFetch<FinishSession>(`v1/assisted/finish/${encodeURIComponent(token)}/legal`, {
    method: 'POST',
    json: { documents },
  });
}

async function storeAuth(data: LoginPayload) {
  setTokenPair(data.token.accessToken, data.token.refreshToken);
  setUserJson(data.user);
  return data;
}

export async function finishRegister(
  token: string,
  body: { email: string; password: string; firstName: string; lastName: string },
) {
  const data = await apiFetch<LoginPayload>(
    `v1/assisted/finish/${encodeURIComponent(token)}/register`,
    { method: 'POST', json: body, auth: false },
  );
  return storeAuth(data);
}

export async function finishLogin(token: string, body: { email: string; password: string }) {
  const data = await apiFetch<LoginPayload>(
    `v1/assisted/finish/${encodeURIComponent(token)}/login`,
    { method: 'POST', json: body, auth: false },
  );
  return storeAuth(data);
}

export async function finishGoogle(token: string, body: { idToken: string; firstName?: string; lastName?: string }) {
  const data = await apiFetch<LoginPayload>(
    `v1/assisted/finish/${encodeURIComponent(token)}/google`,
    { method: 'POST', json: body, auth: false },
  );
  return storeAuth(data);
}

export async function finishApple(
  token: string,
  body: { identityToken: string; email?: string; firstName?: string; lastName?: string },
) {
  const data = await apiFetch<LoginPayload>(
    `v1/assisted/finish/${encodeURIComponent(token)}/apple`,
    { method: 'POST', json: body, auth: false },
  );
  return storeAuth(data);
}

export function acceptFinishBooking(token: string) {
  return apiFetch(`v1/assisted/finish/${encodeURIComponent(token)}/accept`, {
    method: 'POST',
    json: {},
  });
}
