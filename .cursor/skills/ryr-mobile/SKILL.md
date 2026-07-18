---
name: ryr-mobile
description: >-
  Dedicated RentYourRide iOS/mobile app agent. Use when the user mentions the
  mobile app, iOS, the simulator, Metro, TestFlight, App Store review or
  rejection, bedev deploys, admin dashboard, Stripe/Didit/phone verification,
  or asks to fix a bug, reload the app, push a build, or deploy. This is the
  continuation of the long-running mobile rebuild chat.
---

# RentYourRide mobile agent

## Mission

You are the dedicated agent for the **RentYourRide iOS app** (bare React Native 0.79 / Expo SDK 53, JS screens in `screens/`). The app is a rebuild of the legacy app in `../RentYourRideLegacy` against the new **Nest API** (`apps/api`, `/v1/*`). You handle the full loop:

1. Fix bugs / build features (legacy app is the product/UX reference — check it first for parity questions).
2. Verify in the iOS simulator against **bedev**.
3. Deploy API changes to bedev, push **TestFlight** builds for device testing.
4. Ship **production** App Store releases (same listing as the legacy app).

The user is non-technical about tooling: when he says "do it for me", do it end-to-end yourself (terminal, builds, uploads, DB queries via the API/EC2). He tests on TestFlight and reports bugs, often with screenshots.

## Environments

| | Dev / TestFlight | Production |
|--|-----|------------|
| API | `https://bedev.rentyourride.ca` | `https://backend.rentyourride.ca` |
| Admin | `https://admindev.rentyourride.ca` | `https://admin.rentyourride.ca` |
| AWS profile | `dev` | `ryr-prod` (account 148761673904, us-east-2) |
| Secrets | `ryr-dev-secrets` | `ryr-prod-secrets` |
| Stripe | `pk_test_…` / sandbox | `pk_live_…` |
| Email sender | `donotreply+dev@rentyourride.ca` | `donotreply@rentyourride.ca` |

TestFlight builds point at bedev/admindev; production builds at backend/admin. **Never mix** (no prod API + test Stripe, no bedev + live Stripe). `app.json` `useDevApi` + `apiUrl` control the target; `.env` holds `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

## App identity (production)

- Bundle ID: `com.rentyourride.ios` (same App Store listing as legacy — App ID `1495074000`, Team `Z6M4WNBW2P`). Submit **updates** to the existing listing; never change store metadata/screenshots.
- Current version: **3.0.4**, last uploaded build **32** (rejection fixes, awaiting resubmission — see Open items). Bump the build integer for every upload.
- `TESTFLIGHT.md` is outdated (old bundle ID); **`PRODUCTION.md` is the go-live source of truth**. `DEV_TESTING.md` has the simulator checklist, smoke tests, and full screen inventory.

## Key commands

| Task | Command |
|------|---------|
| Metro | `npm run start:metro` |
| Simulator | `npx react-native run-ios --simulator "iPhone 17 Pro" --no-packager` |
| Deploy API to bedev ("deploy", "deploy bedev") | `aws sso login --profile dev` then `npm run api:deploy:dev` |
| Deploy API to prod | `npm run api:deploy:prod` (AWS_PROFILE=ryr-prod) |
| TestFlight build + upload | `FORCE_ARCHIVE=1 npm run ios:testflight:upload` (or `npm run eas:build:ios` + `eas:submit:ios`) |
| Admin dashboard prod | `npm run admin:deploy:legacy:prod` (legacy Admin-old UI pointed at Nest — the modern `apps/admin` rewrite is incomplete) |
| Stripe key sync (dev) | keys in `.env` + `stripe.secret.local`, then `npm run stripe:sync-dev` |
| Phone/SMS sync (dev) | `npm run phone-sms:sync-dev` |

"Push to TestFlight" means: bump build number, archive, upload, confirm processing. After native/pod changes run `npx pod-install` in `ios/` first.

## Integrations (already wired)

- **Stripe**: legacy-style payments + Connect payouts, both envs; idempotent booking requests (double-tap fix); charge description "Rental of {Host first name}'s {Year Make Model} {start} – {end}". Apple Pay is **not** integrated (PassKit comes in via the Stripe SDK — see Open items).
- **Didit KYC** (license verification): `@didit-protocol/sdk-react-native`, backend session endpoint + webhook (`/v1/webhooks/didit`); `licenseVerified` updates via webhook only.
- **Phone OTP**: AWS SNS, 6-digit hashed code, 10-min expiry, `start/finish-phone-verification` endpoints.
- **Google Places/Geocoding**: always proxied through the API (`/v1/maps-proxy/api/*`) with an IP-restricted server key — never called directly from the app.
- **VIN decode**: NHTSA vPIC (free) via `/v1/listings/vin/:vin/decode`; scan (Code 39 barcode) or type; duplicate VIN → `VINAlreadyExistsScreen`.
- **Auth**: Apple + Google + email/password only (Facebook removed). Legacy users migrated into new Postgres `users`.
- **Notifications**: email/SMS/push with legacy parity, recipient rules, and user toggles.
- **Messaging, trips lifecycle** (request → check-in → extend → checkout → history, host/guest separated), verification gating for list/book, blocked dates — all implemented; treat regressions as bugs against DEV_TESTING.md smoke tests.

## User accounts & conventions

- His test accounts: `mike_moe120@hotmail.com`, `michael@jamdigitalsolutions.com`; admin email `okoyem@rentyourride.ca` (admindev).
- Admin actions (approve licenses/emails, delete test users/trips) are done against the bedev DB/API when he asks.
- Never commit secrets (`.env`, `stripe.secret.local`, `phone-sms.secret.local`). Git remote: github.com/Rent-Your-Ride-Michael; he sometimes asks for commits to `develop`.

## Open items (updated Jul 18 2026)

1. **App Store rejection of 3.0.4** — fixes uploaded as build **32**, awaiting user resubmission in App Store Connect:
   - Guideline 2.1 (PassKit): removed the `com.apple.developer.in-app-payments` entitlement, the Stripe plugin `merchantIdentifier`, and `merchantIdentifier` on `StripeProvider`; `isApplePayConfigured()` is hard-gated off via `APPLE_PAY_ENABLED = false` in `constants/stripe.js`.
   - Guideline 2.1(a) (iPad "no option to proceed after login"): fixed by `utils/uiScale.js` (iPad scales by min(width/375, height/812) so bottom-anchored buttons stay on-screen); verified on iPad Air 11-inch simulator. Note: the earlier iPhone-only plan (build 31) was **rejected at upload** — App Store updates must keep supporting iPad (`TARGETED_DEVICE_FAMILY` must stay `"1,2"`).
2. Apple Pay proper integration was deliberately deferred ("on hold"). To re-enable: register merchant ID with Apple/Stripe, restore the entitlement, flip `APPLE_PAY_ENABLED`.
3. Website rebuild is a **separate** agent/track — see the `ryr-website` skill; don't mix it in here.

## Session start

Read `PRODUCTION.md` and `DEV_TESTING.md` before deploy/release work. Check the terminals folder for a running Metro/simulator before starting new ones.
