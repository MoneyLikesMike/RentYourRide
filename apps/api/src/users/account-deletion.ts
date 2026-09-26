import { BookingStatus } from '../entities/booking.entity';

/** Bookings that are still in progress or upcoming — not history. */
export const OPEN_BOOKING_STATUSES: BookingStatus[] = [
  'pending_host',
  'confirmed',
  'checkin_pending',
  'active',
  'extension_pending',
  'extended',
  'extension_declined',
  'checkout_pending',
];

export type AccountDeletionBlockerCode =
  | 'ACTIVE_TRIPS'
  | 'OUTSTANDING_BALANCE';

export type AccountDeletionBlocker = {
  code: AccountDeletionBlockerCode;
  title: string;
  detail: string;
  count?: number;
  amountCents?: number;
};

export const ACCOUNT_DELETION_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

export type AccountDeletionEligibility = {
  canDelete: boolean;
  blockers: AccountDeletionBlocker[];
  gracePeriodDays: number;
  hasPassword: boolean;
  googleConnected: boolean;
  appleConnected: boolean;
};

export type AccountDeletionReauth = {
  password?: string;
  googleIdToken?: string;
  appleIdentityToken?: string;
};
