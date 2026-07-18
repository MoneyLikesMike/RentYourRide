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

## First session checklist

When the user starts website work in a new chat:

1. Confirm goal (scaffold only vs full parity vs go-live).
2. Check whether `apps/web` exists; if not, propose stack + folder layout.
3. Wire health check to `GET /v1/health` on bedev.
4. Port auth (login/register/refresh) next, then search → detail → book.
