import { apiFetch } from './http';

export type AssistedChecklist = {
  legal: boolean;
  account: boolean;
  phone: boolean;
  licence: boolean;
  card: boolean;
  review: boolean;
};

export type AssistedLead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  source: string;
  status: string;
  linkedUserId: string | null;
  createdAt: string;
  checklist: AssistedChecklist;
  nextStep: string;
  draft: {
    listingId: string;
    listingTitle: string | null;
    bookingDates: Record<string, unknown>;
    extras: unknown;
    deliveryEnabled: boolean;
    introMessage: string | null;
    quote: Record<string, unknown>;
    quotedGrandTotalCents: number;
    bookingId: string | null;
  } | null;
  invite: {
    id: string;
    channel: string;
    deliveredVia: string | null;
    expiresAt: string;
    revoked: boolean;
    bound: boolean;
  } | null;
};

export type AuditRow = {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  staffUserId: string;
};

export function listLeads() {
  return apiFetch<AssistedLead[]>('v1/admin/leads', { method: 'GET' });
}

export function getLead(id: string) {
  return apiFetch<AssistedLead>(`v1/admin/leads/${id}`, { method: 'GET' });
}

export function createLead(body: {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
}) {
  return apiFetch<AssistedLead>('v1/admin/leads', { method: 'POST', json: body });
}

export function saveDraft(
  id: string,
  body: {
    listingId: string;
    bookingDates: { start: number; end: number; startTime?: string; endTime?: string };
    extraUnlimitedKm?: boolean;
    extraPrepaidFuel?: boolean;
    extraPrepaidClean?: boolean;
    deliveryEnabled?: boolean;
    introMessage?: string;
  },
) {
  return apiFetch<AssistedLead>(`v1/admin/leads/${id}/draft`, {
    method: 'POST',
    json: body,
  });
}

export function sendInvite(id: string, channel: 'sms' | 'email') {
  return apiFetch<{ deliveredVia: string; expiresAt: string; inviteId: string }>(
    `v1/admin/leads/${id}/invite`,
    { method: 'POST', json: { channel } },
  );
}

export function revokeInvite(id: string) {
  return apiFetch<{ revoked: number }>(`v1/admin/leads/${id}/invite/revoke`, {
    method: 'POST',
    json: {},
  });
}

export function listLeadAudit(id: string) {
  return apiFetch<AuditRow[]>(`v1/admin/leads/${id}/audit`, { method: 'GET' });
}

export function searchRides(query: string) {
  const qs = new URLSearchParams({ query, take: '10', page: '1', order: 'DESC' });
  return apiFetch<{ data: Array<{ id: string; vehicleInfo: string }> }>(
    `v1/admin/rides?${qs.toString()}`,
    { method: 'GET' },
  );
}
