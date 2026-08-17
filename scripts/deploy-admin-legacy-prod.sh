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

python3 <<'PY'
from pathlib import Path
import hashlib
import os

paths = list(Path("static/js").glob("main.*.chunk.js"))
if not paths:
    raise SystemExit("no main.*.chunk.js found")

for path in paths:
    text = path.read_text()

    old_hide = 'return i.a.createElement("div",{className:"block-wrapper information-columns"},u.map(e=>e.value?i.a.createElement("div",{className:"data-block",key:e.title},i.a.createElement("span",{className:"data-caption"},e.title),i.a.createElement("span",{className:"data"},e.value)):null))'
    new_show = 'return i.a.createElement("div",{className:"block-wrapper information-columns"},u.map(e=>i.a.createElement("div",{className:"data-block",key:e.title},i.a.createElement("span",{className:"data-caption"},e.title),i.a.createElement("span",{className:"data"},e.value||"—"))))'
    if old_hide in text:
        text = text.replace(old_hide, new_show, 1)
        print("always show contact fields")
    elif 'e.value||"—"' in text or "e.value||'—'" in text:
        print("contact fields already always shown")
    else:
        raise SystemExit("contact field render pattern not found")

    city_field = '{title:"city",value:(null===d||void 0===d||null===(o=d.driverLicenseAddress)||void 0===o?void 0:o.city)?null===d||void 0===d||null===(c=d.driverLicenseAddress)||void 0===c?void 0:c.city:null===d||void 0===d||null===(A=d.address)||void 0===A?void 0:A.city}'
    extra_fields = ',{title:"province/state",value:d&&d.driverLicenseAddress&&d.driverLicenseAddress.province||d&&d.address&&d.address.province},{title:"postal code",value:d&&d.driverLicenseAddress&&d.driverLicenseAddress.postalCode||d&&d.address&&d.address.postalCode},{title:"date of birth",value:null===d||void 0===d?void 0:d.driverLicenseDateOfBirth}'
    if '{title:"postal code"' in text and '{title:"date of birth"' in text:
        print("province/postal/dob contact fields present")
    elif city_field not in text:
        raise SystemExit("city contact field not found")
    else:
        text = text.replace(city_field, city_field + extra_fields, 1)
        print("added province/postal/dob contact fields")

    gender_item = ',{title:"gender",value:null===d||void 0===d?void 0:d.gender}'
    marker = '];return i.a.createElement("div",{className:"block-wrapper information-columns"}'
    if '{title:"gender",value:null===d||void 0===d?void 0:d.gender}' in text:
        print("gender contact field present")
    else:
        dob = '{title:"date of birth",value:null===d||void 0===d?void 0:d.driverLicenseDateOfBirth}'
        if dob + marker in text:
            text = text.replace(dob + marker, dob + gender_item + marker, 1)
        elif marker in text:
            text = text.replace(marker, gender_item + marker, 1)
        else:
            raise SystemExit("contact array end not found")
        print("added gender contact field")

    age_old = 'ql()().diff(t.driverLicenseDateOfBirth,"years",!1))),i.a.createElement("div",{className:"data-block"},i.a.createElement("span",{className:"data-caption"},"NOTIFICATIONS")'
    age_new = 'ql()().diff(t.driverLicenseDateOfBirth,"years",!1))),(null===t||void 0===t?void 0:t.driverLicenseDateOfBirth)&&i.a.createElement("div",{className:"data-block age"},i.a.createElement("span",{className:"data-caption age"},"DATE OF BIRTH"),i.a.createElement("span",{className:"data age"},t.driverLicenseDateOfBirth)),(null===t||void 0===t?void 0:t.gender)&&i.a.createElement("div",{className:"data-block age"},i.a.createElement("span",{className:"data-caption age"},"GENDER"),i.a.createElement("span",{className:"data age"},t.gender)),i.a.createElement("div",{className:"data-block"},i.a.createElement("span",{className:"data-caption"},"NOTIFICATIONS")'
    if 'DATE OF BIRTH' in text and 'data-caption age' in text:
        print("profile date of birth already present")
    elif age_old in text:
        text = text.replace(age_old, age_new, 1)
        print("added profile date of birth and gender")
    else:
        raise SystemExit("profile AGE pattern not found")

    path.write_text(text)
    print("patched", path)

# Cache-bust: same hashed filename was keeping browsers on the old bundle.
for path in list(Path("static/js").glob("main.*.chunk.js")):
    digest = hashlib.md5(path.read_bytes()).hexdigest()[:8]
    new_name = f"main.{digest}.chunk.js"
    if path.name == new_name:
        print("main chunk hash already unique", path.name)
        continue
    new_path = path.with_name(new_name)
    os.rename(path, new_path)
    map_path = Path(str(path) + ".map")
    if map_path.exists():
        os.rename(map_path, Path(str(new_path) + ".map"))
    old = path.name
    print(f"renamed {old} -> {new_name}")
    for ref in Path(".").rglob("*"):
        if not ref.is_file() or ref.suffix not in {".html", ".js", ".json", ".css", ".map"}:
            continue
        data = ref.read_text(errors="ignore")
        if old in data:
            ref.write_text(data.replace(old, new_name))

index = Path("index.html")
html = index.read_text()
if "service-worker.js?" not in html:
    html = html.replace("service-worker.js", "service-worker.js?v=license-fields")
    index.write_text(html)
    print("cache-busted service worker")
PY

grep -q 'backend.rentyourride.ca' static/js/main.*.chunk.js
grep -q 'admin.rentyourride.ca' index.html
grep -q 'DATE OF BIRTH' static/js/main.*.chunk.js
grep -q 'province/state' static/js/main.*.chunk.js
grep -q 'title:"gender"' static/js/main.*.chunk.js

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
