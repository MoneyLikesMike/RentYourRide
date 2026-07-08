# Dev testing checklist (simulator + bedev API)

## Prerequisites

1. **Metro** (keep running):
   ```bash
   npm run start:metro
   ```

2. **Optional `.env`** (copy from `.env.example`):
   - `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` — card save / Stripe UI
   - `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` — optional local-only fallback; TestFlight/dev builds proxy Places via bedev (`/v1/maps-proxy/api/*`) using the server Google key

3. **API**: App uses `https://bedev.rentyourride.ca` when `useDevApi: true` in `app.json`.

4. **Simulator**:
   ```bash
   npx react-native run-ios --simulator "iPhone 17 Pro" --no-packager
   ```

## Smoke tests

| # | Flow | Expected |
|---|------|----------|
| 1 | Sign up | Account created, lands in app |
| 2 | Log out / log in | Tokens refresh, profile loads |
| 3 | Forgot password | Request succeeds (check API logs for reset token in dev) |
| 4 | Home search | Type a city — Google suggestions appear; tap **Current location** fills address and searches |
| 5 | List a ride → publish | Host listing appears under Listings |
| 5b | List a ride → VIN type/scan | Year/make/model auto-filled from NHTSA; duplicate VIN shows error screen |
| 6 | Favorite a listing | Persists after reload |
| 7 | Book (dates → checkout) | Quote from API; booking created |
| 8 | Rental Manager | Pending / active lists from API |
| 9 | Contact info | Email/phone/address/license from `GET /v1/users/me` |
| 9b | Phone verification | Change phone → SMS via AWS SNS; enter 6-digit code (`POST /v1/auth/start-phone-verification`, `finish-phone-verification`) |
| 9c | License verification (Didit) | Account → Verification steps → License → consent → native Didit flow; webhook updates `licenseVerified` on bedev |
| 10 | Notifications toggles | Sync to `PATCH /v1/users/me/notification-settings` |
| 11 | Referrals | Code + balance from `GET /v1/referrals` |
| 12 | Get Paid | Connect onboarding link (mock URL if no Stripe on API) |

## Stripe (step 2)

1. Stripe Dashboard → **Developers → API keys** (Test mode).
2. Paste **`pk_test_…`** into `.env` as `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
3. Paste **`sk_test_…`** into `stripe.secret.local` as `STRIPE_SECRET_KEY`.
4. Run: `npm run stripe:sync-dev` (updates AWS + deploys API).
5. Run: `npm run start:metro` and reload the app.
6. Test: Payment Information → Add card → `4242 4242 4242 4242`.

## Google Places (location search)

The app **always** routes autocomplete through **bedev** (`GET /v1/maps-proxy/api/place/...`) on TestFlight/production. The mobile `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` cannot be used from the app for autocomplete (Google REST API does not send bundle ID — IP-restricted keys fail on device).

**Required one-time fix in Google Cloud Console** for the **server** key (`GOOGLE_GEOCODING_API_KEY` in AWS `ryr-dev-secrets`, prefix `AIzaSyBE0j…`):

1. [Enable Places API](https://console.cloud.google.com/apis/library/places-backend.googleapis.com) for the project.
2. [Credentials](https://console.cloud.google.com/google/maps-apis/credentials) → edit that key.
3. **API restrictions** → Restrict key → check **Places API** and **Geocoding API**.
4. **Application restrictions** → **IP addresses** → `3.142.247.74` (bedev EC2).

Verify (no app rebuild needed after this):

```bash
curl -s "https://bedev.rentyourride.ca/v1/maps-proxy/api/place/autocomplete/json?input=Winnipeg&language=en" | head -c 200
```

Expect `"status":"OK"`. Then install TestFlight **build 10+** (build 9 called Google from the phone and will keep failing).

Run `bash scripts/sync-google-places-dev.sh` for a printable checklist.

```bash
curl -s "https://bedev.rentyourride.ca/v1/maps-proxy/api/place/autocomplete/json?input=Winnipeg&language=en"
```

You want `"status":"OK"` with `predictions`. If you see `REQUEST_DENIED` or a 400, fix the key in [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials) for the key in AWS `ryr-dev-secrets` (`GOOGLE_GEOCODING_API_KEY` or `GOOGLE_PLACES_API_KEY`):

1. **API restrictions** → **Restrict key** → enable **Places API** and **Geocoding API** (both).
2. **Application restrictions** → **IP addresses** → include EC2 dev backend `3.142.247.74`.
3. In **APIs & Services → Library**, ensure **Places API** is **enabled** for the project (not only Geocoding).

After saving, wait ~1 minute and retry in TestFlight — **no app rebuild needed**.

## VIN decode (list a ride)

Vehicle info is decoded server-side via the **NHTSA vPIC API** (free, no API key):

- `GET /v1/listings/vin/:vin/decode` — checks duplicate VIN in our DB, then decodes year/make/model/body/style/trim/fuel/transmission plus `fieldOptions` (trim/style/transmission/fuel dropdown choices from NHTSA + Canadian vehicle specs)
- Upstream: `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{VIN}?format=json` and NHTSA Canadian Vehicle Specifications for trim/style variants
- Mobile: `TellUsAboutYourRideScreen1` auto-fills decoded fields and uses API `fieldOptions` for dropdowns
- **Cost:** $0 — US government open data (covers US/Canada-market vehicles since 1981)
- **Deploy:** `npm run api:deploy:dev` after pulling VIN decode changes

**Scan flow:** `ScanVINScreen` reads the **barcode** on the door-jamb VIN sticker (Code 39). If the barcode cannot be read, use **Type VIN instead**.

**Test VINs:** Any real 17-character VIN on a US/Canada vehicle (e.g. from your car’s door sticker). Duplicate test: use a VIN already on a published listing → `VINAlreadyExistsScreen`.

## Didit license verification (KYC)

End-to-end flow uses **Didit** for driver license verification (workflow: License Verification).

**Backend (bedev):**

- `POST /v1/verification/didit/session` — JWT auth; creates Didit session, returns `session_token` for the native SDK
- `POST /v1/webhooks/didit` — Didit webhook (register in Didit console: `https://bedev.rentyourride.ca/v1/webhooks/didit`, events `status.updated`)
- Secrets in AWS `ryr-dev-secrets`: `DIDIT_API_KEY`, `DIDIT_WEBHOOK_SECRET` (never commit)
- **Deploy:** `aws sso login --profile dev` then `npm run api:deploy:dev`

**Mobile:**

- `@didit-protocol/sdk-react-native` (native module — **not Expo Go**; requires TestFlight/dev build after `pod install`)
- Screen: Account → Verification steps → **License verification** → `LicenseVerificationScreen`
- SDK `onComplete` is UI-only; **`licenseVerified` updates via webhook**

**iOS rebuild:** After pulling Didit changes, run `npx pod-install` in `ios/` (or `npx expo prebuild`) and archive a new TestFlight build.

## Known gaps

- Email change UI — no API yet (shows placeholder).
- Phone OTP on **bedev** — set `PHONENUMBER` (E.164) in AWS `ryr-dev-secrets` for real SMS via SNS; deploy sets `SMS_EXPOSE_CODE=1` so TestFlight shows the code in an alert when SMS is not configured. Sync: `npm run phone-sms:sync-dev` then `npm run api:deploy:dev`.
- Messaging — stub screen.
- Production / App Store — not started.

---

## Screen inventory

All designed screens in the mobile app (`screens/`). Route names match React Navigation where applicable.

**Total:** 95 screen files · 4 modal overlays · 2 child screens embedded in `AuthScreen` · 4 overlays embedded in `ContactInformationScreen`

### Auth & onboarding (root stack)

| Screen | File | Notes |
|--------|------|-------|
| Welcome | `WelcomeScreen.js` | App entry / sign-in entry |
| Auth | `AuthScreen.js` | Tab container for login vs sign-up |
| Login | `LoginScreen.js` | Child of `AuthScreen` |
| Sign up | `SignUpScreen.js` | Child of `AuthScreen` |
| Forgot password | `ForgotPasswordScreen.js` | |
| Reset password | `ResetPasswordScreen.js` | |
| Terms & conditions | `TermsAndConditionsScreen.js` | Also reachable from Profile stack |
| Notification onboarding | `NotificationOnboardingScreen.js` | |

### Main tabs — Home (search & book)

| Screen | File |
|--------|------|
| Home | `HomeScreen.js` |
| Search results | `SearchResultsScreen.js` |
| Vehicle detail | `VehicleDetailScreen.js` |
| Booking checkout | `BookingCheckoutScreen.js` |
| Booking request confirmation | `BookingRequestConfirmationScreen.js` |
| Empty vehicle search | `EmptyVehicleSearchScreen.js` |
| Calendar (date picker) | `CalendarScreen.js` |

### Main tabs — Rental manager (guest & host trips)

| Screen | File | Role |
|--------|------|------|
| Rental manager hub | `RentalManagerScreen.js` | |
| Rental requests | `RentalRequestScreen.js` | Host |
| Active rentals | `ActiveRentalsScreen.js` | |
| Guest booking details | `GuestBookingDetailsScreen.js` | Guest |
| Host booking details | `HostBookingDetailsScreen.js` | Host |
| Guest check-in | `GuestCheckInScreen.js` | Guest |
| Host check-in | `HostCheckInScreen.js` | Host |
| Guest check-in reminder | `GuestCheckInReminderScreen.js` | Guest |
| Host check-in reminder | `HostCheckInReminderScreen.js` | Host |
| Check-in guidelines | `CheckInGuidelinesScreen.js` | |
| Guest rental agreement | `GuestRentalAgreementScreen.js` | Guest |
| Guest rental agreement sign | `GuestRentalAgreementSignScreen.js` | Guest |
| Host rental agreement | `HostRentalAgreementScreen.js` | Host |
| Host rental agreement sign | `HostRentalAgreementSignScreen.js` | Host |
| Rental agreements list | `RentalAgreementsScreen.js` | |
| Completed rental agreement | `CompletedRentalAgreementScreen.js` | |
| Guest checkout | `GuestCheckoutScreen.js` | Guest |
| Host checkout | `HostCheckoutScreen.js` | Host |
| Guest checkout trip complete | `GuestCheckoutTripCompleteScreen.js` | Guest |
| Host checkout trip complete | `HostCheckoutTripCompleteScreen.js` | Host |
| Guest vehicle condition photos | `GuestVehicleConditionPhotosScreen.js` | Guest |
| Host vehicle condition photos | `HostVehicleConditionPhotosScreen.js` | Host |
| Guest condition photo review | `GuestConditionPhotoReviewScreen.js` | Guest |
| Host condition photo review | `HostConditionPhotoReviewScreen.js` | Host |
| Photo shoot | `PhotoShootScreen.js` | Shared (also in List Ride flow) |
| Guest review host | `GuestHostReviewScreen.js` | Guest |
| Host review guest | `HostGuestReviewScreen.js` | Host |
| Rental history | `RentalHistoryScreen.js` | |
| Payouts dashboard | `PayoutsDashboardScreen.js` | Host |

### Main tabs — Chat

| Screen | File | Notes |
|--------|------|-------|
| Chat | — | Tab route; renders `EmptyMessagesScreen` |
| Empty messages | `EmptyMessagesScreen.js` | Placeholder chat UI |

### Main tabs — Profile & account

| Screen | File |
|--------|------|
| Account management | `AccountManagementScreen.js` |
| User profile | `UserProfileScreen.js` |
| Edit profile | `EditProfileScreen.js` |
| Contact information | `ContactInformationScreen.js` |
| Change email | `ChangeEmailScreen.js` |
| Change address | `ChangeAddressScreen.js` |
| Change license | `ChangeLicenseScreen.js` |
| License verification (Didit) | `LicenseVerificationScreen.js` |
| Notifications | `NotificationsScreen.js` |
| Payment information | `PaymentInformationScreen.js` |
| Add payment method | `AddPaymentMethodScreen.js` |
| Add card | `AddCardScreen.js` |
| Add PayPal | `AddPayPalScreen.js` |
| Favourites | `FavouritesScreen.js` |
| My listings | `ListingsScreen.js` |
| Verification steps | `VerificationStepsScreen.js` |
| Referrals & credits | `ReferralsCreditsScreen.js` |
| Invite friend | `InviteFriendScreen.js` |
| Refer a host | `ReferHostScreen.js` |
| Travel credit | `TravelCreditScreen.js` |

#### Overlays inside Contact information

| Screen | File |
|--------|------|
| Change password | `ChangePasswordScreen.js` |
| Password change success | `PasswordChangeSuccessScreen.js` |
| Phone verification | `PhoneVerificationScreen.js` |
| Phone verification success | `PhoneVerificationSuccessScreen.js` |

### List a ride (host onboarding stack)

| Screen | File |
|--------|------|
| List ride landing 1 | `ListRideLanding1Screen.js` |
| List ride landing 2 | `ListRideLanding2Screen.js` |
| List ride landing 3 | `ListRideLanding3Screen.js` |
| Tell us about your ride | `TellUsAboutYourRideScreen1.js` |
| Edit your ride | `EditYourRideScreen.js` |
| Availability landing | `AvailabilityLandingScreen.js` |
| Availability setup | `AvailabilitySetupScreen.js` |
| Calendar | `CalendarScreen.js` | Same component as Home stack |
| Pricing landing | `PricingLandingScreen.js` |
| Pricing setup | `PricingSetupScreen.js` |
| Extras landing | `ExtrasLandingScreen.js` |
| Extras setup | `ExtrasSetupScreen.js` |
| Describe your ride | `DescribeYourRideScreen.js` |
| Show off your ride | `ShowOffYourRideScreen.js` |
| Photo shoot | `PhotoShootScreen.js` |
| Photo management | `PhotoManagementScreen.js` |
| Host standards | `HostStandardsScreen.js` |
| Ready to start earning | `ReadyToStartEarningScreen.js` |
| Where is my VIN? | `WhereIsMyVINScreen.js` |
| Scan VIN | `ScanVINScreen.js` |
| Type VIN | `TypeVINScreen.js` |
| VIN already exists | `VINAlreadyExistsScreen.js` |

### Get paid (payout setup stack)

| Screen | File |
|--------|------|
| Get paid landing | `GetPaidLandingScreen.js` |
| Get paid step 1 | `GetPaidStep1Screen.js` |
| Get paid step 2 | `GetPaidStep2Screen.js` |
| Get paid step 3 | `GetPaidStep3Screen.js` |
| Payout empty state | `PayoutEmptyStateScreen.js` | Root stack |

### Modals & overlays (not full navigation routes)

| UI | File | Used from |
|----|------|-----------|
| Address entry | `AddressEntryModal.js` | `TellUsAboutYourRideScreen1` |
| Pin accuracy (“Is the pin in the right place?”) | `PinAccuracyModal.js` | `AddressEntryModal` |
| Vehicle types | `VehicleTypesModal.js` | `ListRideLanding3Screen` |
| Share link | `ShareLinkModal.js` | `InviteFriendScreen`, `ReferHostScreen` |

### Dev / utility screens

| Screen | File | Notes |
|--------|------|-------|
| Minimal test | `MinimalTestScreen.js` | Dev placeholder; not in production navigator |

### Navigation map (high level)

```
Welcome
├── AuthScreen (Login | SignUp)
├── ForgotPassword → ResetPassword
├── TermsAndConditions
├── NotificationOnboarding
└── MainTabs
    ├── HomeTab → search, vehicle detail, checkout, calendar
    ├── RentalManagerScreen → guest/host trip lifecycle
    ├── ChatScreen → EmptyMessages
    └── ProfileScreen → account, payments, listings, referrals
├── ListRideStack → host listing creation (19 routes)
├── GetPaidStack → payout onboarding (4 steps)
└── PayoutEmptyStateScreen
```
