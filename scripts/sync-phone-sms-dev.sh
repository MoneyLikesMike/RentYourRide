#!/usr/bin/env bash
# Add PHONENUMBER to AWS ryr-dev-secrets for bedev SMS verification, then redeploy API.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export AWS_PROFILE="${AWS_PROFILE:-dev}"
export AWS_REGION="${AWS_REGION:-us-east-2}"
SECRET_ID="${PHONE_SMS_AWS_SECRET_ID:-ryr-dev-secrets}"

die() {
  echo "sync-phone-sms-dev: $*" >&2
  exit 1
}

LOCAL_FILE="${ROOT}/phone-sms.secret.local"
if [[ ! -f "${LOCAL_FILE}" ]]; then
  cat > "${LOCAL_FILE}" <<'EOF'
# E.164 origination number from AWS SNS / End User Messaging (e.g. +18445550100)
PHONENUMBER=
EOF
  die "Created phone-sms.secret.local — set PHONENUMBER=+1… then run: npm run phone-sms:sync-dev"
fi

# shellcheck disable=SC1091
source "${LOCAL_FILE}"
PHONE="${PHONENUMBER:-}"
if [[ -z "${PHONE}" ]]; then
  die "Set PHONENUMBER=+1… in phone-sms.secret.local (AWS console → SNS → Origination numbers)"
fi
if [[ "${PHONE}" != +* ]]; then
  die "PHONENUMBER must be E.164 format starting with + (got: ${PHONE})"
fi

echo "Fetching current ${SECRET_ID}…"
CURRENT=$(aws secretsmanager get-secret-value \
  --secret-id "${SECRET_ID}" \
  --region "${AWS_REGION}" \
  --query SecretString --output text)

UPDATED=$(echo "${CURRENT}" | jq --arg p "${PHONE}" '.PHONENUMBER = $p')
aws secretsmanager put-secret-value \
  --secret-id "${SECRET_ID}" \
  --region "${AWS_REGION}" \
  --secret-string "${UPDATED}"

echo "Updated PHONENUMBER in ${SECRET_ID} (${PHONE:0:4}…)"
echo "Redeploy API: npm run api:deploy:dev"
echo ""
echo "Checklist if SMS still fails:"
echo "  1. EC2 instance role allows sns:Publish"
echo "  2. Origination number is active in AWS End User Messaging / SNS"
echo "  3. Destination country is enabled for SMS in AWS account"
