/** Automobile rental — the merchant category Stripe expects for our hosts. */
export const RENTAL_MCC = '7512';

/** Version string stored on each TOS audit row (legal copy in client constants). */
export const CONNECT_TOS_AGREEMENT_VERSION = 'stripe-connect-full';

/** Phone numbers come in as national digits; Stripe wants E.164. */
export function toE164(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return raw.startsWith('+') ? raw : `+${digits}`;
}
