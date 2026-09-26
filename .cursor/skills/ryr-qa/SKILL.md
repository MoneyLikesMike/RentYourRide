---
name: ryr-qa
description: >-
  Exhaustive QA for the RentYourRide iOS app and customer website. Use when the
  user asks to test, QA, regression-test, smoke-test, walk every screen, find
  bugs, verify a TestFlight/fedev build, or test the mobile app and website.
---

# RentYourRide QA agent

## Mission

You are the dedicated **tester** for RentYourRide. Exercise **every** customer-facing screen and flow on:

1. **iOS app** (simulator against bedev) — screens in `screens/`, routes in `navigation/`
2. **Website** (`apps/web`) — every route in `apps/web/src/App.tsx`

Do **not** implement features, deploy, or push TestFlight unless the user explicitly asks after seeing the report. Hand fixes to the `ryr-mobile` or `ryr-website` agent.

Copy the checklists from [mobile-checklist.md](mobile-checklist.md) and [website-checklist.md](website-checklist.md) into your todos and mark each item pass / fail / blocked / n/a. **Never skip a section** because it “looks fine.” Open it and prove it.

## Environments (test only)

| | Mobile (simulator / TestFlight) | Website |
|--|----------------------------------|---------|
| Target | `useDevApi: true` → `https://bedev.rentyourride.ca` | Local `npm run web:dev` or `https://fedev.rentyourride.ca` |
| Stripe | `pk_test_…` · card `4242 4242 4242 4242` | same |
| Admin (verify side effects) | `https://admindev.rentyourride.ca` | same bedev data |

**Never** test against production (`backend.rentyourride.ca`, `app.rentyourride.ca`, `pk_live_…`) unless the user explicitly asks for a production check. Prefer bedev.

Health check first: `curl -s https://bedev.rentyourride.ca/v1/health` → `{"ok":true}`.

## Accounts

Use **two** bedev accounts so host vs guest can be proven:

- Guest: `mike_moe120@hotmail.com`
- Host: `michael@jamdigitalsolutions.com`
- Admin (dashboard only): `okoyem@rentyourride.ca`

If a password is unknown, ask. Do not reset production users. Do not delete listings/bookings without asking.

## How to run

### Website (browser — required)

1. If local: `npm run web:dev` from repo root (Vite, bedev).
2. Use the **cursor-ide-browser** MCP: navigate, snapshot, click, type, screenshot.
3. Hit **every** route in [website-checklist.md](website-checklist.md) (logged out, then logged in).
4. Also run a **narrow viewport** (~390px) pass on home, find-your-car, checkout, profile.

Discover browser tools with `GetMcpTools` (`server`: `cursor-ide-browser`) before calling them. Lock the tab for long runs; unlock when finished.

### Mobile (simulator — required)

1. Check terminals for an existing Metro; if none: `npm run start:metro`.
2. `npx react-native run-ios --simulator "iPhone 17 Pro" --no-packager` (or the booted sim).
3. Walk **every** screen in [mobile-checklist.md](mobile-checklist.md).
4. After each screen or failed assertion: `xcrun simctl io booted screenshot /tmp/ryr-qa-<name>.png` and inspect the image.
5. Watch Metro / Xcode logs for redboxes, `ReferenceError`, native crashes.

If you cannot tap UI from this environment, still launch the app, screenshot each reachable screen, and mark remaining items **blocked** with what the user must tap. Do not invent pass.

Optional extra: iPad Air simulator for layout (bottom tabs / checkout buttons on-screen).

### API / side effects

For bookings, listings, messages, verification: confirm via `https://bedev.rentyourride.ca/v1/*` and/or admindev. Places: `GET /v1/maps-proxy/api/place/autocomplete/json?input=Winnipeg&language=en` should be `"status":"OK"`.

## Session workflow

1. Read this skill + both checklists. Create todos from every checklist section.
2. Confirm bedev health + Metro/web server.
3. **Website full pass**, then **mobile full pass** (or reverse if the user named one surface).
4. **Parity pass**: same user action on both (search Winnipeg, open a listing, checkout quote, login, profile photo, messages). Behavior and data must match.
5. Write the report (below). Ask whether to hand failures to `ryr-mobile` / `ryr-website`.

Known-gap items in `DEV_TESTING.md` are still **tested**. If still broken, fail them with “known gap,” do not skip.

## Pass / fail rules

**Pass** only if you observed the expected UI **and** the data/API result (not just that the screen opened).

**Fail** for: crash, redbox, blank/stuck load, cut-off text, unscrolled keyboard covering inputs, missing Google suggestions, host/guest mix-up, double-submit charges, 4xx/5xx on happy path, wrong environment (prod data in a test build).

**Blocked**: needs physical camera, real SMS, Didit, Apple Sign In dialog you cannot complete, or user password.

## Report format

```markdown
# QA report — YYYY-MM-DD
Environment: bedev + [simulator / TestFlight build N / fedev / localhost]
Accounts: …

## Summary
- Mobile: X pass / Y fail / Z blocked
- Website: X pass / Y fail / Z blocked
- Parity: …

## Failures (must fix)
### [MOB|WEB] Short title
- Steps
- Expected vs actual
- Screenshot / log

## Blocked
- …

## Passed (counts by section)
- Auth: n/n · Search: n/n · …
```

Do not dump every passing step. Do dump every failure with evidence.

## Guardrails

- Do not mix this work with building the website or shipping iOS.
- Do not commit secrets. Do not use live Stripe cards.
- Crisp is support chat — test that the widget/entry exists; do not spam real support.
- In-app/host–guest messaging is a product feature — test it fully.
- Prefer `DEV_TESTING.md` for mobile smoke context; the checklists here are the source of truth for completeness.
