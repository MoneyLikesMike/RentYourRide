#!/usr/bin/env bash
# Add prod EC2 IP to the server Google API key (same key as dev/bedev).
set -euo pipefail

export AWS_PROFILE="${AWS_PROFILE:-dev}"
export AWS_REGION="${AWS_REGION:-us-east-2}"
export GCP_PROJECT="${GCP_PROJECT:-rent-your-ride-ea006}"
export GCP_KEY_NAME="${GCP_KEY_NAME:-projects/524622562399/locations/global/keys/bb26a6e0-858e-4ab4-9cb2-676924b7dd6e}"
SECRET_ID="${GOOGLE_AWS_SECRET_ID:-ryr-dev-secrets}"
DEV_EC2_IP="${BEDEV_EC2_IP:-3.142.247.74}"
PROD_EC2_IP="${PROD_EC2_IP:-3.148.168.117}"

echo "==> Whitelist prod + dev EC2 IPs on Google server API key"
echo "    Project: ${GCP_PROJECT}"
echo "    IPs: ${DEV_EC2_IP}, ${PROD_EC2_IP}"
echo ""

if ! command -v gcloud >/dev/null; then
  echo "Install gcloud: https://cloud.google.com/sdk/docs/install" >&2
  exit 1
fi

if ! command -v aws >/dev/null || ! command -v jq >/dev/null; then
  echo "Need aws CLI and jq" >&2
  exit 1
fi

if ! gcloud auth print-access-token >/dev/null 2>&1; then
  echo "Run: gcloud auth login" >&2
  echo "Then re-run: bash scripts/sync-google-places-prod.sh" >&2
  exit 1
fi

KEY_PREFIX=$(aws secretsmanager get-secret-value \
  --secret-id "${SECRET_ID}" \
  --region "${AWS_REGION}" \
  --query SecretString \
  --output text | jq -r '.GOOGLE_GEOCODING_API_KEY // empty' | cut -c1-20)

if [[ -z "${KEY_PREFIX}" ]]; then
  echo "GOOGLE_GEOCODING_API_KEY missing in ${SECRET_ID}" >&2
  exit 1
fi

echo "Looking for API key starting with ${KEY_PREFIX}..."

KEY_RESOURCE="${GCP_KEY_NAME}"

if [[ -z "${KEY_RESOURCE}" ]]; then
  echo "Could not resolve API key resource name." >&2
  exit 1
fi

echo "Updating ${KEY_RESOURCE}..."
gcloud services api-keys update "${KEY_RESOURCE}" \
  --project="${GCP_PROJECT}" \
  --allowed-ips="${DEV_EC2_IP},${PROD_EC2_IP}" \
  --api-target=service=geocoding-backend.googleapis.com \
  --api-target=service=places.googleapis.com \
  --api-target=service=places-backend.googleapis.com

echo ""
echo "Done. Verify prod autocomplete (expect Google place_id ChIJ...):"
echo "  curl -s \"https://backend.rentyourride.ca/v1/maps-proxy/api/place/autocomplete/json?input=Winnipeg&language=en\" | head -c 300"
