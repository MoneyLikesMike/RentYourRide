/**
 * Prefer pushing on the nearest stack that owns the screen so Back returns to
 * the caller (chat / trips / favourites / checkout) instead of switching tabs.
 */
function navigatorHasScreen(navigation, screenName) {
  try {
    const names = navigation?.getState?.()?.routeNames;
    return Array.isArray(names) && names.includes(screenName);
  } catch {
    return false;
  }
}

function navigateInNearestStack(navigation, screenName, params) {
  let nav = navigation;
  for (let depth = 0; depth < 5 && nav; depth += 1) {
    if (navigatorHasScreen(nav, screenName)) {
      if (params !== undefined) {
        nav.navigate(screenName, params);
      } else {
        nav.navigate(screenName);
      }
      return true;
    }
    nav = nav.getParent?.();
  }
  return false;
}

/** Prefer pushing on the nearest stack that owns `screenName` (keeps Back correct). */
export { navigateInNearestStack };

export function navigateToVehicleDetail(navigation, listing) {
  if (navigateInNearestStack(navigation, 'VehicleDetailScreen', { listing })) {
    return;
  }
  const tabNav = navigation.getParent?.();
  if (tabNav?.navigate) {
    tabNav.navigate('HomeTab', {
      screen: 'VehicleDetailScreen',
      params: { listing },
    });
    return;
  }
  navigation.navigate('VehicleDetailScreen', { listing });
}

/** Open UserProfileScreen; prefer current stack so Back returns to the caller. */
export function navigateToUserProfile(navigation, params) {
  if (navigateInNearestStack(navigation, 'UserProfileScreen', params)) {
    return;
  }
  const tabNav = navigation.getParent?.();
  if (tabNav?.navigate) {
    tabNav.navigate('ProfileScreen', {
      screen: 'UserProfileScreen',
      params,
    });
    return;
  }
  navigation.navigate('UserProfileScreen', params);
}

/** Open Add Card from checkout (or elsewhere) without leaving the current stack. */
export function navigateToAddCard(navigation, params) {
  if (navigateInNearestStack(navigation, 'AddCardScreen', params)) {
    return;
  }
  const tabNav = navigation.getParent?.();
  if (tabNav?.navigate) {
    tabNav.navigate('ProfileScreen', {
      screen: 'AddCardScreen',
      params,
    });
    return;
  }
  navigation.navigate('AddCardScreen', params);
}

/** Use from root modals/stacks (e.g. ListRideStack) where `getParent` is not the tab bar. */
export function navigateToVehicleDetailFromRoot(navigation, listing) {
  if (navigateInNearestStack(navigation, 'VehicleDetailScreen', { listing })) {
    return;
  }
  const root = navigation.getParent?.();
  if (root?.navigate) {
    root.navigate('MainTabs', {
      screen: 'HomeTab',
      params: { screen: 'VehicleDetailScreen', params: { listing } },
    });
    return;
  }
  navigateToVehicleDetail(navigation, listing);
}

/** After saving on Edit hub (ListRideStack), return to Profile → Listings. */
export function navigateToListingsFromRoot(navigation) {
  const root = navigation.getParent?.();
  if (root?.navigate) {
    root.navigate('MainTabs', {
      screen: 'ProfileScreen',
      params: { screen: 'ListingsScreen', params: {} },
    });
    return;
  }
  navigation.goBack?.();
}

/**
 * Navigate to a screen on the root stack (e.g. GetPaidStack, ListRideStack) from a nested navigator (e.g. Profile stack).
 */
export function navigateRootStack(navigation, screenName, params) {
  const tabNav = navigation.getParent?.();
  const rootNav = tabNav?.getParent?.();
  if (rootNav?.navigate) {
    if (params !== undefined) {
      rootNav.navigate(screenName, params);
    } else {
      rootNav.navigate(screenName);
    }
    return;
  }
  if (params !== undefined) {
    navigation.navigate(screenName, params);
  } else {
    navigation.navigate(screenName);
  }
}
