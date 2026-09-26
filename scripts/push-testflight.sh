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

if ! security find-identity -v -p codesigning | grep -q "Apple Development\|Apple Distribution"; then
  echo "ERROR: No Apple Development/Distribution certificate in Keychain."
  exit 1
fi

# Allow callers to override .env (e.g. live Stripe for a one-off production upload).
PRESERVED_STRIPE_PK="${EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}"
PRESERVED_API_URL="${EXPO_PUBLIC_API_URL:-}"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
else
  echo "WARNING: .env missing — Stripe key may not be baked into the build."
fi

if [[ -n "$PRESERVED_STRIPE_PK" ]]; then
  export EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY="$PRESERVED_STRIPE_PK"
fi
if [[ -n "$PRESERVED_API_URL" ]]; then
  export EXPO_PUBLIC_API_URL="$PRESERVED_API_URL"
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

# ---------------------------------------------------------------------------
# App Store Connect API key (required for reliable CLI upload on Xcode 26+).
# GUI Apple Accounts are no longer visible to xcodebuild ("Failed to Use Accounts").
#
# Create once: https://appstoreconnect.apple.com/access/integrations/api
#   Role: Admin (or App Manager with Certificates access)
#   Download AuthKey_<KEY_ID>.p8 (only once)
#
# Then either:
#   mkdir -p ~/.appstoreconnect/private_keys
#   mv ~/Downloads/AuthKey_XXXXXXXXXX.p8 ~/.appstoreconnect/private_keys/
#   # and in .env:
#   ASC_KEY_ID=XXXXXXXXXX
#   ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# or set ASC_API_KEY_PATH / ASC_KEY_ID / ASC_ISSUER_ID explicitly.
# ---------------------------------------------------------------------------
resolve_asc_auth() {
  ASC_KEY_ID="${ASC_KEY_ID:-${APP_STORE_CONNECT_KEY_ID:-${APP_STORE_CONNECT_API_KEY_ID:-}}}"
  ASC_ISSUER_ID="${ASC_ISSUER_ID:-${APP_STORE_CONNECT_ISSUER_ID:-${APP_STORE_CONNECT_API_ISSUER_ID:-}}}"
  ASC_API_KEY_PATH="${ASC_API_KEY_PATH:-${APP_STORE_CONNECT_API_KEY_PATH:-}}"

  if [[ -z "$ASC_API_KEY_PATH" && -n "$ASC_KEY_ID" ]]; then
    for candidate in \
      "$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8" \
      "$ROOT/ios/private_keys/AuthKey_${ASC_KEY_ID}.p8" \
      "$ROOT/AuthKey_${ASC_KEY_ID}.p8"
    do
      if [[ -f "$candidate" ]]; then
        ASC_API_KEY_PATH="$candidate"
        break
      fi
    done
  fi

  if [[ -z "$ASC_API_KEY_PATH" ]]; then
    # Auto-pick a single AuthKey_*.p8 if exactly one exists
    local matches=()
    while IFS= read -r f; do
      [[ -n "$f" ]] && matches+=("$f")
    done < <(find "$HOME/.appstoreconnect/private_keys" "$ROOT/ios/private_keys" \
      -maxdepth 1 -name 'AuthKey_*.p8' 2>/dev/null | sort)
    if [[ ${#matches[@]} -eq 1 ]]; then
      ASC_API_KEY_PATH="${matches[0]}"
      if [[ -z "$ASC_KEY_ID" ]]; then
        ASC_KEY_ID="$(basename "$ASC_API_KEY_PATH" | sed -E 's/^AuthKey_([^.]+)\.p8$/\1/')"
      fi
    fi
  fi

  AUTH_ARGS=()
  if [[ -n "$ASC_API_KEY_PATH" && -n "$ASC_KEY_ID" && -n "$ASC_ISSUER_ID" ]]; then
    if [[ ! -f "$ASC_API_KEY_PATH" ]]; then
      echo "ERROR: ASC API key file not found: $ASC_API_KEY_PATH"
      exit 1
    fi
    echo "==> App Store Connect API key: $ASC_KEY_ID"
    AUTH_ARGS=(
      -authenticationKeyPath "$ASC_API_KEY_PATH"
      -authenticationKeyID "$ASC_KEY_ID"
      -authenticationKeyIssuerID "$ASC_ISSUER_ID"
    )
  else
    echo "==> No ASC API key configured — falling back to Xcode Accounts (often broken on Xcode 26 CLI)."
    echo "    To restore one-command uploads, create an API key and set ASC_KEY_ID + ASC_ISSUER_ID in .env,"
    echo "    then put AuthKey_<ASC_KEY_ID>.p8 in ~/.appstoreconnect/private_keys/"
  fi
}

resolve_asc_auth

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
    "${AUTH_ARGS[@]+"${AUTH_ARGS[@]}"}" \
    DEVELOPMENT_TEAM="$TEAM_ID" \
    archive
else
  echo "==> Reusing existing archive at $ARCHIVE_PATH"
fi

echo ""
echo "==> Exporting & uploading to App Store Connect..."
rm -rf "$EXPORT_PATH"
mkdir -p "$EXPORT_PATH"

set +e
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$EXPORT_PLIST" \
  -allowProvisioningUpdates \
  "${AUTH_ARGS[@]+"${AUTH_ARGS[@]}"}"
EXPORT_STATUS=$?
set -e

if [[ $EXPORT_STATUS -ne 0 ]]; then
  if [[ ${#AUTH_ARGS[@]} -eq 0 ]]; then
    echo ""
    echo "ERROR: Upload failed (likely 'Failed to Use Accounts')."
    echo "Xcode GUI can be signed in while the CLI still cannot see that session."
    echo ""
    echo "Fix (one-time):"
    echo "  1) Open https://appstoreconnect.apple.com/access/integrations/api"
    echo "  2) Create an API key (Admin) → download AuthKey_<KEY_ID>.p8"
    echo "  3) mkdir -p ~/.appstoreconnect/private_keys && mv ~/Downloads/AuthKey_*.p8 ~/.appstoreconnect/private_keys/"
    echo "  4) Add to .env:"
    echo "       ASC_KEY_ID=<KEY_ID>"
    echo "       ASC_ISSUER_ID=<Issuer ID from that page>"
    echo "  5) Re-run: npm run ios:testflight:upload"
  fi
  exit "$EXPORT_STATUS"
fi

echo ""
echo "==> Done. Check App Store Connect → TestFlight for processing status."
echo "    Archive: $ARCHIVE_PATH"
echo "    Export:  $EXPORT_PATH"
