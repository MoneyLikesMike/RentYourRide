/**
 * Keep in sync with apps/api/src/auth/phone-otp-countries.ts and
 * utils/otpAllowedCountries.js
 */
export const OTP_ALLOWED_COUNTRY_CODES = [
  'CA', 'US', 'MX',
  'GB', 'IE', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'LU', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'IS',
  'PT', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'GR', 'HR', 'SI', 'EE', 'LV', 'LT', 'MT', 'CY',
  'AU', 'NZ', 'JP', 'KR', 'CN', 'HK', 'MO', 'TW', 'SG', 'MY', 'TH', 'PH', 'VN', 'ID', 'IN', 'PK', 'BD', 'LK',
  'BR', 'AR', 'CL', 'CO', 'PE', 'UY', 'EC', 'CR', 'PA', 'GT', 'DO', 'JM', 'TT', 'BB', 'BS', 'PR',
  'AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'IL', 'TR', 'EG', 'ZA', 'NG', 'KE', 'GH',
] as const;
