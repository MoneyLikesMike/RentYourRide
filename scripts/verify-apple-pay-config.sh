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

echo "Apple Pay local config (${MERCHANT_ID})"
echo ""

if grep -q "${MERCHANT_ID}" "${ROOT}/ios/RentYourRide/RentYourRide.entitlements" 2>/dev/null; then
  pass "iOS entitlements include merchant ID"
else
  fail "Missing merchant ID in ios/RentYourRide/RentYourRide.entitlements"
fi

if grep -q "${MERCHANT_ID}" "${ROOT}/app.json" 2>/dev/null; then
  pass "app.json Stripe plugin references merchant ID"
else
  fail "Missing merchant ID in app.json @stripe/stripe-react-native plugin"
fi

if grep -q "merchantIdentifier" "${ROOT}/App.js" 2>/dev/null; then
  pass "App.js passes merchantIdentifier to StripeProvider"
else
  fail "StripeProvider missing merchantIdentifier in App.js"
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
  echo "Still required in Apple Developer + Stripe (one-time):"
  echo "  1. Register Merchant ID: ${MERCHANT_ID}"
  echo "  2. Enable Apple Pay on App ID: ${BUNDLE_ID}"
  echo "  3. Stripe → iOS certificates → CSR → Apple payment cert → upload to Stripe"
  echo ""
  echo "Links:"
  echo "  Apple Merchant ID:  https://developer.apple.com/account/resources/identifiers/add/merchant"
  echo "  Apple App IDs:      https://developer.apple.com/account/resources/identifiers/list"
  echo "  Stripe iOS (live):  https://dashboard.stripe.com/settings/ios_certificates"
  echo "  Stripe iOS (test):  https://dashboard.stripe.com/test/settings/ios_certificates"
  exit 0
fi

echo "${WARN} issue(s) found — fix before shipping Apple Pay."
exit 1
