#!/usr/bin/env bash
# Push Stripe secret to AWS ryr-dev-secrets and redeploy Nest API to bedev.
# Prerequisite: paste keys in .env (publishable) and stripe.secret.local (secret).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export AWS_PROFILE="${AWS_PROFILE:-dev}"
export AWS_REGION="${AWS_REGION:-us-east-2}"
SECRET_ID="${STRIPE_AWS_SECRET_ID:-ryr-dev-secrets}"

die() {
  echo "sync-stripe-dev: $*" >&2
  exit 1
}

# --- Publishable key in .env (mobile) ---
if [[ ! -f .env ]]; then
  die "Missing .env — copy .env.example to .env and set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY"
fi
# shellcheck disable=SC1091
source .env 2>/dev/null || true
PK="${EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}"
if [[ -z "${PK}" ]]; then
  die "Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_… in .env (Stripe Dashboard → API keys)"
fi
if [[ "${PK}" != pk_test_* && "${PK}" != pk_live_* ]]; then
  die "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY should start with pk_test_ or pk_live_"
fi
echo "OK publishable key in .env (${PK:0:12}…)"

# --- Secret key (server only) ---
LOCAL_SECRET_FILE="${ROOT}/stripe.secret.local"
if [[ ! -f "${LOCAL_SECRET_FILE}" ]]; then
  cp "${ROOT}/stripe.secret.local.example" "${LOCAL_SECRET_FILE}"
  die "Created stripe.secret.local — paste STRIPE_SECRET_KEY=sk_test_… then run this script again"
fi
# shellcheck disable=SC1091
source "${LOCAL_SECRET_FILE}"
SK="${STRIPE_SECRET_KEY:-}"
if [[ -z "${SK}" ]]; then
  die "Set STRIPE_SECRET_KEY=sk_test_… in stripe.secret.local"
fi
if [[ "${SK}" != sk_test_* && "${SK}" != sk_live_* ]]; then
  die "STRIPE_SECRET_KEY should start with sk_test_ or sk_live_"
fi
if [[ "${PK}" == pk_test_* && "${SK}" != sk_test_* ]]; then
  die "Mismatch: publishable is test but secret is live (or vice versa)"
fi
if [[ "${PK}" == pk_live_* && "${SK}" != sk_live_* ]]; then
  die "Mismatch: publishable is live but secret is test"
fi
echo "OK secret key in stripe.secret.local (${SK:0:12}…)"

# --- Merge into AWS Secrets Manager ---
if ! command -v aws >/dev/null 2>&1; then
  die "aws CLI not found"
fi
if ! command -v jq >/dev/null 2>&1; then
  die "jq not found (brew install jq)"
fi

echo "Fetching ${SECRET_ID} from AWS (${AWS_PROFILE})…"
CURRENT=$(aws secretsmanager get-secret-value \
  --secret-id "${SECRET_ID}" \
  --region "${AWS_REGION}" \
  --query SecretString \
  --output text) || die "Could not read ${SECRET_ID}. Run: aws sso login --profile ${AWS_PROFILE}"

UPDATED=$(echo "${CURRENT}" | jq --arg sk "${SK}" '.STRIPE_SECRET_KEY = $sk')
aws secretsmanager put-secret-value \
  --secret-id "${SECRET_ID}" \
  --region "${AWS_REGION}" \
  --secret-string "${UPDATED}" >/dev/null
echo "Updated ${SECRET_ID}.STRIPE_SECRET_KEY in AWS"

echo ""
echo "Deploying Nest API to bedev…"
npm run api:deploy:dev

echo ""
echo "Done. Next:"
echo "  1. npm run start:metro"
echo "  2. Reload the app in the simulator (Cmd+R)"
echo "  3. Account → Payment Information → Add card (test: 4242 4242 4242 4242)"
