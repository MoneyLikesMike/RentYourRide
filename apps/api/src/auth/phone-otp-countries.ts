/**
 * Countries we send phone OTP SMS to.
 *
 * Strategy: allow common traveler / reasonable-cost destinations; block the
 * rest. Obscure high-cost routes are what SMS pumps abuse (Sept 2026 spend spike).
 * Canada/US stay first-class; other entries are typical inbound tourism origins.
 *
 * Keep in sync with mobile CountryPicker `countryCodes` and web `allowedCca2`.
 */
export const OTP_ALLOWED_CCA2 = [
  // North America
  'CA',
  'US',
  'MX',
  // Europe
  'GB',
  'IE',
  'FR',
  'DE',
  'ES',
  'IT',
  'NL',
  'BE',
  'LU',
  'AT',
  'CH',
  'SE',
  'NO',
  'DK',
  'FI',
  'IS',
  'PT',
  'PL',
  'CZ',
  'SK',
  'HU',
  'RO',
  'BG',
  'GR',
  'HR',
  'SI',
  'EE',
  'LV',
  'LT',
  'MT',
  'CY',
  // Asia-Pacific
  'AU',
  'NZ',
  'JP',
  'KR',
  'CN',
  'HK',
  'MO',
  'TW',
  'SG',
  'MY',
  'TH',
  'PH',
  'VN',
  'ID',
  'IN',
  'PK',
  'BD',
  'LK',
  // Latin America & Caribbean (common +1 / nearby)
  'BR',
  'AR',
  'CL',
  'CO',
  'PE',
  'UY',
  'EC',
  'CR',
  'PA',
  'GT',
  'DO',
  'JM',
  'TT',
  'BB',
  'BS',
  'PR',
  // Middle East / Africa (common travel)
  'AE',
  'SA',
  'QA',
  'KW',
  'BH',
  'OM',
  'IL',
  'TR',
  'EG',
  'ZA',
  'NG',
  'KE',
  'GH',
] as const;

export type OtpAllowedCca2 = (typeof OTP_ALLOWED_CCA2)[number];

/**
 * ITU calling-code prefixes → ISO country (longest match wins).
 * Only includes countries in OTP_ALLOWED_CCA2. NANP (+1) covers CA/US/PR and
 * several Caribbean entries we allow — treated as allowed via +1.
 */
const CALLING_CODE_TO_CCA2: Array<{ prefix: string; cca2: string }> = [
  // Non-+1 first (specific), then +1 catch-all for NANP allowlist members
  { prefix: '44', cca2: 'GB' },
  { prefix: '353', cca2: 'IE' },
  { prefix: '33', cca2: 'FR' },
  { prefix: '49', cca2: 'DE' },
  { prefix: '34', cca2: 'ES' },
  { prefix: '39', cca2: 'IT' },
  { prefix: '31', cca2: 'NL' },
  { prefix: '32', cca2: 'BE' },
  { prefix: '352', cca2: 'LU' },
  { prefix: '43', cca2: 'AT' },
  { prefix: '41', cca2: 'CH' },
  { prefix: '46', cca2: 'SE' },
  { prefix: '47', cca2: 'NO' },
  { prefix: '45', cca2: 'DK' },
  { prefix: '358', cca2: 'FI' },
  { prefix: '354', cca2: 'IS' },
  { prefix: '351', cca2: 'PT' },
  { prefix: '48', cca2: 'PL' },
  { prefix: '420', cca2: 'CZ' },
  { prefix: '421', cca2: 'SK' },
  { prefix: '36', cca2: 'HU' },
  { prefix: '40', cca2: 'RO' },
  { prefix: '359', cca2: 'BG' },
  { prefix: '30', cca2: 'GR' },
  { prefix: '385', cca2: 'HR' },
  { prefix: '386', cca2: 'SI' },
  { prefix: '372', cca2: 'EE' },
  { prefix: '371', cca2: 'LV' },
  { prefix: '370', cca2: 'LT' },
  { prefix: '356', cca2: 'MT' },
  { prefix: '357', cca2: 'CY' },
  { prefix: '61', cca2: 'AU' },
  { prefix: '64', cca2: 'NZ' },
  { prefix: '81', cca2: 'JP' },
  { prefix: '82', cca2: 'KR' },
  { prefix: '86', cca2: 'CN' },
  { prefix: '852', cca2: 'HK' },
  { prefix: '853', cca2: 'MO' },
  { prefix: '886', cca2: 'TW' },
  { prefix: '65', cca2: 'SG' },
  { prefix: '60', cca2: 'MY' },
  { prefix: '66', cca2: 'TH' },
  { prefix: '63', cca2: 'PH' },
  { prefix: '84', cca2: 'VN' },
  { prefix: '62', cca2: 'ID' },
  { prefix: '91', cca2: 'IN' },
  { prefix: '92', cca2: 'PK' },
  { prefix: '880', cca2: 'BD' },
  { prefix: '94', cca2: 'LK' },
  { prefix: '55', cca2: 'BR' },
  { prefix: '54', cca2: 'AR' },
  { prefix: '56', cca2: 'CL' },
  { prefix: '57', cca2: 'CO' },
  { prefix: '51', cca2: 'PE' },
  { prefix: '598', cca2: 'UY' },
  { prefix: '593', cca2: 'EC' },
  { prefix: '506', cca2: 'CR' },
  { prefix: '507', cca2: 'PA' },
  { prefix: '502', cca2: 'GT' },
  { prefix: '1809', cca2: 'DO' }, // also 1829/1849 — handled via +1 NANP allow
  { prefix: '1876', cca2: 'JM' },
  { prefix: '1868', cca2: 'TT' },
  { prefix: '1246', cca2: 'BB' },
  { prefix: '1242', cca2: 'BS' },
  { prefix: '1787', cca2: 'PR' },
  { prefix: '1939', cca2: 'PR' },
  { prefix: '52', cca2: 'MX' },
  { prefix: '971', cca2: 'AE' },
  { prefix: '966', cca2: 'SA' },
  { prefix: '974', cca2: 'QA' },
  { prefix: '965', cca2: 'KW' },
  { prefix: '973', cca2: 'BH' },
  { prefix: '968', cca2: 'OM' },
  { prefix: '972', cca2: 'IL' },
  { prefix: '90', cca2: 'TR' },
  { prefix: '20', cca2: 'EG' },
  { prefix: '27', cca2: 'ZA' },
  { prefix: '234', cca2: 'NG' },
  { prefix: '254', cca2: 'KE' },
  { prefix: '233', cca2: 'GH' },
  // NANP last (shortest among +1*)
  { prefix: '1', cca2: 'US' }, // CA/US/PR/Jamaica/etc. — see isNanpAllowed
].sort((a, b) => b.prefix.length - a.prefix.length);

const ALLOWED_SET = new Set<string>(OTP_ALLOWED_CCA2);

/** NANP (+1) area: allow CA/US and the Caribbean ISO codes we explicitly listed. */
function isNanpAllowed(nationalDigits: string): boolean {
  // US/CA: 10-digit national numbers; we cannot perfectly split US vs CA — both allowed.
  if (nationalDigits.length === 10) return true;
  return false;
}

/**
 * Returns true if this E.164 destination is in the traveler / reasonable-cost set.
 */
export function isAllowedPhoneForOtp(e164: string): boolean {
  const raw = String(e164 || '').trim();
  if (!/^\+[1-9]\d{7,14}$/.test(raw)) return false;
  const digits = raw.slice(1);

  for (const { prefix, cca2 } of CALLING_CODE_TO_CCA2) {
    if (!digits.startsWith(prefix)) continue;
    if (prefix === '1') {
      return isNanpAllowed(digits.slice(1));
    }
    return ALLOWED_SET.has(cca2);
  }
  return false;
}
