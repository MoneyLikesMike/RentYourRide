import { Alert } from 'react-native';
import { getMe } from '../services/usersApi';
import { buildAccountSetupSteps } from './accountSetupSteps';
import { navigateRootStack } from './navigateRootStack';

/** @param {object | null | undefined} me */
export function isIdentityVerificationComplete(me) {
  return buildAccountSetupSteps(me).allDone;
}

/** Open VerificationStepsScreen from any tab / nested stack. */
export function navigateToVerificationSteps(navigation) {
  const tabNav = navigation.getParent?.();
  if (tabNav?.navigate) {
    tabNav.navigate('ProfileScreen', { screen: 'VerificationStepsScreen' });
    return;
  }
  const rootNav = tabNav?.getParent?.();
  if (rootNav?.navigate) {
    rootNav.navigate('MainTabs', {
      screen: 'ProfileScreen',
      params: { screen: 'VerificationStepsScreen' },
    });
    return;
  }
  navigation.navigate?.('VerificationStepsScreen');
}

/**
 * Ensure the signed-in user has completed email + phone + license verification.
 * @returns {Promise<boolean>} true if allowed to continue
 */
export async function ensureIdentityVerified(navigation, options = {}) {
  const { alertTitle = 'Verification required' } = options;
  try {
    const me = await getMe();
    if (isIdentityVerificationComplete(me)) return true;
  } catch (_) {
    Alert.alert(
      alertTitle,
      'Sign in and complete email, phone, and license verification before continuing.',
    );
    return false;
  }

  Alert.alert(
    alertTitle,
    'Complete email, phone, and license verification before you can book or list a ride.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Verify now',
        onPress: () => navigateToVerificationSteps(navigation),
      },
    ],
  );
  return false;
}

/** Identity first, then Get Paid (if needed), then list wizard — matches legacy order. */
export async function startListRideFlow(navigation, { canUseListingsHub } = {}) {
  const ok = await ensureIdentityVerified(navigation, {
    alertTitle: 'Verify your account to list',
  });
  if (!ok) return false;
  if (!canUseListingsHub) {
    navigateRootStack(navigation, 'GetPaidStack');
  } else {
    navigateRootStack(navigation, 'ListRideStack');
  }
  return true;
}
