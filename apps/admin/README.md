# RentYourRide Admin (modern)

Staff dashboard that talks to the **same Nest API** as the legacy admin (`RentYourRideLegacy/Admin-old`): JWT admin login, member list, and more screens to follow.

## Prerequisites

- Node 18+
- Backend running (see `RentYourRideLegacy/Backend-old`) on the port you configure below

## Configure API URL

**Option A — direct (simplest)**  

Copy `.env.example` to `.env.local` and set:

```bash
VITE_API_ORIGIN=http://localhost:YOUR_API_PORT
```

**Option B — Vite proxy**  

Leave `VITE_API_ORIGIN` unset. Requests go to `/api/v1/...` and the dev server proxies to `VITE_DEV_PROXY_TARGET` (default `http://localhost:3000`).

## Run

```bash
cd apps/admin
npm install
npm run dev
```

Open `http://localhost:5173`. Sign in with an **`admin` role** account (`POST /v1/auth/admin/login` rejects non-admins).

## Scripts

| Command        | Purpose           |
|----------------|-------------------|
| `npm run dev`  | Local dev server  |
| `npm run build`| Production bundle |
| `npm run typecheck` | TypeScript only |

## What’s implemented

- Admin login + token refresh (local storage keys prefixed with `ryr_admin_`)
- Responsive shell (sidebar + app bar)
- **Members** list with search, pagination (calls `GET /v1/admin/users`)
- Placeholder routes: Trips, Validation, member profile detail

## Next steps (parity with legacy admin)

- Member profile (notes, trips, listings, Stripe tab)
- Trips tabs (active, requests, completed, canceled)
- Validation / licenses queue
- Add user, car detail, etc.
