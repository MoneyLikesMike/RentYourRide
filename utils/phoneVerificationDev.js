import { Alert } from 'react-native';

/** bedev returns devCode when SMS is not configured (SMS_EXPOSE_CODE=1). */
export function alertDevVerificationCode(result, phoneLabel) {
  if (!result?.devCode) return;
  const target = phoneLabel ? ` ${phoneLabel}` : ' your number';
  Alert.alert(
    'Verification code',
    `Use this code to verify${target}:\n\n${result.devCode}\n\nSMS is not configured on this server, so the code is shown here for testing.`,
  );
}
