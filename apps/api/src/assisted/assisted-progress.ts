import {
  ASSISTED_STEPS,
  EMAIL_INVITE_TTL_MS,
  LEGAL_VERSIONS,
  SMS_INVITE_TTL_MS,
  type AssistedStep,
} from './assisted.constants';

export type AssistedChecklistInput = {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  boundUserId: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  licenseVerified: boolean;
  hasCard: boolean;
  bookingId: string | null;
};

export type AssistedChecklist = {
  legal: boolean;
  account: boolean;
  phone: boolean;
  licence: boolean;
  card: boolean;
  review: boolean;
};

/** PG/JSON flags must be real true — `!!'f'` and `!!'false'` are true in JS. */
export function isFlagTrue(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    return s === 't' || s === 'true' || s === '1' || s === 'yes';
  }
  return false;
}

export function checklistFromState(input: AssistedChecklistInput): AssistedChecklist {
  return {
    legal: input.termsAccepted && input.privacyAccepted,
    account: Boolean(input.boundUserId) && isFlagTrue(input.emailVerified),
    phone: isFlagTrue(input.phoneVerified),
    licence: isFlagTrue(input.licenseVerified),
    card: input.hasCard,
    review: Boolean(input.bookingId),
  };
}

export function nextIncompleteStep(check: AssistedChecklist): AssistedStep | 'done' {
  for (const step of ASSISTED_STEPS) {
    if (!check[step]) return step;
  }
  return 'done';
}

export function legalVersionFor(document: keyof typeof LEGAL_VERSIONS): string {
  return LEGAL_VERSIONS[document];
}

const SECRET_KEY = /password|otp|cardNumber|cvc|cvv|pan|secret|token|clientSecret|authorization/i;

export function scrubAuditMetadata(
  input: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!input || typeof input !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SECRET_KEY.test(key)) continue;
    if (typeof value === 'string' && SECRET_KEY.test(value)) continue;
    out[key] = value;
  }
  return out;
}

export function inviteTtlMs(channel: 'sms' | 'email'): number {
  return channel === 'sms' ? SMS_INVITE_TTL_MS : EMAIL_INVITE_TTL_MS;
}

export function shouldFallbackToEmail(opts: {
  requestedChannel: 'sms' | 'email';
  smsSent: boolean;
  smsFailure?: string | null;
  hasEmail: boolean;
}): boolean {
  if (opts.requestedChannel !== 'sms') return false;
  if (opts.smsSent) return false;
  if (!opts.hasEmail) return false;
  return (
    opts.smsFailure === 'spend_cap' ||
    opts.smsFailure === 'not_configured' ||
    opts.smsFailure === 'provider_error'
  );
}

export function quotesDifferCents(previous: number, next: number): boolean {
  return Math.round(previous) !== Math.round(next);
}
