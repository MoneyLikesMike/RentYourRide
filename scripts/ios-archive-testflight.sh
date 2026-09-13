#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/ios"

SCHEME="RentYourRide"
WORKSPACE="RentYourRide.xcworkspace"
ARCHIVE_PATH="$ROOT/ios/build/RentYourRide.xcarchive"
EXPORT_PATH="$ROOT/ios/build/export"

echo "==> Archiving $SCHEME (Release)..."
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  archive

echo ""
echo "Archive created: $ARCHIVE_PATH"
echo ""
echo "Next in Xcode:"
echo "  1. Window → Organizer"
echo "  2. Select the archive → Distribute App"
echo "  3. App Store Connect → Upload"
echo ""
echo "Or export IPA manually:"
echo "  xcodebuild -exportArchive -archivePath \"$ARCHIVE_PATH\" -exportPath \"$EXPORT_PATH\" -exportOptionsPlist ExportOptions.plist"
