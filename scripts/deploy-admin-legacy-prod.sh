#!/usr/bin/env bash
# Restore legacy Admin-old UI on https://admin.rentyourride.ca
# (same look as admindev), pointed at Nest prod API.
#
# Builds from the live admindev static assets (Admin-old CRA cannot
# easily build on Apple Silicon / modern Node due to node-sass).
# Retargets bedev → backend and admindev → admin, then deploys.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export AWS_PROFILE="${AWS_PROFILE:-ryr-prod}"
export AWS_REGION="${AWS_REGION:-us-east-2}"
ADMIN_INSTANCE_ID="${ADMIN_INSTANCE_ID:-i-0a68bf9ea1bb7c22f}"
BUCKET="${DEPLOY_BUCKET:-prod-ryrbs}"
KEY="deploy/admin-legacy-dist.tgz"
SRC="${ADMINDEV_ORIGIN:-https://admindev.rentyourride.ca}"
WORK="/tmp/admin-legacy-prod"

echo "==> Fetching legacy admin from ${SRC}"
rm -rf "$WORK"
mkdir -p "$WORK/static/css" "$WORK/static/js" "$WORK/static/media"
cd "$WORK"

curl -sk -o index.html "$SRC/"
curl -sk -o favicon.ico "$SRC/favicon.ico"
curl -sk -o manifest.json "$SRC/manifest.json"
curl -sk -o asset-manifest.json "$SRC/asset-manifest.json"
curl -sk -o service-worker.js "$SRC/service-worker.js" || true

python3 <<PY
import json, os, re, urllib.request
from urllib.parse import urlparse

src = "${SRC}"
m = json.load(open("asset-manifest.json"))

# Download entrypoint + media assets
for path, url in m["files"].items():
    if not url.startswith("http"):
        continue
    # Keep relative dest under WORK
    rel = urlparse(url).path.lstrip("/")
    if not rel or rel.endswith("/"):
        continue
    os.makedirs(os.path.dirname(rel) or ".", exist_ok=True)
    # Always fetch from admindev origin
    fetch = f"{src}/{rel}"
    print("fetch", rel)
    try:
        urllib.request.urlretrieve(fetch, rel)
    except Exception as e:
        print("skip", rel, e)

# Ensure main chunks from index.html exist
html = open("index.html").read()
for rel in re.findall(r'(static/(?:css|js)/[^"\']+)', html):
    if not os.path.exists(rel):
        print("fetch", rel)
        urllib.request.urlretrieve(f"{src}/{rel}", rel)

open("health", "w").write("ok\n")
print("download complete")
PY

echo "==> Retargeting URLs to production"
find . -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.json' \) -print0 |
  while IFS= read -r -d '' f; do
    sed -i '' \
      -e 's|https://admindev\.rentyourride\.ca|https://admin.rentyourride.ca|g' \
      -e 's|admindev\.rentyourride\.ca|admin.rentyourride.ca|g' \
      -e 's|https://bedev\.rentyourride\.ca|https://backend.rentyourride.ca|g' \
      -e 's|bedev\.rentyourride\.ca|backend.rentyourride.ca|g' \
      "$f"
  done

grep -q 'backend.rentyourride.ca' static/js/main.*.chunk.js
grep -q 'admin.rentyourride.ca' index.html

echo "==> Packaging + uploading"
rm -f /tmp/admin-legacy-dist.tgz
tar -czf /tmp/admin-legacy-dist.tgz .
aws s3 cp /tmp/admin-legacy-dist.tgz "s3://${BUCKET}/${KEY}" --region "$AWS_REGION"

PARAMS=$(mktemp)
cat > "$PARAMS" <<REMOTE
{
  "commands": [
    "set -e",
    "aws s3 cp s3://${BUCKET}/${KEY} /tmp/admin-legacy-dist.tgz --region ${AWS_REGION}",
    "rm -rf /tmp/admin-legacy-dist && mkdir -p /tmp/admin-legacy-dist",
    "tar -xzf /tmp/admin-legacy-dist.tgz -C /tmp/admin-legacy-dist",
    "sudo rsync -a --delete /tmp/admin-legacy-dist/ /var/www/html/",
    "sudo chown -R nginx:nginx /var/www/html/",
    "test -f /var/www/html/index.html",
    "curl -sf http://127.0.0.1/health || true",
    "grep -o 'backend.rentyourride.ca' /var/www/html/static/js/main.*.chunk.js | head -1"
  ]
}
REMOTE

CMD_ID=$(aws ssm send-command \
  --instance-ids "$ADMIN_INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --timeout-seconds 180 \
  --parameters "file://${PARAMS}" \
  --query Command.CommandId --output text)
rm -f "$PARAMS"

echo "SSM deploy: $CMD_ID (waiting...)"
for _ in $(seq 1 30); do
  STATUS=$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$ADMIN_INSTANCE_ID" --query Status --output text)
  [[ "$STATUS" == "Success" || "$STATUS" == "Failed" || "$STATUS" == "Cancelled" || "$STATUS" == "TimedOut" ]] && break
  sleep 3
done
aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$ADMIN_INSTANCE_ID" \
  --query '[Status,StandardOutputContent,StandardErrorContent]' --output text

echo ""
echo "==> Done. Open https://admin.rentyourride.ca (hard-refresh if you still see the new MUI admin)"
