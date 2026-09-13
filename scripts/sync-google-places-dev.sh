#!/usr/bin/env bash
# Enable Places autocomplete on bedev: fix the SERVER key in Google Cloud Console.
# The mobile app uses the iOS-restricted EXPO_PUBLIC_GOOGLE_PLACES_API_KEY on device;
# bedev proxy uses GOOGLE_GEOCODING_API_KEY from AWS (must allow Places API + EC2 IP).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export AWS_PROFILE="${AWS_PROFILE:-dev}"
export AWS_REGION="${AWS_REGION:-us-east-2}"
SECRET_ID="${GOOGLE_AWS_SECRET_ID:-ryr-dev-secrets}"
EC2_IP="${BEDEV_EC2_IP:-3.142.247.74}"

echo "==> Google Places on bedev (server proxy)"
echo ""
echo "1. Open: https://console.cloud.google.com/google/maps-apis/api-list"
echo "   Enable **Places API** for your project."
echo ""
echo "2. Open: https://console.cloud.google.com/google/maps-apis/credentials"
echo "   Edit the API key stored as GOOGLE_GEOCODING_API_KEY in AWS ${SECRET_ID}."
echo ""
echo "   API restrictions → Restrict key → check:"
echo "     - Places API"
echo "     - Geocoding API"
echo ""
echo "   Application restrictions → IP addresses → add:"
echo "     - ${EC2_IP}  (bedev Nest API EC2 egress)"
echo ""
echo "3. Wait ~1 minute, then verify:"
echo "   curl -s \"https://bedev.rentyourride.ca/v1/maps-proxy/api/place/autocomplete/json?input=Winnipeg&language=en\" | head -c 200"
echo ""
echo "   Expect: \"status\" : \"OK\" and \"predictions\" : [ ..."
echo ""
echo "No API redeploy needed after Console changes."
echo ""
echo "Optional: store a dedicated server Places key in AWS:"
read -r -p "Paste GOOGLE_PLACES_API_KEY for bedev (or Enter to skip): " PLACES_KEY
if [[ -z "${PLACES_KEY}" ]]; then
  echo "Skipped AWS update."
  exit 0
fi

if ! command -v aws >/dev/null || ! command -v jq >/dev/null; then
  echo "Need aws CLI and jq" >&2
  exit 1
fi

CURRENT=$(aws secretsmanager get-secret-value \
  --secret-id "${SECRET_ID}" \
  --region "${AWS_REGION}" \
  --query SecretString \
  --output text)
UPDATED=$(echo "${CURRENT}" | jq --arg pk "${PLACES_KEY}" '.GOOGLE_PLACES_API_KEY = $pk')
aws secretsmanager put-secret-value \
  --secret-id "${SECRET_ID}" \
  --region "${AWS_REGION}" \
  --secret-string "${UPDATED}" >/dev/null
echo "Updated ${SECRET_ID}.GOOGLE_PLACES_API_KEY — run: npm run api:deploy:dev"
