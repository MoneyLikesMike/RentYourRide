#!/usr/bin/env bash
# Guard production web builds: never bake bedev API or Stripe test keys.
# Usage: assert-web-prod-env.sh [path-to-built-index-or-assets-dir]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"
DIST="${1:-$WEB/dist}"

die() { echo "ERROR: $*" >&2; exit 1; }

ORIGIN="${VITE_API_ORIGIN:-}"
if [[ -z "$ORIGIN" && -f "$WEB/.env.production" ]]; then
  # shellcheck disable=SC1091
  ORIGIN="$(grep -E '^VITE_API_ORIGIN=' "$WEB/.env.production" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
fi

[[ -n "$ORIGIN" ]] || die "VITE_API_ORIGIN is not set for production."
[[ "$ORIGIN" != *bedev* ]] || die "Production web must not use bedev (got VITE_API_ORIGIN=$ORIGIN)."
[[ "$ORIGIN" == https://backend.rentyourride.ca* ]] || die "Expected VITE_API_ORIGIN=https://backend.rentyourride.ca (got $ORIGIN)."

PK="${VITE_STRIPE_PUBLISHABLE_KEY:-}"
if [[ -z "$PK" && -f "$WEB/.env.production.local" ]]; then
  # shellcheck disable=SC1091
  PK="$(grep -E '^VITE_STRIPE_PUBLISHABLE_KEY=' "$WEB/.env.production.local" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
fi
if [[ -z "$PK" && -f "$WEB/.env.production" ]]; then
  PK="$(grep -E '^VITE_STRIPE_PUBLISHABLE_KEY=' "$WEB/.env.production" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
fi

[[ -n "$PK" ]] || die "Set VITE_STRIPE_PUBLISHABLE_KEY=pk_live_… for a production web build (apps/web/.env.production.local)."
[[ "$PK" != pk_test_* ]] || die "Production builds require pk_live_… (found pk_test_…)."
[[ "$PK" == pk_live_* ]] || die "VITE_STRIPE_PUBLISHABLE_KEY must start with pk_live_ for production."

# Spot-check built assets so a wrong mode cannot ship.
if [[ -d "$DIST" ]]; then
  if grep -Rql 'bedev\.rentyourride\.ca' "$DIST" 2>/dev/null; then
    die "Built dist still references bedev.rentyourride.ca — rebuild with --mode production."
  fi
  if grep -Rql 'pk_test_' "$DIST" 2>/dev/null; then
    die "Built dist still contains pk_test_ — use a live Stripe publishable key."
  fi
fi

echo "OK: production web env (API=$ORIGIN, Stripe=pk_live_…)"
