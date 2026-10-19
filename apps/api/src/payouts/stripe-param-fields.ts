/**
 * Map Stripe InvalidRequestError `param` paths to Get Paid form field names.
 */
export function stripeParamToField(param: string | undefined | null): string | null {
  if (!param) return null;
  const p = param.replace(/^\/+/, '').toLowerCase();

  if (/individual\.?first_name|individual\[first_name\]/.test(p) || p.includes('first_name'))
    return 'firstName';
  if (/individual\.?last_name|individual\[last_name\]/.test(p) || p.includes('last_name'))
    return 'lastName';
  if (/individual\.?email|email/.test(p) && !p.includes('business')) return 'email';
  if (/individual\.?phone|phone/.test(p)) return 'phone';
  if (/dob|date_of_birth/.test(p)) return 'dateOfBirth';
  if (/address\.?line1|line1/.test(p)) return 'addressLine1';
  if (/address\.?line2|line2/.test(p)) return 'addressLine2';
  if (/address\.?city|city/.test(p)) return 'city';
  if (/address\.?state|state|region/.test(p)) return 'region';
  if (/postal_code|postalcode|zip/.test(p)) return 'postalCode';
  if (/account_number/.test(p)) return 'accountNumber';
  if (/routing_number|transit|institution/.test(p)) {
    if (/transit/.test(p)) return 'transitNumber';
    if (/institution/.test(p)) return 'institutionNumber';
    return 'routingNumber';
  }
  if (/external_account/.test(p)) return 'accountNumber';
  return null;
}
