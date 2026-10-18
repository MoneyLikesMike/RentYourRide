export type RequirementScreen =
  | 'personal'
  | 'address'
  | 'sin'
  | 'id_document'
  | 'address_document'
  | 'bank'
  | 'tos'
  | 'unknown';

export type MappedRequirement = {
  requirement: string;
  screen: RequirementScreen;
  label: string;
  errorReason?: string;
};

const LABELS: Record<string, string> = {
  'individual.first_name': 'Legal first name',
  'individual.last_name': 'Legal last name',
  'individual.email': 'Email',
  'individual.phone': 'Phone',
  'individual.dob.day': 'Date of birth',
  'individual.dob.month': 'Date of birth',
  'individual.dob.year': 'Date of birth',
  'individual.address.line1': 'Street address',
  'individual.address.city': 'City',
  'individual.address.state': 'Province / state',
  'individual.address.postal_code': 'Postal code',
  'individual.id_number': 'Social Insurance Number (SIN)',
  'individual.verification.document': 'Photo ID',
  'individual.verification.additional_document': 'Proof of address',
  'external_account': 'Bank account',
  tos_acceptance: 'Terms of service',
  'tos_acceptance.date': 'Terms of service',
  'tos_acceptance.ip': 'Terms of service',
};

/** Map a Stripe requirement key to an in-app screen. */
export function mapRequirementToScreen(requirement: string): RequirementScreen {
  const r = requirement.toLowerCase();
  if (r.includes('tos_acceptance')) return 'tos';
  if (r.includes('id_number') || r.includes('ssn') || r === 'individual.id_number')
    return 'sin';
  if (
    r.includes('verification.document') ||
    r.includes('verification.proof_of_liveness')
  ) {
    return 'id_document';
  }
  if (
    r.includes('additional_document') ||
    r.includes('verification.additional_document')
  ) {
    return 'address_document';
  }
  if (r.includes('external_account') || r.includes('bank_account')) return 'bank';
  if (r.includes('address')) return 'address';
  if (
    r.includes('individual.first_name') ||
    r.includes('individual.last_name') ||
    r.includes('individual.email') ||
    r.includes('individual.phone') ||
    r.includes('individual.dob') ||
    r.startsWith('individual.')
  ) {
    return 'personal';
  }
  return 'unknown';
}

export function labelForRequirement(requirement: string): string {
  return LABELS[requirement] || requirement.replace(/\./g, ' · ');
}

export function mapRequirementsList(
  due: string[],
  errors: Array<{ requirement?: string; code?: string; reason?: string }> = [],
): MappedRequirement[] {
  const errorByReq = new Map<string, string>();
  for (const e of errors) {
    if (e.requirement && e.reason) errorByReq.set(e.requirement, e.reason);
  }
  const seen = new Set<string>();
  const out: MappedRequirement[] = [];
  for (const requirement of due) {
    if (seen.has(requirement)) continue;
    seen.add(requirement);
    out.push({
      requirement,
      screen: mapRequirementToScreen(requirement),
      label: labelForRequirement(requirement),
      errorReason: errorByReq.get(requirement),
    });
  }
  return out;
}

/** Safe user-facing labels for Stripe verification error codes. */
export function safeErrorLabel(code: string | undefined, reason?: string): string {
  switch (code) {
    case 'verification_document_name_mismatch':
      return 'The name on your ID does not match the name on your account.';
    case 'verification_document_dob_mismatch':
      return 'The date of birth on your ID does not match what we have on file.';
    case 'verification_document_address_mismatch':
      return 'The address on your document does not match your account address.';
    case 'verification_document_fraudulent':
    case 'verification_document_manipulated':
      return 'We could not verify that document. Please try a different one.';
    case 'verification_failed_keyed_identity':
    case 'verification_failed_other':
      return 'We could not verify your identity. Please check your details and try again.';
    case 'verification_document_expired':
      return 'That document looks expired. Please upload a current one.';
    default:
      return reason || 'Additional verification is needed.';
  }
}
