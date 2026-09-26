import { Alert } from 'react-native';
import { getMe } from '../services/usersApi';
import { buildAccountSetupSteps } from './accountSetupSteps';
import { navigateRootStack, navigateInNearestStack } from './navigateRootStack';

/** @param {object | null | undefined} me */
export function isIdentityVerificationComplete(me) {
  return buildAccountSetupSteps(me).allDone;
}

function getRootNavigator(navigation) {
  let nav = navigation;
  let parent = navigation?.getParent?.();
  while (parent) {
    nav = parent;
    parent = parent.getParent?.();
  }
  return nav;
}

function routeNamesOf(nav) {
  try {
    return nav?.getState?.()?.routeNames || [];
  } catch (_) {
    return [];
  }
}

/** Open VerificationStepsScreen on the current stack when possible (Back returns here). */
export function navigateToVerificationSteps(navigation) {
  if (navigateInNearestStack(navigation, 'VerificationStepsScreen')) {
    return;
  }
  const root = getRootNavigator(navigation);
  if (routeNamesOf(root).includes('MainTabs')) {
    root.navigate('MainTabs', {
      screen: 'ProfileScreen',
      params: { screen: 'VerificationStepsScreen' },
    });
    return;
  }
  const tabNav = navigation.getParent?.();
  if (routeNamesOf(tabNav).includes('ProfileScreen')) {
    tabNav.navigate('ProfileScreen', { screen: 'VerificationStepsScreen' });
    return;
  }
  navigation.navigate?.('VerificationStepsScreen');
}

/** Open Edit Profile on the current stack when possible (Back returns here). */
export function navigateToEditProfile(navigation) {
  if (navigateInNearestStack(navigation, 'EditProfileScreen')) {
    return;
  }
  const root = getRootNavigator(navigation);
  if (routeNamesOf(root).includes('MainTabs')) {
    root.navigate('MainTabs', {
      screen: 'ProfileScreen',
      params: { screen: 'EditProfileScreen' },
    });
    return;
  }
  const tabNav = navigation.getParent?.();
  if (routeNamesOf(tabNav).includes('ProfileScreen')) {
    tabNav.navigate('ProfileScreen', { screen: 'EditProfileScreen' });
    return;
  }
  navigation.navigate?.('EditProfileScreen');
}

/**
 * Ensure the signed-in user has completed email + phone + license verification.
 * @returns {Promise<boolean>} true if allowed to continue
 */
export async function ensureIdentityVerified(navigation, options = {}) {
  // Simulator/dev: Didit + phone OTP block listing/booking work; skip gates locally.
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;

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

/**
 * Hosts must have a public profile photo before listing a vehicle.
 * @returns {Promise<boolean>}
 */
export async function ensureHostProfilePhoto(navigation, options = {}) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;

  const { alertTitle = 'Profile photo required' } = options;
  try {
    const me = await getMe();
    if (me?.avatarUrl && String(me.avatarUrl).trim()) return true;
  } catch (_) {
    Alert.alert(alertTitle, 'Sign in and add a profile photo before listing a vehicle.');
    return false;
  }

  Alert.alert(
    alertTitle,
    'Add a profile photo before you can list a vehicle. Guests need to see who they are booking with.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Add photo',
        onPress: () => navigateToEditProfile(navigation),
      },
    ],
  );
  return false;
}

/** Identity first, then profile photo, then Get Paid (if needed), then list wizard. */
export async function startListRideFlow(navigation, { canUseListingsHub } = {}) {
  const ok = await ensureIdentityVerified(navigation, {
    alertTitle: 'Verify your account to list',
  });
  if (!ok) return false;
  if (!(await ensureHostProfilePhoto(navigation))) return false;
  if (!canUseListingsHub) {
    navigateRootStack(navigation, 'GetPaidStack');
  } else {
    navigateRootStack(navigation, 'ListRideStack');
  }
  return true;
}
