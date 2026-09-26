/**
 * After saving a new payment method from checkout, return to the previous screen
 * (usually BookingCheckout on the same stack). Falls back to Home tab if needed.
 *
 * Finds the bottom-tab navigator (the one whose state includes "HomeTab"). Using a fixed
 * getParent() chain is brittle: one level too far hits the root stack, which only has
 * "MainTabs" and cannot handle NAVIGATE { name: "HomeTab" }.
 */
function navigateToHomeTab(navigation) {
  let nav = navigation;
  for (let i = 0; i < 8 && nav; i += 1) {
    const names = nav.getState?.()?.routeNames;
    if (Array.isArray(names) && names.includes('HomeTab')) {
      nav.navigate('HomeTab');
      return true;
    }
    nav = nav.getParent?.();
  }
  return false;
}

export function navigateAfterPaymentMethodSaved(navigation, { returnAfterPayment, isEdit }) {
  if (returnAfterPayment && !isEdit) {
    if (typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    if (navigateToHomeTab(navigation)) {
      return;
    }
  }
  navigation.navigate('PaymentInformationScreen');
}
