# Website testing vs production

Same split as the mobile app (`eas.json` preview → bedev, production → backend).

| | Testing | Production |
|--|---------|------------|
| Host | `https://fedev.rentyourride.ca` | `https://app.rentyourride.ca` (+ apex after DNS) |
| API | `https://bedev.rentyourride.ca` | `https://backend.rentyourride.ca` |
| Stripe | `pk_test_…` | `pk_live_…` |
| AWS profile | `dev` | `ryr-prod` |
| Vite mode | `development` | `production` |
| Profiles file | `apps/web/modes.json` | (same) |

**Production apex (cutover):** `rentyourride.ca` / `www` and `rentyourride.com` / `www` are ALB host rules → same web TG as `app.rentyourride.ca`. ACM cert must be ISSUED and attached before flipping DNS off Wix.

## Local

```bash
npm run web:dev          # bedev (default .env / .env.development)
```

## Build only

```bash
npm run web:build:testing     # bake bedev + test Stripe
npm run web:build:production  # bake backend + require live Stripe
```

Production builds fail if the API is bedev or Stripe is `pk_test_…`. Put the live publishable key in:

```bash
# apps/web/.env.production.local  (gitignored)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_…
```

## Deploy (push)

```bash
aws sso login --profile dev
npm run web:deploy:testing        # → fedev

aws sso login --profile ryr-prod
# set live Stripe in .env.production.local first
export WEB_INSTANCE_ID=i-xxxxxxxx   # if auto-detect fails
npm run web:deploy:production     # → app.rentyourride.ca
```

Never mix: no production host on bedev, no fedev with live Stripe.
