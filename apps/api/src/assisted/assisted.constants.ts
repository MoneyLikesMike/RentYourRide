export const MS_PER_HOUR = 60 * 60 * 1000;
export const SMS_INVITE_TTL_MS = 24 * MS_PER_HOUR;
export const EMAIL_INVITE_TTL_MS = 72 * MS_PER_HOUR;

export const MAX_INVITES_PER_LEAD_PER_DAY = 8;
export const MAX_INVITES_PER_STAFF_PER_HOUR = 20;

export const LEGAL_VERSIONS = {
  terms: '2026-10-01',
  privacy: '2026-10-01',
  rental_agreement: '2026-10-01',
} as const;

export type LegalDocument = keyof typeof LEGAL_VERSIONS;

export const ASSISTED_STEPS = [
  'legal',
  'account',
  'phone',
  'licence',
  'card',
  'review',
] as const;

export type AssistedStep = (typeof ASSISTED_STEPS)[number];
