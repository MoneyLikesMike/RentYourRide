import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/** @type {{ name: string, params?: object } | null} */
let pendingReturnRoute = null;

function getDeepestRoute(state) {
  if (!state) return null;
  const route = state.routes?.[state.index ?? 0];
  if (!route) return null;
  if (route.state) return getDeepestRoute(route.state);
  return { name: route.name, params: route.params };
}

export function resetToWelcome() {
  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  }
}

/**
 * Capture the current screen and reset to Auth (login) so the user can re-auth
 * and return to that screen afterward.
 */
export function navigateToSignInPreservingReturn() {
  if (navigationRef.isReady()) {
    const current = getDeepestRoute(navigationRef.getRootState());
    if (
      current?.name &&
      current.name !== 'Welcome' &&
      current.name !== 'AuthScreen' &&
      current.name !== 'LoginScreen' &&
      current.name !== 'SignUpScreen'
    ) {
      pendingReturnRoute = current;
    }
    navigationRef.reset({
      index: 0,
      routes: [{ name: 'AuthScreen', params: { tab: 'login' } }],
    });
    return;
  }
  pendingReturnRoute = null;
}

/** After a successful sign-in: restore the prior route when present. */
export function navigateAfterSuccessfulSignIn() {
  const ret = pendingReturnRoute;
  pendingReturnRoute = null;
  if (ret?.name && navigationRef.isReady()) {
    try {
      navigationRef.reset({
        index: 1,
        routes: [{ name: 'MainTabs' }, { name: ret.name, params: ret.params }],
      });
      return;
    } catch {
      // Fall through to MainTabs if the return route is not on the root stack.
    }
  }
  resetToMainTabs();
}

export function resetToMainTabs() {
  const go = () => {
    if (!navigationRef.isReady()) return false;
    navigationRef.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
    return true;
  };
  if (go()) return;
  // Auth may finish before NavigationContainer is ready (common on cold start).
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (go() || attempts >= 20) clearInterval(timer);
  }, 50);
}
