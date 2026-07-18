import { startVerification } from '@didit-protocol/sdk-react-native';
import { createDiditLicenseSession } from './diditApi';

/**
 * Creates a bedev Didit session and launches the native verification flow.
 * Status updates arrive via POST /v1/webhooks/didit on the API.
 *
 * @returns {Promise<import('@didit-protocol/sdk-react-native').VerificationResult>}
 */
export async function submitLicenseToDidit() {
  const session = await createDiditLicenseSession();
  const token = session?.session_token;
  if (!token) {
    throw new Error('Could not start verification session.');
  }

  return startVerification(token, {
    languageCode: 'en',
    closeOnComplete: true,
    showExitConfirmation: true,
  });
}

/**
 * @param {import('@didit-protocol/sdk-react-native').VerificationResult} result
 * @returns {'completed' | 'cancelled' | 'failed'}
 */
export function diditResultKind(result) {
  return result?.type || 'failed';
}
