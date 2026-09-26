# Mobile exhaustive checklist

Mark each item `pass` / `fail` / `blocked` / `n/a`. File names live under `screens/`. Navigator: `navigation/AppNavigator.js`, `ListRideStack.js`, `GetPaidStack.js`.

Test card: `4242 4242 4242 4242` · any future expiry · any CVC · ZIP `10000`.

---

## A. Auth & onboarding

- [ ] Welcome (`WelcomeScreen`) loads (splash/logo animation finishes; not stuck)
- [ ] Sign up email (`SignUpScreen`) — new account; email not auto-verified
- [ ] Email verification (`EmailVerificationScreen`) — mail from `donotreply+dev@…`
- [ ] Login email (`LoginScreen`) — success lands in MainTabs
- [ ] Remember me — logout then relaunch still has credentials
- [ ] Login failure — wrong password shows error, no crash
- [ ] Forgot password (`ForgotPasswordScreen`) — email field readable (not grey-on-grey)
- [ ] Reset password (`ResetPasswordScreen`) if token available
- [ ] Apple Sign In
- [ ] Google Sign In
- [ ] No Facebook button
- [ ] Terms (`TermsAndConditionsScreen`)
- [ ] Notification onboarding (`NotificationOnboardingScreen`) — allow / skip
- [ ] Logout returns to auth; tokens cleared

## B. Home / search / book (guest)

- [ ] Home (`HomeScreen`) — search field, current location
- [ ] Current location fills a **street address**, not raw coordinates
- [ ] Typing a city shows **Google Places** suggestions (via bedev proxy)
- [ ] Calendar (`CalendarScreen`) — pick start/end; keyboard/tap-outside dismisses
- [ ] Search results (`SearchResultsScreen`) — Winnipeg listing appears when searching Winnipeg
- [ ] Empty search (`EmptyVehicleSearchScreen`)
- [ ] Vehicle detail (`VehicleDetailScreen`) — photos, price, host, dates
- [ ] Favorite from detail — persists after reload (`FavouritesScreen`)
- [ ] Tapping host name → `UserProfileScreen`; tapping vehicle from booking → detail
- [ ] Checkout (`BookingCheckoutScreen`) — quote from API; no crash on Proceed
- [ ] Keyboard: tap outside dismisses; fields not covered
- [ ] Double-tap Send booking request → **one** booking only
- [ ] Confirmation (`BookingRequestConfirmationScreen`) — host name not truncated; no asterisk
- [ ] Instant book charges Stripe **test** mode; description `Rental of {Host}'s {Year Make Model} {start} – {end}`
- [ ] Blocked dates: booked range unavailable for a second guest

## C. Verification gates

- [ ] `VerificationStepsScreen` — progress bar visible; tappable remaining steps
- [ ] Phone step goes to **phone verification**, not contact-info only
- [ ] Phone (`PhoneVerificationScreen` / `ChangePhoneNumberScreen`) — flag + code in same box; `(999) 999-9999` mask; 6-digit OTP
- [ ] Keyboard dismiss on phone modal; field visible above keyboard
- [ ] Success (`PhoneVerificationSuccessScreen`)
- [ ] License (`LicenseVerificationScreen`) opens **Didit** (custom camera screens were removed)
- [ ] Pending (`LicenseVerificationPendingScreen`)
- [ ] Unverified user **cannot** list or book (gate + copy)

## D. Profile & account

- [ ] Account hub (`AccountManagementScreen`)
- [ ] Edit profile (`EditProfileScreen`) — name; about text **always visible** while editing (not covered by keyboard/overlay)
- [ ] Profile photo: camera roll + camera; saved photo shows on profile, listings, messages
- [ ] Contact information (`ContactInformationScreen`)
- [ ] Change email (`ChangeEmailScreen`) — document placeholder vs working API
- [ ] Change address (`ChangeAddressScreen`) — Google suggestions
- [ ] Change license (`ChangeLicenseScreen`)
- [ ] Change password (`ChangePasswordScreen`) + success (`PasswordChangeSuccessScreen`)
- [ ] Notifications (`NotificationsScreen`) — toggles persist (`PATCH /v1/users/me/notification-settings`)
- [ ] Payment information (`PaymentInformationScreen`)
- [ ] Add payment method (`AddPaymentMethodScreen`) — card number field not black; address field present; Google address suggestions
- [ ] Add card (`AddCardScreen`) with `4242…`
- [ ] Add PayPal (`AddPayPalScreen`) — open without crash (note if stub)
- [ ] Favourites (`FavouritesScreen`)
- [ ] My listings (`ListingsScreen`) — **only this user’s** listings
- [ ] Swipe listing → edit / deactivate is smooth; first-time hint animation until used once
- [ ] Referrals (`ReferralsCreditsScreen`, `InviteFriendScreen`, `ReferHostScreen`, `TravelCreditScreen`)
- [ ] Contact us → live chat + Call Us (`204-977-7677` / `tel:+12049777677`)
- [ ] Report a bug → `support@rentyourride.ca` subject `Bug Report!`
- [ ] Terms from profile

## E. List a ride (host)

Walk the full `ListRideStack` (do not jump to publish):

- [ ] Landings 1–3 (`ListRideLanding1Screen` … `3`) + vehicle types modal
- [ ] Where is VIN / Scan VIN / Type VIN (`WhereIsMyVINScreen`, `ScanVINScreen`, `TypeVINScreen`)
- [ ] VIN decode fills year/make/model; trim/style/transmission/fuel auto or dropdown `fieldOptions`
- [ ] Duplicate VIN → `VINAlreadyExistsScreen`
- [ ] Tell us about your ride (`TellUsAboutYourRideScreen1`)
- [ ] Address + current location; pin modal (`AddressEntryModal`, `PinAccuracyModal`) pin matches typed/GPS place
- [ ] Availability landing + setup + calendar
- [ ] Pricing landing + setup
- [ ] Extras landing + setup
- [ ] Describe / show off / photo shoot / photo management
- [ ] Add from **camera roll** actually opens the library
- [ ] Host standards + ready to start earning
- [ ] Publish → listing on `ListingsScreen`
- [ ] Edit ride (`EditYourRideScreen`) — price change visible to the **other** account
- [ ] List a new ride does **not** crash

## F. Rental manager (host vs guest)

Use two accounts. Guest trip must **not** appear on that user’s Host tab (and vice versa) for requests, active, agreements, history.

- [ ] Hub (`RentalManagerScreen`)
- [ ] Requests (`RentalRequestScreen`) — host can approve/decline
- [ ] Active (`ActiveRentalsScreen`)
- [ ] Guest details (`GuestBookingDetailsScreen`) / host details (`HostBookingDetailsScreen`)
- [ ] Check-in button until check-in done; extend while trip active (`ExtendTripScreen`)
- [ ] Guest/host check-in + reminders + guidelines
- [ ] Agreements list + guest/host agreement + sign + completed
- [ ] Checkout shown until done, and up to 24h after trip end if incomplete
- [ ] After guest checkout: guest checkout button gone; trip in guest history; host still incomplete until host checks out
- [ ] Condition photos + review (guest/host) + photo shoot
- [ ] Reviews (guest→host, host→guest)
- [ ] History (`RentalHistoryScreen`)
- [ ] Payouts dashboard (`PayoutsDashboardScreen`)

## G. Messaging

- [ ] Inbox (`MessagesScreen`) — no infinite flash/reload
- [ ] Empty state (`EmptyMessagesScreen`) if no threads
- [ ] Thread (`ChatThreadScreen`) — send/receive; appears after booking request / approval
- [ ] No “conversation not found” / 500 on happy path

## H. Get paid

- [ ] Landing + steps 1–3 (`GetPaidLandingScreen` … `GetPaidStep3Screen`)
- [ ] Empty payout (`PayoutEmptyStateScreen`)
- [ ] Connect onboarding link (test mode)

## I. Global UX

- [ ] Keyboard dismiss on tap-outside **every** form tested
- [ ] Scrolling works from the main content area (not only tiny hit targets)
- [ ] No white/stuck splash after cold start
- [ ] iPad (if run): after login, tabs and primary CTAs are on-screen
- [ ] Apple Pay not presented (disabled on purpose)

## J. Out of scope unless asked

- Production App Store binary
- Admin dashboard beyond confirming bedev side effects
- Android
