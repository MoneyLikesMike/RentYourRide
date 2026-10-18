/** Shared Get Paid → API body helpers (no React). */

const CA_PROVINCE_CODES = {
  Alberta: 'AB',
  'British Columbia': 'BC',
  Manitoba: 'MB',
  'New Brunswick': 'NB',
  'Newfoundland and Labrador': 'NL',
  'Nova Scotia': 'NS',
  Ontario: 'ON',
  'Prince Edward Island': 'PE',
  Quebec: 'QC',
  Saskatchewan: 'SK',
  'Northwest Territories': 'NT',
  Nunavut: 'NU',
  Yukon: 'YT',
};

const US_STATE_CODES = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
};

/** "MM / DD / YYYY" → YYYY-MM-DD */
export function dobToIso(value) {
  const d = String(value || '').replace(/\D/g, '');
  if (d.length !== 8) return null;
  return `${d.slice(4, 8)}-${d.slice(0, 2)}-${d.slice(2, 4)}`;
}

export function regionCodeFromForm(values) {
  if (values.country === 'CA') {
    return CA_PROVINCE_CODES[values.province] || values.province;
  }
  return US_STATE_CODES[values.state] || values.state;
}

/** Body for POST /v1/payouts/connect/setup */
export function buildPayoutSetupBody(values) {
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const dateOfBirth = dobToIso(values.dob);
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim(),
    dateOfBirth,
    addressLine1: values.addressLine1.trim(),
    addressLine2: values.addressLine2.trim() || undefined,
    city: values.city.trim(),
    region: regionCodeFromForm(values),
    postalCode:
      values.country === 'CA'
        ? values.postalCode.trim()
        : values.zipCode.trim(),
    country: values.country,
    phone: digits(values.phone),
    businessDescription: values.businessDescription.trim() || undefined,
    currency: values.currency,
    bankCountry: values.bankCountry,
    accountNumber: digits(values.accountNumber),
    transitNumber:
      values.bankCountry === 'CA' ? digits(values.transitNumber) : undefined,
    institutionNumber:
      values.bankCountry === 'CA' ? digits(values.institutionNumber) : undefined,
    routingNumber:
      values.bankCountry === 'US' ? digits(values.routingNumber) : undefined,
  };
}
