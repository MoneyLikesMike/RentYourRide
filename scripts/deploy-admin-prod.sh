#!/usr/bin/env bash
# Build admin dashboard for production and deploy to admin EC2 (/var/www/html).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export AWS_PROFILE="${AWS_PROFILE:-ryr-prod}"
export AWS_REGION="${AWS_REGION:-us-east-2}"
ADMIN_INSTANCE_ID="${ADMIN_INSTANCE_ID:-i-0a68bf9ea1bb7c22f}"
BUCKET="${DEPLOY_BUCKET:-prod-ryrbs}"
KEY="deploy/admin-dist.tgz"

cd "$ROOT/apps/admin"
echo "==> Building admin for production (VITE_API_ORIGIN=https://backend.rentyourride.ca)"
npm run build

rm -f /tmp/admin-dist.tgz
tar -czf /tmp/admin-dist.tgz -C dist .
aws s3 cp /tmp/admin-dist.tgz "s3://${BUCKET}/${KEY}" --region "$AWS_REGION"

PARAMS=$(mktemp)
cat > "$PARAMS" <<REMOTE
{
  "commands": [
    "set -e",
    "aws s3 cp s3://${BUCKET}/${KEY} /tmp/admin-dist.tgz --region ${AWS_REGION}",
    "rm -rf /tmp/admin-dist && mkdir -p /tmp/admin-dist",
    "tar -xzf /tmp/admin-dist.tgz -C /tmp/admin-dist",
    "sudo rsync -a --delete /tmp/admin-dist/ /var/www/html/",
    "sudo chown -R nginx:nginx /var/www/html/",
    "curl -sf http://127.0.0.1/health; echo"
  ]
}
REMOTE

CMD_ID=$(aws ssm send-command \
  --instance-ids "$ADMIN_INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --timeout-seconds 120 \
  --parameters "file://${PARAMS}" \
  --query Command.CommandId --output text)
rm -f "$PARAMS"

echo "SSM deploy: $CMD_ID (waiting...)"
for _ in $(seq 1 20); do
  STATUS=$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$ADMIN_INSTANCE_ID" --query Status --output text)
  [[ "$STATUS" == "Success" || "$STATUS" == "Failed" ]] && break
  sleep 3
done
aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$ADMIN_INSTANCE_ID" \
  --query '[Status,StandardOutputContent,StandardErrorContent]' --output text

echo ""
echo "==> Done. Open https://admin.rentyourride.ca"
