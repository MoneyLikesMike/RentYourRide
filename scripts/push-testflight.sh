#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SCHEME="RentYourRide"
WORKSPACE="ios/RentYourRide.xcworkspace"
ARCHIVE_PATH="ios/build/RentYourRide.xcarchive"
EXPORT_PATH="ios/build/export"
EXPORT_PLIST="ios/ExportOptions.plist"
TEAM_ID="Z6M4WNBW2P"

echo "==> RentYourRide TestFlight upload"
echo ""

if ! security find-identity -v -p codesigning | grep -q "Apple Development"; then
  echo "ERROR: No Apple Development certificate in Keychain."
  exit 1
fi

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
else
  echo "WARNING: .env missing — Stripe key may not be baked into the build."
fi

# Optional: RYR_API_ENV=production forces production API + requires live Stripe key.
if [[ "${RYR_API_ENV:-}" == "production" ]]; then
  export EXPO_PUBLIC_API_URL="https://backend.rentyourride.ca"
  echo "==> Production API: ${EXPO_PUBLIC_API_URL}"
  PK="${EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}"
  if [[ -z "${PK}" ]]; then
    echo "ERROR: Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_… for a production App Store build."
    exit 1
  fi
  if [[ "${PK}" == pk_test_* ]]; then
    echo "ERROR: Production builds require pk_live_… (found pk_test_…). Update .env or export the live publishable key for this command only."
    exit 1
  fi
  if [[ "${PK}" != pk_live_* ]]; then
    echo "ERROR: EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_live_ for production."
    exit 1
  fi
  echo "==> Stripe: live publishable key configured"
fi

if [[ ! -d "$ARCHIVE_PATH" ]] || [[ "${FORCE_ARCHIVE:-}" == "1" ]]; then
  rm -rf "$ARCHIVE_PATH"
  echo "==> Archiving Release build..."
  xcodebuild \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath "$ARCHIVE_PATH" \
    -allowProvisioningUpdates \
    DEVELOPMENT_TEAM="$TEAM_ID" \
    archive
else
  echo "==> Reusing existing archive at $ARCHIVE_PATH"
fi

echo ""
echo "==> Exporting & uploading to App Store Connect..."
rm -rf "$EXPORT_PATH"
mkdir -p "$EXPORT_PATH"

xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$EXPORT_PLIST" \
  -allowProvisioningUpdates

echo ""
echo "==> Done. Check App Store Connect → TestFlight for processing status."
echo "    Archive: $ARCHIVE_PATH"
echo "    Export:  $EXPORT_PATH"
