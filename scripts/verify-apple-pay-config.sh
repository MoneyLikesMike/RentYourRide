#!/usr/bin/env bash
# Verify local Apple Pay config matches merchant.com.rentyourride.ios
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MERCHANT_ID="merchant.com.rentyourride.ios"
BUNDLE_ID="com.rentyourride.ios"
OK=0
WARN=0

pass() { echo "  ✓ $*"; OK=$((OK + 1)); }
fail() { echo "  ✗ $*"; WARN=$((WARN + 1)); }

FLAG_ON=0
if [[ -f "${ROOT}/.env" ]] && grep -qE '^EXPO_PUBLIC_APPLE_PAY_ENABLED=true' "${ROOT}/.env" 2>/dev/null; then
  FLAG_ON=1
fi

echo "Apple Pay local config (${MERCHANT_ID}) — flag ${FLAG_ON:+ON}${FLAG_ON:-OFF}"
echo ""

if grep -q "merchantIdentifier" "${ROOT}/App.js" 2>/dev/null && grep -q "isApplePayConfigured()" "${ROOT}/App.js" 2>/dev/null; then
  fail "App.js should not gate merchantIdentifier at boot (lazy init in useApplePayCheckout)"
elif grep -q "publishableKey={stripeKey}" "${ROOT}/App.js" 2>/dev/null; then
  pass "App.js StripeProvider omits merchantIdentifier at boot"
else
  fail "StripeProvider missing or unexpected in App.js"
fi

if grep -q "initStripe" "${ROOT}/hooks/useApplePayCheckout.js" 2>/dev/null; then
  pass "useApplePayCheckout lazily calls initStripe"
else
  fail "Missing lazy initStripe in useApplePayCheckout"
fi

if grep -q "EXPO_PUBLIC_APPLE_PAY_ENABLED" "${ROOT}/constants/stripe.js" 2>/dev/null; then
  pass "constants/stripe.js reads EXPO_PUBLIC_APPLE_PAY_ENABLED"
else
  fail "isApplePayConfigured missing env flag"
fi

if [[ "${FLAG_ON}" -eq 1 ]]; then
  if grep -q "${MERCHANT_ID}" "${ROOT}/ios/RentYourRide/RentYourRide.entitlements" 2>/dev/null \
    || grep -q "applePayEnabled" "${ROOT}/app.config.js" 2>/dev/null; then
    pass "Apple Pay enabled for this build (entitlements via app.config when flag on)"
  else
    fail "Flag on but merchant ID / app.config Apple Pay wiring missing"
  fi
else
  if grep -q "<key>com.apple.developer.in-app-payments</key>" "${ROOT}/ios/RentYourRide/RentYourRide.entitlements" 2>/dev/null; then
    fail "Entitlements still declare PassKit while EXPO_PUBLIC_APPLE_PAY_ENABLED is not true (Guideline 2.1 risk)"
  else
    pass "Entitlements omit PassKit while Apple Pay flag is OFF"
  fi
fi

if grep -q "PRODUCT_BUNDLE_IDENTIFIER = ${BUNDLE_ID}" "${ROOT}/ios/RentYourRide.xcodeproj/project.pbxproj" 2>/dev/null; then
  pass "Xcode bundle ID is ${BUNDLE_ID}"
else
  fail "Xcode bundle ID does not match ${BUNDLE_ID}"
fi

if [[ -f "${ROOT}/.env" ]] && grep -q "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_" "${ROOT}/.env" 2>/dev/null; then
  pass ".env has Stripe publishable key"
else
  fail "Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in .env for the app build"
fi

echo ""
if [[ "${WARN}" -eq 0 ]]; then
  echo "Local app config looks ready."
  echo ""
  echo "Still required in Apple Developer + Stripe (TEST then live):"
  echo "  1. Register Merchant ID: ${MERCHANT_ID}"
  echo "  2. Enable Apple Pay on App ID: ${BUNDLE_ID}"
  echo "  3. Stripe → iOS certificates → CSR → Apple payment cert → upload (test + live)"
  echo "  4. Set EXPO_PUBLIC_APPLE_PAY_ENABLED=true only for builds that show Apple Pay"
  echo ""
  echo "Links:"
  echo "  Apple Merchant ID:  https://developer.apple.com/account/resources/identifiers/add/merchant"
  echo "  Stripe iOS (test):  https://dashboard.stripe.com/test/settings/ios_certificates"
  echo "  Stripe iOS (live):  https://dashboard.stripe.com/settings/ios_certificates"
  exit 0
fi

echo "${WARN} issue(s) found — fix before shipping Apple Pay."
exit 1
