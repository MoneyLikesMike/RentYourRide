#!/usr/bin/env bash
# Writes Mac LAN IP for physical-device Metro (simulator keeps using localhost).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"

if [[ -z "${IP}" ]]; then
  echo "update-metro-host: no LAN IP (en0/en1); device builds may need Wi‑Fi."
  IP="localhost"
fi

CONFIG="${ROOT}/ios/RentYourRide/MetroHost.config.json"
mkdir -p "$(dirname "${CONFIG}")"
printf '%s\n' "{\"host\":\"${IP}\"}" > "${CONFIG}"

XCODE_ENV_LOCAL="${ROOT}/ios/.xcode.env.local"
NODE_LINE='export NODE_BINARY=$(command -v node)'
if [[ -f "${XCODE_ENV_LOCAL}" ]] && grep -q '^export NODE_BINARY=' "${XCODE_ENV_LOCAL}"; then
  NODE_LINE="$(grep '^export NODE_BINARY=' "${XCODE_ENV_LOCAL}" | head -1)"
fi

cat > "${XCODE_ENV_LOCAL}" <<EOF
${NODE_LINE}
export REACT_NATIVE_PACKAGER_HOSTNAME=${IP}
EOF

echo "Metro host for device: ${IP}"
