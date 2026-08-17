#!/bin/bash
# Deploy Nest API to Production backend EC2 (port 8081). Requires ryr-prod AWS profile.
set -euo pipefail
export AWS_PROFILE="${AWS_PROFILE:-ryr-prod}"
export AWS_REGION="${AWS_REGION:-us-east-2}"
BACKEND_INSTANCE_ID="${BACKEND_INSTANCE_ID:-i-09d2607ccc3bafef5}"
BUCKET="${DEPLOY_BUCKET:-prod-ryrbs}"
KEY="deploy/nest-api-deploy.tgz"
SECRET_ID="${SECRET_ID:-ryr-prod-secrets}"
NEST_DATABASE="${NEST_DATABASE:-rentyourride_v2}"
TYPEORM_SYNCHRONIZE="${TYPEORM_SYNCHRONIZE:-0}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
npm run build
rm -rf /tmp/ryr-nest-deploy && mkdir -p /tmp/ryr-nest-deploy
cp -r dist package.json package-lock.json scripts /tmp/ryr-nest-deploy/
(cd /tmp/ryr-nest-deploy && COPYFILE_DISABLE=1 tar -czf /tmp/nest-api-deploy.tgz .)

echo "Fetching ${SECRET_ID} (profile ${AWS_PROFILE})..."
SECRET=$(aws secretsmanager get-secret-value --secret-id "$SECRET_ID" --region "$AWS_REGION" --query SecretString --output text)
JWT=$(echo "$SECRET" | jq -r '.jwtSecret // .JWT_SECRET // empty')
STRIPE=$(echo "$SECRET" | jq -r '.stripeSecretKey // .STRIPE_SECRET_KEY // empty')
DIDIT_API_KEY=$(echo "$SECRET" | jq -r '.DIDIT_API_KEY // empty')
DIDIT_WEBHOOK_SECRET=$(echo "$SECRET" | jq -r '.DIDIT_WEBHOOK_SECRET // empty')
PHONENUMBER=$(echo "$SECRET" | jq -r '.PHONENUMBER // empty')
PINPOINT_APP=$(echo "$SECRET" | jq -r '.AWS_PINPOINT_APP_ID // empty')
PINPOINT_SENDER=$(echo "$SECRET" | jq -r '.AWS_PINPOINT_SENDER_ADDRESS // empty')
ADMIN_EMAIL=$(echo "$SECRET" | jq -r '.ADMIN_EMAIL // empty')
GEOCODE_KEY=$(echo "$SECRET" | jq -r '.GOOGLE_GEOCODING_API_KEY // .GOOGLE_MAPS_KEY // empty')
PLACES_KEY=$(echo "$SECRET" | jq -r '.GOOGLE_PLACES_API_KEY // empty')
DB_URL=$(echo "$SECRET" | jq -r '.DATABASE_URL // .NEST_DATABASE_URL // empty')

if [ -z "$DB_URL" ] || [ "$DB_URL" = "null" ]; then
  echo "Building DATABASE_URL from prod backend production.env..."
  aws s3 cp "$ROOT/scripts/get-prod-database-url.mjs" "s3://${BUCKET}/deploy/get-prod-database-url.mjs" --region "$AWS_REGION"
  RUN=$(mktemp)
  cat > "$RUN" <<REMOTE
{
  "commands": [
    "export HOME=/home/ec2-user",
    "source /home/ec2-user/.nvm/nvm.sh",
    "aws s3 cp s3://${BUCKET}/deploy/get-prod-database-url.mjs /home/ec2-user/ryrbs/scripts/get-prod-database-url.mjs --region ${AWS_REGION}",
    "cd /home/ec2-user/ryrbs",
    "NEST_DATABASE=${NEST_DATABASE} node scripts/get-prod-database-url.mjs"
  ]
}
REMOTE
  CMD_ID=$(aws ssm send-command --instance-ids "$BACKEND_INSTANCE_ID" --document-name AWS-RunShellScript --timeout-seconds 60 --parameters "file://${RUN}" --query Command.CommandId --output text)
  rm -f "$RUN"
  for _ in $(seq 1 15); do
    STATUS=$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$BACKEND_INSTANCE_ID" --query Status --output text)
    [[ "$STATUS" == "Success" || "$STATUS" == "Failed" ]] && break
    sleep 2
  done
  DB_URL=$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$BACKEND_INSTANCE_ID" --query StandardOutputContent --output text | tr -d '\r' | grep '^postgresql://' | tail -1)
  if [ -z "$DB_URL" ]; then
    echo "ERROR: Could not build DATABASE_URL"
    aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$BACKEND_INSTANCE_ID" --query StandardErrorContent --output text
    exit 1
  fi
  echo "DATABASE_URL resolved for ${NEST_DATABASE}"
fi

cat > /tmp/nest-api.env <<ENV
DATABASE_URL=${DB_URL}
DATABASE_SSL=1
TYPEORM_SYNCHRONIZE=${TYPEORM_SYNCHRONIZE}
JWT_SECRET=${JWT}
PUBLIC_BASE_URL=https://backend.rentyourride.ca
PORT=8081
NODE_ENV=production
AWS_REGION=${AWS_REGION}
UPLOADS_DIR=/home/ec2-user/rentyourride-uploads
ADMIN_BASE_URL=https://admin.rentyourride.ca
ENV

append_env() {
  local key="$1" val="$2" fallback="${3:-}"
  if [ -n "$val" ] && [ "$val" != "null" ]; then
    echo "${key}=${val}" >> /tmp/nest-api.env
  elif [ -n "$fallback" ]; then
    echo "${key}=${fallback}" >> /tmp/nest-api.env
  fi
}

append_env STRIPE_SECRET_KEY "$STRIPE"
append_env GOOGLE_GEOCODING_API_KEY "$GEOCODE_KEY"
append_env GOOGLE_PLACES_API_KEY "$PLACES_KEY"
append_env GOOGLE_OAUTH_WEB_CLIENT_ID "" "72018389432-1u5ekal6enkntlov1q2rdjn2kij823qr.apps.googleusercontent.com"
append_env GOOGLE_OAUTH_IOS_CLIENT_ID "" "72018389432-rb2t4cj7pda7on5rj4bigvjkipgoqp2k.apps.googleusercontent.com"
append_env APPLE_CLIENT_ID "" "com.rentyourride.ios"
append_env DIDIT_API_KEY "$DIDIT_API_KEY"
append_env DIDIT_WEBHOOK_SECRET "$DIDIT_WEBHOOK_SECRET"
append_env PHONENUMBER "$PHONENUMBER"
# RentYourRidePinpoint-production — without this every email is only logged.
append_env AWS_PINPOINT_APP_ID "$PINPOINT_APP" "7cd30b694f16415999c21780666247b9"
append_env AWS_PINPOINT_SENDER_ADDRESS "$PINPOINT_SENDER" "donotreply@rentyourride.ca"
append_env ADMIN_EMAIL "$ADMIN_EMAIL" "donotreply@rentyourride.ca"
echo "BEDEV_API_BASE_URL=https://bedev.rentyourride.ca" >> /tmp/nest-api.env
chmod 600 /tmp/nest-api.env

aws s3 cp /tmp/nest-api-deploy.tgz "s3://${BUCKET}/${KEY}"
aws s3 cp /tmp/nest-api.env "s3://${BUCKET}/deploy/nest-api.env"

PARAMS=$(mktemp)
cat > "$PARAMS" <<REMOTE
{
  "commands": [
    "set -e",
    "export HOME=/home/ec2-user",
    "source /home/ec2-user/.nvm/nvm.sh",
    "APP_DIR=/home/ec2-user/rentyourride-nest-api",
    "UPLOADS_DIR=/home/ec2-user/rentyourride-uploads",
    "mkdir -p \$UPLOADS_DIR/listings \$UPLOADS_DIR/avatars \$UPLOADS_DIR/articles \$UPLOADS_DIR/team",
    "chown -R ec2-user:ec2-user \$UPLOADS_DIR",
    "rm -rf \$APP_DIR && mkdir -p \$APP_DIR /tmp/nest-extract",
    "aws s3 cp s3://${BUCKET}/deploy/nest-api-deploy.tgz /tmp/nest-api-deploy.tgz --region ${AWS_REGION}",
    "aws s3 cp s3://${BUCKET}/deploy/nest-api.env \$APP_DIR/.env --region ${AWS_REGION}",
    "chmod 600 \$APP_DIR/.env",
    "tar -xzf /tmp/nest-api-deploy.tgz -C /tmp/nest-extract",
    "cp -a /tmp/nest-extract/. \$APP_DIR/",
    "chown -R ec2-user:ec2-user \$APP_DIR",
    "cd \$APP_DIR && sudo -u ec2-user bash -lc 'source /home/ec2-user/.nvm/nvm.sh && npm ci --omit=dev'",
    "pm2 kill 2>/dev/null || true",
    "chown -R ec2-user:ec2-user /home/ec2-user/.pm2 2>/dev/null || true",
    "sudo -u ec2-user bash -lc 'source /home/ec2-user/.nvm/nvm.sh && cd /home/ec2-user/rentyourride-nest-api && pm2 delete ryr-nest-api 2>/dev/null || true'",
    "sudo -u ec2-user bash -lc 'source /home/ec2-user/.nvm/nvm.sh && cd /home/ec2-user/rentyourride-nest-api && pm2 start dist/main.js --name ryr-nest-api'",
    "sudo -u ec2-user bash -lc 'source /home/ec2-user/.nvm/nvm.sh && pm2 save'",
    "sleep 12",
    "curl -sf http://127.0.0.1:8081/v1/health; echo",
    "sudo -u ec2-user bash -lc 'source /home/ec2-user/.nvm/nvm.sh && pm2 list' | head -8"
  ]
}
REMOTE

CMD_ID=$(aws ssm send-command \
  --instance-ids "$BACKEND_INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --timeout-seconds 600 \
  --parameters "file://${PARAMS}" \
  --query Command.CommandId --output text)
rm -f "$PARAMS"
echo "SSM command: $CMD_ID (waiting...)"
for _ in $(seq 1 24); do
  STATUS=$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$BACKEND_INSTANCE_ID" --query Status --output text)
  [[ "$STATUS" == "Success" || "$STATUS" == "Failed" ]] && break
  sleep 10
done
aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$BACKEND_INSTANCE_ID" \
  --query '[Status,StandardOutputContent,StandardErrorContent]' --output text | tail -40
