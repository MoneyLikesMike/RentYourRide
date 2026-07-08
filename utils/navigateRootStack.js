/**
 * Open vehicle detail the same way as from search: Home stack holds VehicleDetailScreen.
 * From Profile (or any tab child), switch to Home tab and push detail with listing params.
 */
export function navigateToVehicleDetail(navigation, listing) {
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

/** Open UserProfileScreen from any tab (e.g. Rental Manager booking details). */
export function navigateToUserProfile(navigation, params) {
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

/** Use from root modals/stacks (e.g. ListRideStack) where `getParent` is not the tab bar. */
export function navigateToVehicleDetailFromRoot(navigation, listing) {
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
