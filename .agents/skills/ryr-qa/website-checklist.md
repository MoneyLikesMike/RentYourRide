# Website exhaustive checklist

App: `apps/web`. Routes: `apps/web/src/App.tsx`. Local: `npm run web:dev` → bedev. Hosted test: `https://fedev.rentyourride.ca`.

Mark each item `pass` / `fail` / `blocked` / `n/a`. Test **desktop** and one **mobile viewport**.

Close controls must use `/close.png` (not a raw `×` / “Close” text) on modals that have an X.

---

## A. Marketing / logged-out

- [ ] `/` Home — hero “Experience more together”; subtitle “Rent a diverse selection of vehicles from local hosts.”; App Store + Google Play badges; **no COVID strip**
- [ ] How it works modal / `/how-it-works`
- [ ] `/about`
- [ ] `/contact` — Crisp and/or support email; no crash
- [ ] `/download`
- [ ] `/learn`
- [ ] `/news` + `/news/:slug` (open at least one article if listed)
- [ ] `/studio`
- [ ] `/insurance` and `/faq` redirect → insurance
- [ ] `/terms-conditions`
- [ ] Header + footer on all of the above (`/studio` may hide footer)
- [ ] Footer: Get started **beside** Learn more; Stay in touch has **X** and **TikTok** (not Twitter bird)
- [ ] Copyright `2026 RentYourRide Ltd. - All Rights Reserved`
- [ ] Footer/header links actually navigate (no dead `#`)
- [ ] Crisp chat widget loads (do not send junk tickets)

## B. Auth

- [ ] `/login` — email/password; error on bad creds
- [ ] Login with Apple + Login with Google (real logos; label **Login with Google**; no Facebook)
- [ ] `/signup`
- [ ] Auth modal over a page (login/signup with `backgroundLocation`) if used
- [ ] `/forgot-password` — input contrast (darkened, not grey)
- [ ] Logout; protected profile routes redirect to login
- [ ] `/didit/callback` — opens without a white-screen crash (query params may 400; not a JS exception)

## C. Search / listing / book

- [ ] `/find-your-car` — Google suggestions while typing
- [ ] Current location → address, not coordinates; results include Winnipeg listings when searching Winnipeg
- [ ] `/find-your-car/:listingId` — photos, price, host, dates
- [ ] `/find-your-car/:listingId/checkout` — quote; no crash; double-submit does not double-charge
- [ ] Unverified user gated from booking (same rules as mobile)
- [ ] Favourite from listing → `/profile/favourites`

## D. Profile

- [ ] `/profile` redirects to `/profile/edit`
- [ ] `/profile/edit` — about text visible while editing; photo upload
- [ ] `/profile/overview`
- [ ] `/profile/contact-information` (and `/profile/account-settings` redirect)
- [ ] Phone / email / license verification entry points
- [ ] `/profile/notifications` — toggles persist
- [ ] `/profile/payment-information` — add-payment modal (Card/PayPal, address, close icon)
- [ ] `/profile/referrals-credits` (and `/profile/referrals-&-credits` redirect) — share modal
- [ ] `/profile/your-rides` — only this user’s listings
- [ ] `/profile/favourites` (`/profile/favorites` redirect)
- [ ] `/profile/list-your-ride` — full wizard (VIN, photos, camera roll, host-standards / ready-to-earn modals, publish)
- [ ] `/profile/edit-ride/:listingId` — edits visible to the other account

## E. Trips (host vs guest)

- [ ] `/profile/trips` hub
- [ ] `/profile/trips/requests`
- [ ] `/profile/trips/active`
- [ ] `/profile/trips/history`
- [ ] `/profile/trips/agreements`
- [ ] `/profile/trips/payouts`
- [ ] `/profile/trips/:bookingId` detail
- [ ] `/profile/trips/:bookingId/check-in`
- [ ] `/profile/trips/:bookingId/check-out`
- [ ] Guest bookings not listed as host (and reverse) on each section

## F. Messages

- [ ] `/messages` — inbox does not flicker-loop
- [ ] Open a thread, send a message, see it on the other account

## G. Global

- [ ] 404 unknown path → `/`
- [ ] No console errors on happy-path pages
- [ ] Mobile viewport: nav, checkout CTA, footer usable
- [ ] Stripe test charges only (never live)

## H. Parity vs mobile (same accounts / same listing)

- [ ] Search Winnipeg → same listing(s)
- [ ] Checkout quote matches
- [ ] Profile photo / about match
- [ ] Messages / trips match
- [ ] Verification status matches
