import { apiFetch } from './http';

export type AdminPayoutAccount = {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  stripeAccountId: string;
  accountKind: 'express' | 'custom';
  payoutsEnabled: boolean;
  payoutsReady: boolean;
  transfersCapability: string | null;
  currentlyDue: string[];
  pastDue: string[];
  currentDeadline: string | null;
  lastSyncedAt: string | null;
  status: string;
};

export async function fetchPayoutAccounts(
  filter?: 'past_due' | 'restricted' | 'pending_payouts',
): Promise<AdminPayoutAccount[]> {
  const q = filter ? `?filter=${encodeURIComponent(filter)}` : '';
  return apiFetch<AdminPayoutAccount[]>(`v1/admin/payout-accounts${q}`, {
    method: 'GET',
  });
}

export async function resyncPayoutAccount(userId: string) {
  return apiFetch(`v1/admin/payout-accounts/${encodeURIComponent(userId)}/resync`, {
    method: 'POST',
  });
}
