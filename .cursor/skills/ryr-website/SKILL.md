---
name: ryr-website
description: >-
  Rebuild and maintain the RentYourRide customer website (modern web app)
  against the Nest API, mirroring the mobile rebuild process. Use when the user
  mentions the website, web app, fedev, festage, app.rentyourride.ca, Web-old,
  or wants a dedicated website agent / web go-live work.
---

# RentYourRide website agent

## Mission

Rebuild the **customer-facing website** the same way the iOS app was rebuilt:

1. Treat **legacy** `RentYourRideLegacy/Web-old` as the product/UX reference (CRA + Redux + Material UI).
2. Build a **new** modern web app in this repo (prefer `apps/web`) that talks to the **Nest API** (`/v1/*`).
3. Dev against **bedev**; ship to **production** only with production API + live Stripe.

Do **not** revive the legacy CRA stack as the long-term app. Port flows and screens; use modern React (Vite or Next) + TypeScript unless the user specifies otherwise.

## Environments (same split as mobile / infra)

| Env | Web host (legacy) | API |
|-----|-------------------|-----|
| Development | `fedev.rentyourride.ca` | `https://bedev.rentyourride.ca` |
| Staging | `festage.rentyourride.ca` | staging backend if present |
| Production | `app.rentyourride.ca` | `https://backend.rentyourride.ca` |

Admin is separate (`apps/admin` / `admin.rentyourride.ca`) — do not mix admin UI into the customer website.

## Process (mirror mobile)

1. **Inventory** — Map legacy `Web-old/src/screens` (and routes) to website flows: search, listing detail, book, auth, profile, host list-a-ride, payouts, etc.
2. **Scaffold** — Create `apps/web` if missing (Vite + React + TS recommended). Shared API types/clients can live under `apps/` or reuse patterns from mobile `services/*Api.js` and Nest DTOs.
3. **API first** — All data via Nest `https://bedev.rentyourride.ca/v1/*` (Bearer JWT + refresh). No hard-coded bedev in production builds.
4. **Env flags** — Bake API base URL at build time (e.g. `VITE_API_URL` / `NEXT_PUBLIC_API_URL`):
   - Dev / preview → bedev
   - Production deploy → `https://backend.rentyourride.ca`
   - Stripe: `pk_test_…` for bedev; `pk_live_…` only for production web builds
5. **Parity** — Match mobile behaviors already proven on bedev (auth, search/Places proxy, bookings, listings, verification gates, blocked dates, etc.).
6. **Deploy** — Follow the same cutover discipline as `PRODUCTION.md`: bedev QA → production API health → production web deploy → DNS to `app.rentyourride.ca`.

## Building a screen (mandatory)

Whenever the user asks to add or redesign a screen:

1. **Check legacy first** — Look in `RentYourRideLegacy/Web-old/src/screens` (and related `components` / SCSS) for an existing screen for that flow.
2. **If legacy UI exists** — Port that layout, typography, colors, copy, and assets into `apps/web`. Do not invent a parallel design.
3. **If no legacy UI** — Only then design something new (still Nunito / teal–yellow brand tokens where they fit).
4. **Data layer** — Always implement against Nest `/v1/*` on bedev (and mobile-proven behavior), never the old CRA API.

Legacy screen map (non-exhaustive): `Landing`, `Home`, `FindYourCar` (+ `Car`, `Checkout`), `Login`, `Signup`, `Profile`, `ListYourRide`, `YourRides`, `EditRide`, `EditProfile`, `PaymentInformation`, `ContactInformation`, `Notifications`, `ReferralsCredits`.

## Source of truth

- **API / product behavior:** current Nest app in `apps/api` + mobile flows in this repo.
- **Legacy UX / copy / routes:** `../RentYourRideLegacy/Web-old` (workspace sibling).
- **Infra hostnames:** `RentYourRideLegacy/Infrastructure-old/shared/utils.ts` (`webDomainByEnvironment`, `backendDomainByEnvironment`).

## Guardrails

- Never point a production website build at bedev.
- Never commit secrets (`.env`, Stripe secret keys). Publishable keys only in env / CI secrets.
- Prefer shared Nest endpoints over duplicating business logic in the web app.
- Keep website work scoped to `apps/web` (and deploy scripts); do not regress mobile/iOS unless asked.
- When starting a fresh website session, read this skill first, then propose a short phased plan before large scaffolds.
- Exhaustive QA (every page + mobile parity) is the **`ryr-qa`** agent. Do not turn a build session into a full regression unless asked.

## Current state (as of Jul 17 2026 — continue from here)

`apps/web` exists and is well underway: **Vite + React 18 + TypeScript + react-router**, Stripe via `@stripe/react-stripe-js`. Structure:

- `src/api/` — typed Nest clients (auth, users, listings, hostListings, bookings, payments, referrals, maps, health, storage, http with JWT + refresh)
- `src/auth/` — `AuthContext`, Google + Apple sign-in, validation
- `src/components/` — `SiteHeader`, `SiteFooter`, `ProfileLayout`/`ProfileSidebar`, `AddPaymentMethodModal`, `AddCardPanel`, `PlacesAutocomplete`, `StoreBadges`, `SocialLogos`
- `src/pages/` — Home, FindYourCar, ListingDetail, Checkout, Login, Signup, ForgotPassword, ProfileOverview, EditProfile, AccountSettings (contact info), PaymentInformation, ReferralsCredits, YourRides, ListYourRide
- Legacy assets copied into `public/` (logo, home images, footer, profile, list-ride, `close.png`)

**Not yet built** (legacy screens remaining): `EditRide`; plus anything else in `Web-old/src/screens` not listed above.

**Deploy:** testing vs production mirrors mobile EAS (`apps/web/modes.json`, `WEB_DEPLOY.md`):

| Command | Target |
|---------|--------|
| `npm run web:deploy:testing` | `fedev.rentyourride.ca` → bedev + Stripe test |
| `npm run web:deploy:production` | `app.rentyourride.ca` → backend + Stripe live |

Requires AWS SSO (`dev` / `ryr-prod`) and `WEB_INSTANCE_ID` if auto-detect fails. Never mix bedev into a production build.

## Session decisions (honor these)

- Auth buttons: **Apple + Google** (no Facebook), with real logos; label "Login with Google".
- Home hero: legacy design, COVID strip removed, subtitle "Rent a diverse selection of vehicles from local hosts." under "Experience more together", App Store / Google Play badge buttons below it.
- Footer: legacy footer with Get started + Learn more columns side by side; Stay in touch uses **X** (not Twitter) and **TikTok** logos; copyright "2026 RentYourRide Ltd. - All Rights Reserved".
- All close/X controls use the icon at `apps/web/public/close.png` (`.close-x-img` class), not a "×" character or "Close" text button.
- Run `npm run typecheck` (in `apps/web`) after changes; dev server via `npm run web:dev` from repo root.

## Open item (interrupted mid-task)

The previous session was replacing ×/Close buttons with `close.png` when the machine's disk filled up and the chat died. Done: HomePage how-it-works modal and ListYourRidePage photo-remove now render the icon; `.close-x-img` styling exists in `home.css`. Still to finish:

1. `list-your-ride.css` — the `.lyr-photo-remove` restyle never applied (icon is dark on a dark `rgba(0,0,0,0.55)` circle; switch to a light background and add icon sizing).
2. Add the corner icon close button to the add-payment modal, the photo-examples modal, and the referrals share modal (they still use text buttons).
3. Disk space was freed afterwards; no cleanup work is pending.

## First session checklist

When the user starts website work in a new chat:

1. Read **Current state** and **Open item** above; finish the open item if still outstanding.
2. Continue porting remaining legacy screens (legacy UI first, always).
3. Confirm with the user before any deploy/go-live step (fedev → production per PRODUCTION.md discipline).
