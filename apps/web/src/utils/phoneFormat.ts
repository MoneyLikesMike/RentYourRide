/** ISO 3166-1 alpha-2 → flag emoji, e.g. "CA" → 🇨🇦 */
export function countryCodeToEmoji(countryCode: string): string {
  const code = String(countryCode || '').toUpperCase();
  if (code.length !== 2) return '';
  return String.fromCodePoint(
    ...[...code].map((c) => 127397 + c.charCodeAt(0)),
  );
}

export function digitsOnly(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

/** Format NA numbers as (XXX) XXX-XXXX while typing. */
export function formatNationalPhone(value: string, countryCode = 'CA'): string {
  const digits = digitsOnly(value);
  if (!digits) return '';
  if (countryCode === 'CA' || countryCode === 'US') {
    const d = digits.slice(0, 10);
    if (d.length <= 3) return d.length ? `(${d}` : '';
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return digits;
}

export function placeholderForCountry(countryCode = 'CA'): string {
  if (countryCode === 'CA' || countryCode === 'US') return '(613) 555-0137';
  return 'Phone number';
}

export function toE164(
  value: string,
  _countryCode = 'CA',
  callingCode = '1',
): string {
  const digits = digitsOnly(value);
  if (!digits) return '';
  // Already includes country dial if user pasted E.164 without +
  if (value.trim().startsWith('+')) {
    return `+${digits}`;
  }
  const code = digitsOnly(callingCode);
  // Strip leading country code if user typed it into the national field
  if (code && digits.startsWith(code) && digits.length > code.length + 6) {
    return `+${digits}`;
  }
  return `+${code}${digits}`;
}

export function isLikelyValidPhone(value: string, callingCode = '1'): boolean {
  const digits = digitsOnly(value);
  if (!digits) return false;
  const full = digitsOnly(toE164(value, 'CA', callingCode));
  return full.length >= 8 && full.length <= 15;
}

/** Friendly display for E.164, e.g. +1 480 902-4999 */
export function formatPhoneForDisplay(
  e164: string,
  countryCode = 'CA',
): string {
  const digits = digitsOnly(e164);
  if (!digits) return '';
  if ((countryCode === 'CA' || countryCode === 'US') && digits.length >= 11) {
    const n = digits.slice(-10);
    return `+1 ${n.slice(0, 3)} ${n.slice(3, 6)}-${n.slice(6)}`;
  }
  if (String(e164).trim().startsWith('+')) return `+${digits}`;
  return `+${digits}`;
}
