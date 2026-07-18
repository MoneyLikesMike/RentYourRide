# Production go-live runbook

Replace the legacy iOS app **in place** on the existing App Store listing. Users keep the same app install; the new binary talks to the new Nest API on `backend.rentyourride.ca`.

## Your three requirements

### 1. Same App Store listing (no metadata changes)

| Item | Value |
|------|-------|
| **Bundle ID** | `com.rentyourride.ios` (same as live legacy app) |
| **App Store Connect app** | Existing listing (App ID `1495074000`) |
| **Team ID** | `Z6M4WNBW2P` |
| **New app version** | `3.0.3` (build ≥ 21 for App Store release) |

Because the bundle ID matches the live app, you **submit an update** to the existing app — do **not** create a new App Store Connect app and do **not** change screenshots, description, keywords, or pricing.

In App Store Connect → your existing **RentYourRide** app → add the new build → submit for review. Leave all store metadata unchanged.

### 2. Legacy users must keep working

You’ve indicated migrated users are already in the **new** Postgres (`users` table on the production database). Before flipping traffic, verify:

| Check | How |
|-------|-----|
| User count sanity | Compare legacy `"user"` row count vs new `users` count |
| Email/password login | Log in as 2–3 real accounts on bedev, then prod after cutover |
| Google / Apple sign-in | Same bundle ID + client IDs → existing OAuth users should match on `google_sub` / `apple_sub` |
| Facebook-only legacy users | No Facebook login in new app — run password-reset outreach if any remain (`apps/api/scripts/send-migration-password-reset.mjs`) |
| Active bookings / listings | Spot-check a few UUIDs exist in new `bookings` / `listings` |
| Stripe | `stripe_customer_id` / Connect IDs present for paying users |
| Profile photos | Upload paths resolve (`UPLOADS_DIR` on prod EC2 or S3) |

**Auth continuity:** Existing users who update from the App Store get the new app binary. They do **not** need new accounts if their row exists in the new `users` table with the same email / OAuth subject.

### 3. Production admin → new API (like admindev → bedev)

| Environment | Admin URL | API URL |
|-------------|-----------|---------|
| Dev (today) | `https://admindev.rentyourride.ca` | `https://bedev.rentyourride.ca` |
| **Production (target)** | `https://admin.rentyourride.ca` | `https://backend.rentyourride.ca` |

Deploy `apps/admin` with `VITE_API_ORIGIN=https://backend.rentyourride.ca` to the prod admin bucket (`prod-ryrbs-admin`). See [Deploy admin](#4-deploy-admin-dashboard) below.

---

## Architecture after cutover

```
iOS App (3.0.3)  ──►  backend.rentyourride.ca/v1/*  ──►  Nest API (EC2 :8081)
admin.rentyourride.ca  ──►  same Nest API (/v1/admin/*, /v1/auth/admin/login)
```

Legacy Node backend on `:8080` stays running during transition. ALB routes **only** `/v1/*` on `backend.rentyourride.ca` to Nest (same pattern as bedev today).

---

## Cutover order (do not skip steps)

### Phase A — Production API (backend)

**Prerequisites**

- AWS CLI profile `ryr-prod` (account `148761673904`, region `us-east-2`)
- `ryr-prod-secrets` in Secrets Manager contains prod `DATABASE_URL`, `JWT_SECRET`, Stripe **live** keys, Pinpoint prod app, Didit prod webhook URL, etc.
- Prod EC2 instance ID (tag `ryr-prod-backend`):

  ```bash
  aws ec2 describe-instances --profile ryr-prod --region us-east-2 \
    --filters "Name=tag:Name,Values=*ryr-prod-backend*" "Name=instance-state-name,Values=running" \
    --query 'Reservations[].Instances[].InstanceId' --output text
  ```

**Deploy Nest to prod EC2**

```bash
export AWS_PROFILE=ryr-prod
export BACKEND_INSTANCE_ID=i-xxxxxxxx   # from command above
npm run api:deploy:prod
```

**Wire ALB** (`backend.rentyourride.ca` + `/v1/*` → Nest :8081):

```bash
export AWS_PROFILE=ryr-prod
export BACKEND_INSTANCE_ID=i-xxxxxxxx
bash apps/api/scripts/setup-prod-alb.sh
```

**Verify**

```bash
curl -s https://backend.rentyourride.ca/v1/health
# expect: {"ok":true}
```

**Prod API env must NOT include**

- `TYPEORM_SYNCHRONIZE=1` (schema changes need migrations, not auto-sync)
- `SMS_EXPOSE_CODE=1` (dev-only OTP leak)

**Register / update third-party webhooks for prod**

- Didit webhook → `https://backend.rentyourride.ca/v1/didit/webhook`
- Stripe webhook → prod endpoint on Nest
- Google Places API key — restrict to prod EC2 egress IP(s)
- Pinpoint prod app + sender `donotreply@rentyourride.ca`

---

### Phase B — Production admin

```bash
export AWS_PROFILE=ryr-prod
npm run admin:deploy:prod
```

Open `https://admin.rentyourride.ca`, sign in with an `admin` role user (`POST /v1/auth/admin/login`).

> **Note:** Production admin currently serves the **legacy** `Admin-old` UI (same look as `admindev`), pointed at Nest (`backend.rentyourride.ca`). Redeploy with `npm run admin:deploy:legacy:prod`. The modern `apps/admin` rewrite is incomplete (Members only; Trips/Validation stubs) — use `npm run admin:deploy:prod` only when parity is ready.

---

### Phase C — Production iOS build

**1. Point mobile app at production API**

In `app.json`:

```json
"useDevApi": false,
"apiUrl": "https://backend.rentyourride.ca"
```

In `eas.json` → `build.production.env`:

```json
"EXPO_PUBLIC_API_URL": "https://backend.rentyourride.ca"
```

Ensure `.env` has **live** `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` (not test).

**2. Bump build number** (App Store Connect requires a new build integer each upload).

**3. Archive and upload**

```bash
FORCE_ARCHIVE=1 npm run ios:testflight:upload
```

Or EAS:

```bash
npm run eas:build:ios
npm run eas:submit:ios
```

**4. App Store Connect**

- Select existing **RentYourRide** app (bundle `com.rentyourride.ios`)
- Add build → **do not edit** description, screenshots, or keywords
- Submit for review
- Release manually or automatically after approval

---

### Phase D — Post-launch

- Monitor `pm2 logs ryr-nest-api` on prod EC2
- Watch Stripe / Didit dashboards for errors
- Keep legacy backend running 1–2 weeks as rollback; then decommission ALB default route to legacy if stable
- Optional: email blast / in-app notice for Facebook-only users to set a password

---

## Environment reference

| | Dev | Production |
|--|-----|------------|
| API | `https://bedev.rentyourride.ca` | `https://backend.rentyourride.ca` |
| Admin | `https://admindev.rentyourride.ca` | `https://admin.rentyourride.ca` |
| AWS profile | `dev` | `ryr-prod` |
| Secrets | `ryr-dev-secrets` | `ryr-prod-secrets` |
| S3 deploy bucket | `dev-ryrbs` | `prod-ryrbs` |
| Admin S3 bucket | (admindev pipeline) | `prod-ryrbs-admin` |
| Nest port on EC2 | `8081` | `8081` |
| PM2 process | `ryr-nest-api` | `ryr-nest-api` |

---

## Rollback

1. **Mobile:** Re-release previous legacy build from App Store Connect (if still available) or hotfix `useDevApi: true` is **not** acceptable for prod users — keep previous IPA ready.
2. **ALB:** Remove `/v1/*` Nest rule so `backend.rentyourride.ca` routes entirely to legacy `:8080`.
3. **Admin:** Redeploy legacy `Admin-old` build to `prod-ryrbs-admin` pointing at legacy API.

---

## Scripts added in this repo

| Command | Purpose |
|---------|---------|
| `npm run api:deploy:prod` | Deploy Nest API to prod EC2 |
| `bash apps/api/scripts/setup-prod-alb.sh` | ALB `/v1/*` routing on `backend.rentyourride.ca` |
| `npm run admin:deploy:prod` | Build + S3 sync admin to `admin.rentyourride.ca` |

---

## Current status (before cutover)

- Mobile + EAS **still point at bedev** (`useDevApi: true` in `app.json`) — intentional until Phase A completes.
- `TESTFLIGHT.md` is outdated (wrong bundle ID / version); use this doc and `app.json` instead.
- Android (`com.rentyourrideca` on Play Store) is **out of scope** for this iOS cutover unless separately planned.
