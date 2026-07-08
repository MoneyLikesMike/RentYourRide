#!/bin/bash
# Add nestdev.rentyourride.ca CNAME → Dev ALB (GoDaddy DNS).
# Requires: GODADDY_API_KEY + GODADDY_API_SECRET (https://developer.godaddy.com/keys)
set -euo pipefail

DOMAIN="rentyourride.ca"
NAME="nestdev"
ALB_DNS="${ALB_DNS:-CoreSt-RYRAL-7NTx2EEMpj3q-1337494599.us-east-2.elb.amazonaws.com}"
TTL="${TTL:-600}"

if [ -z "${GODADDY_API_KEY:-}" ] || [ -z "${GODADDY_API_SECRET:-}" ]; then
  echo "Missing GODADDY_API_KEY or GODADDY_API_SECRET."
  echo "Create a Production API key at https://developer.godaddy.com/keys then run:"
  echo "  export GODADDY_API_KEY=... GODADDY_API_SECRET=..."
  echo "  $0"
  exit 1
fi

BODY=$(jq -n --arg data "$ALB_DNS" --argjson ttl "$TTL" \
  '[{type:"CNAME",name:"nestdev",data:$data,ttl:$ttl}]')

curl -sf -X PATCH \
  -H "Authorization: sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d "$BODY" \
  "https://api.godaddy.com/v1/domains/${DOMAIN}/records/CNAME/${NAME}"

echo "CNAME ${NAME}.${DOMAIN} -> ${ALB_DNS} (ttl ${TTL})"
