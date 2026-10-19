/**
 * Finish payout setup copy (iOS). Keep in sync with web payoutRequirementCopy.
 * Pending Michael approval (RYRA-485).
 */

export const FINISH_PAYOUT_BANNER_TITLE = 'Finish payout setup to get paid';
export const FINISH_PAYOUT_BANNER_BODY =
  'We still need a few details before we can send your earnings.';

export const SIN_WHY_WE_ASK =
  'Canadian law requires us to collect your Social Insurance Number so Stripe can verify your identity for payouts. We send it directly to Stripe and do not store it on RentYourRide servers.';

export const VERIFICATION_ERROR_COPY = {
  verification_document_name_mismatch:
    'The name on your ID does not match the name on your account.',
  verification_document_dob_mismatch:
    'The date of birth on your ID does not match what we have on file.',
  verification_document_address_mismatch:
    'The address on your document does not match your account address.',
  verification_document_expired:
    'That document looks expired. Please upload a current one.',
  verification_failed_keyed_identity:
    'We could not verify your identity. Please check your details and try again.',
  verification_failed_other:
    'We could not verify your identity. Please check your details and try again.',
};

export function verificationErrorMessage(code, fallback) {
  return VERIFICATION_ERROR_COPY[code] || fallback || 'Additional verification is needed.';
}
