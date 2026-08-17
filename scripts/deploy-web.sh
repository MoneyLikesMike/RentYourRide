#!/usr/bin/env bash
# Build + deploy customer website (apps/web) to testing (fedev) or production (app).
#
# Mirrors mobile EAS profiles:
#   testing  → fedev.rentyourride.ca  + bedev API  + Stripe test
#   production → app.rentyourride.ca + backend API + Stripe live
#
# Usage:
#   bash scripts/deploy-web.sh testing
#   bash scripts/deploy-web.sh production
#
# Optional env:
#   WEB_INSTANCE_ID  — EC2 that serves /var/www/html for that host
#   AWS_PROFILE      — default: testing→dev, production→ryr-prod
#   DEPLOY_BUCKET    — default: testing→dev-ryrbs, production→prod-ryrbs
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-}"
[[ "$MODE" == "testing" || "$MODE" == "production" ]] || {
  echo "Usage: $0 testing|production" >&2
  exit 1
}

AWS_REGION="${AWS_REGION:-us-east-2}"
KEY="deploy/web-dist.tgz"

if [[ "$MODE" == "testing" ]]; then
  export AWS_PROFILE="${AWS_PROFILE:-dev}"
  BUCKET="${DEPLOY_BUCKET:-dev-ryrbs}"
  HOST="fedev.rentyourride.ca"
  API="https://bedev.rentyourride.ca"
  # Studio is the live CMS even on fedev; the rest of fedev remains on bedev.
  STUDIO_API="https://backend.rentyourride.ca"
  VITE_MODE="development"
  BUILD_LABEL="testing (fedev → bedev)"
else
  export AWS_PROFILE="${AWS_PROFILE:-ryr-prod}"
  BUCKET="${DEPLOY_BUCKET:-prod-ryrbs}"
  HOST="app.rentyourride.ca"
  API="https://backend.rentyourride.ca"
  STUDIO_API="$API"
  VITE_MODE="production"
  BUILD_LABEL="production (app → backend)"
fi

resolve_web_instance() {
  if [[ -n "${WEB_INSTANCE_ID:-}" ]]; then
    echo "$WEB_INSTANCE_ID"
    return
  fi
  # Prefer Name tags that match the public hostname / role.
  local query
  query=$(aws ec2 describe-instances \
    --region "$AWS_REGION" \
    --filters "Name=instance-state-name,Values=running" \
    --query "Reservations[].Instances[?Tags[?Key=='Name' && (contains(Value, '${HOST}') || contains(Value, 'web') || contains(Value, 'Web') || contains(Value, 'fe'))]].[InstanceId,Tags[?Key=='Name'].Value|[0]]" \
    --output text 2>/dev/null || true)
  if [[ -n "$query" ]]; then
    # First column = instance id
    echo "$query" | awk 'NF { print $1; exit }'
    return
  fi
  echo ""
}

INSTANCE_ID="$(resolve_web_instance)"
if [[ -z "$INSTANCE_ID" ]]; then
  echo "ERROR: Could not resolve WEB_INSTANCE_ID for $HOST." >&2
  echo "Set WEB_INSTANCE_ID=i-xxxxxxxx (the EC2 that serves /var/www/html for $HOST)," >&2
  echo "then re-run. Ensure AWS SSO is logged in: aws sso login --profile $AWS_PROFILE" >&2
  exit 1
fi

cd "$ROOT/apps/web"

echo "==> Building website for $BUILD_LABEL"
export VITE_STUDIO_API_ORIGIN="$STUDIO_API"
if [[ "$MODE" == "production" ]]; then
  export VITE_API_ORIGIN="$API"
  # Prefer live key from env / .env.production.local (never commit pk_live_)
  npm run build:prod
  bash "$ROOT/scripts/assert-web-prod-env.sh" "$ROOT/apps/web/dist"
else
  export VITE_API_ORIGIN="$API"
  npm run build:dev
fi

if [[ "$MODE" == "production" ]]; then
  echo "==> Generating sitemap from $API"
  node "$ROOT/scripts/generate-sitemap.mjs" "$ROOT/apps/web/dist" "$API" "https://www.rentyourride.ca"
else
  # fedev must never rank or it competes with production for the same content.
  echo "==> Blocking crawlers on $HOST"
  printf 'User-agent: *\nDisallow: /\n' > "$ROOT/apps/web/dist/robots.txt"
  rm -f "$ROOT/apps/web/dist/sitemap.xml"
fi

echo "==> Packing dist → s3://${BUCKET}/${KEY}"
rm -f /tmp/web-dist.tgz
tar -czf /tmp/web-dist.tgz -C dist .
aws s3 cp /tmp/web-dist.tgz "s3://${BUCKET}/${KEY}" --region "$AWS_REGION"

PARAMS=$(mktemp)
cat > "$PARAMS" <<REMOTE
{
  "commands": [
    "set -e",
    "aws s3 cp s3://${BUCKET}/${KEY} /tmp/web-dist.tgz --region ${AWS_REGION}",
    "rm -rf /tmp/web-dist && mkdir -p /tmp/web-dist",
    "tar -xzf /tmp/web-dist.tgz -C /tmp/web-dist",
    "sudo rsync -a --delete /tmp/web-dist/ /var/www/html/",
    "sudo chown -R nginx:nginx /var/www/html/ || sudo chown -R ec2-user:ec2-user /var/www/html/",
    "curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1/ || true; echo"
  ]
}
REMOTE

echo "==> Deploying to $INSTANCE_ID ($HOST) via SSM"
CMD_ID=$(aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --timeout-seconds 180 \
  --parameters "file://${PARAMS}" \
  --query Command.CommandId --output text)
rm -f "$PARAMS"

echo "SSM deploy: $CMD_ID (waiting...)"
for _ in $(seq 1 30); do
  STATUS=$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" --query Status --output text 2>/dev/null || echo Pending)
  [[ "$STATUS" == "Success" || "$STATUS" == "Failed" || "$STATUS" == "Cancelled" || "$STATUS" == "TimedOut" ]] && break
  sleep 3
done
aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" \
  --query '[Status,StandardOutputContent,StandardErrorContent]' --output text

echo ""
echo "==> Done. Open https://${HOST}"
echo "    API: $API  (vite mode: $VITE_MODE)"
echo "    Studio content API: $STUDIO_API"
