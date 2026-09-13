import { PhoneNumberUtil } from 'google-libphonenumber';

const phoneUtil = PhoneNumberUtil.getInstance();

export function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

/** ISO 3166-1 alpha-2 → flag emoji, e.g. "CA" → 🇨🇦 */
export function countryCodeToEmoji(countryCode) {
  const code = String(countryCode || '').toUpperCase();
  if (code.length !== 2) return '';
  return String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
}

export function formatNationalPhone(value, countryCode = 'CA') {
  const digits = digitsOnly(value);
  if (!digits) return '';
  try {
    const formatter = phoneUtil.AsYouType(countryCode);
    return formatter.input(digits);
  } catch (_) {
    return digits;
  }
}

export function placeholderForCountry(countryCode = 'CA') {
  if (countryCode === 'CA' || countryCode === 'US') return '(613) 555-0137';
  return 'Phone number';
}

export function isValidNationalPhone(value, countryCode = 'CA') {
  const digits = digitsOnly(value);
  if (!digits) return false;
  try {
    const parsed = phoneUtil.parse(digits, countryCode);
    return phoneUtil.isValidNumber(parsed);
  } catch (_) {
    return false;
  }
}

export function toE164(value, countryCode = 'CA', callingCode = '') {
  const digits = digitsOnly(value);
  if (!digits) return '';
  try {
    const parsed = phoneUtil.parse(digits, countryCode);
    if (phoneUtil.isValidNumber(parsed)) {
      return phoneUtil.format(parsed, PhoneNumberUtil.PhoneNumberFormat.E164);
    }
  } catch (_) {
    /* fall through */
  }
  if (callingCode) return `+${callingCode}${digits}`;
  return digits;
}

export function formatPhoneForDisplay(e164, countryCode = 'CA') {
  if (!e164) return '';
  try {
    const parsed = phoneUtil.parse(e164, countryCode);
    return phoneUtil.format(parsed, PhoneNumberUtil.PhoneNumberFormat.NATIONAL);
  } catch (_) {
    return e164;
  }
}
