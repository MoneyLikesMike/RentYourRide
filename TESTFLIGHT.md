# TestFlight upload guide

## Before you start

| Item | Current value |
|------|----------------|
| App name | RentYourRide |
| Bundle ID | `com.micahelokoye.rentyourride` |
| Version | 1.0.0 (build 1) |
| Beta API | `https://bedev.rentyourride.ca` |
| Legacy live app bundle ID | `com.rentyourride.ios` (different app listing) |

**Important:** This bundle ID is **not** the same as the legacy App Store app. TestFlight will create a **new** App Store Connect app unless you change the bundle ID to match the live app.

You need:
- Apple Developer Program membership
- `.env` with `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` (and optional Google Places key)
- App Store Connect access for your team

---

## Option A — EAS Build (recommended)

### 1. Install EAS CLI and log in

```bash
npm install -g eas-cli
cd /Users/michaelokoye/RentYourRide
eas login
eas build:configure
```

### 2. Create the App Store Connect app (one time)

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → **Apps** → **+**
2. New App → iOS
3. Name: **RentYourRide** (or “RentYourRide Beta”)
4. Bundle ID: **com.micahelokoye.rentyourride**
5. SKU: e.g. `rentyourride-modern-ios`

### 3. Build for TestFlight

```bash
cd /Users/michaelokoye/RentYourRide
eas build --platform ios --profile production
```

EAS will prompt for Apple credentials and create distribution certs/profiles if needed.

### 4. Submit to TestFlight

```bash
eas submit --platform ios --latest --profile production
```

Or upload the `.ipa` from the EAS build page in App Store Connect.

### 5. Add testers

App Store Connect → your app → **TestFlight** → Internal Testing → add testers → enable the build.

---

## Option B — Xcode Archive (local)

### 1. Open the workspace

```bash
open ios/RentYourRide.xcworkspace
```

### 2. Signing

1. Select **RentYourRide** target → **Signing & Capabilities**
2. Team: your Apple Developer team
3. Bundle Identifier: `com.micahelokoye.rentyourride`
4. Enable **Automatically manage signing**

Xcode will create an **Apple Distribution** certificate if you don’t have one.

### 3. Archive

1. Destination: **Any iOS Device (arm64)** (not a simulator)
2. **Product → Archive**
3. When done: **Distribute App → App Store Connect → Upload**

Or run:

```bash
npm run ios:archive
```

then use **Organizer** to upload.

---

## After upload

1. Wait for App Store Connect processing (usually 5–30 minutes)
2. Answer **Export Compliance** if prompted (typically “No” for standard HTTPS-only apps)
3. Add internal testers in TestFlight
4. Install via TestFlight app on a physical iPhone

---

## Switching to production API later

Before public launch, set production API in `app.json` / EAS env:

```json
"useDevApi": false,
"apiUrl": "https://backend.rentyourride.ca"
```

Then bump `buildNumber` and ship a new build.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| White screen on TestFlight | Release build embeds JS automatically via Xcode “Bundle React Native code” phase |
| Stripe / Places missing | Ensure `.env` keys are set; EAS reads them at build time via `app.config.js` |
| “No accounts with App Store Connect access” | Use the Apple ID that owns the Developer account |
| Duplicate bundle ID | Register `com.micahelokoye.rentyourride` in Developer portal first |
