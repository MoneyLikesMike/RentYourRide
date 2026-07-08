#!/bin/bash
# Deploy Nest API to Dev backend EC2 (port 8081). Run from repo root with AWS SSO logged in.
set -euo pipefail
export AWS_PROFILE="${AWS_PROFILE:-dev}"
export AWS_REGION="${AWS_REGION:-us-east-2}"
BACKEND_INSTANCE_ID="${BACKEND_INSTANCE_ID:-i-0107286b48e4e5189}"
BUCKET="dev-ryrbs"
KEY="deploy/nest-api-deploy.tgz"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
npm run build
rm -rf /tmp/ryr-nest-deploy && mkdir -p /tmp/ryr-nest-deploy
cp -r dist package.json package-lock.json /tmp/ryr-nest-deploy/
# node_modules are installed on EC2 (Linux) — do not bundle macOS native addons like bcrypt
(cd /tmp/ryr-nest-deploy && COPYFILE_DISABLE=1 tar -czf /tmp/nest-api-deploy.tgz .)

echo "Fetching ryr-dev-secrets (local AWS profile; EC2 role cannot read Secrets Manager)..."
SECRET=$(aws secretsmanager get-secret-value --secret-id ryr-dev-secrets --region "$AWS_REGION" --query SecretString --output text)
DB_URL=$(echo "$SECRET" | jq -r .DATABASE_URL)
JWT=$(echo "$SECRET" | jq -r '.jwtSecret // .JWT_SECRET // empty')
PUB=$(echo "$SECRET" | jq -r '.PUBLIC_BASE_URL // empty')
STRIPE=$(echo "$SECRET" | jq -r '.STRIPE_SECRET_KEY // empty')
PHONENUMBER=$(echo "$SECRET" | jq -r '.PHONENUMBER // empty')
GEOCODE_KEY=$(echo "$SECRET" | jq -r '.GOOGLE_GEOCODING_API_KEY // .GOOGLE_MAPS_KEY // empty')
PLACES_KEY=$(echo "$SECRET" | jq -r '.GOOGLE_PLACES_API_KEY // empty')
GOOGLE_OAUTH_WEB=$(echo "$SECRET" | jq -r '.GOOGLE_OAUTH_WEB_CLIENT_ID // empty')
GOOGLE_OAUTH_IOS=$(echo "$SECRET" | jq -r '.GOOGLE_OAUTH_IOS_CLIENT_ID // empty')
APPLE_CLIENT=$(echo "$SECRET" | jq -r '.APPLE_CLIENT_ID // empty')
DIDIT_API_KEY=$(echo "$SECRET" | jq -r '.DIDIT_API_KEY // empty')
DIDIT_WEBHOOK_SECRET=$(echo "$SECRET" | jq -r '.DIDIT_WEBHOOK_SECRET // empty')
cat > /tmp/nest-api.env <<ENV
DATABASE_URL=${DB_URL}
DATABASE_SSL=1
TYPEORM_SYNCHRONIZE=1
JWT_SECRET=${JWT}
PUBLIC_BASE_URL=${PUB}
PORT=8081
NODE_ENV=production
AWS_REGION=${AWS_REGION}
SMS_EXPOSE_CODE=1
ENV
if [ -n "$STRIPE" ] && [ "$STRIPE" != "null" ]; then
  echo "STRIPE_SECRET_KEY=${STRIPE}" >> /tmp/nest-api.env
fi
if [ -n "$PHONENUMBER" ] && [ "$PHONENUMBER" != "null" ]; then
  echo "PHONENUMBER=${PHONENUMBER}" >> /tmp/nest-api.env
fi
if [ -n "$GEOCODE_KEY" ] && [ "$GEOCODE_KEY" != "null" ]; then
  echo "GOOGLE_GEOCODING_API_KEY=${GEOCODE_KEY}" >> /tmp/nest-api.env
fi
if [ -n "$PLACES_KEY" ] && [ "$PLACES_KEY" != "null" ]; then
  echo "GOOGLE_PLACES_API_KEY=${PLACES_KEY}" >> /tmp/nest-api.env
fi
if [ -n "$GOOGLE_OAUTH_WEB" ] && [ "$GOOGLE_OAUTH_WEB" != "null" ]; then
  echo "GOOGLE_OAUTH_WEB_CLIENT_ID=${GOOGLE_OAUTH_WEB}" >> /tmp/nest-api.env
else
  echo "GOOGLE_OAUTH_WEB_CLIENT_ID=72018389432-1u5ekal6enkntlov1q2rdjn2kij823qr.apps.googleusercontent.com" >> /tmp/nest-api.env
fi
if [ -n "$GOOGLE_OAUTH_IOS" ] && [ "$GOOGLE_OAUTH_IOS" != "null" ]; then
  echo "GOOGLE_OAUTH_IOS_CLIENT_ID=${GOOGLE_OAUTH_IOS}" >> /tmp/nest-api.env
else
  echo "GOOGLE_OAUTH_IOS_CLIENT_ID=72018389432-rb2t4cj7pda7on5rj4bigvjkipgoqp2k.apps.googleusercontent.com" >> /tmp/nest-api.env
fi
if [ -n "$APPLE_CLIENT" ] && [ "$APPLE_CLIENT" != "null" ]; then
  echo "APPLE_CLIENT_ID=${APPLE_CLIENT}" >> /tmp/nest-api.env
else
  echo "APPLE_CLIENT_ID=com.rentyourride.ios" >> /tmp/nest-api.env
fi
if [ -n "$DIDIT_API_KEY" ] && [ "$DIDIT_API_KEY" != "null" ]; then
  echo "DIDIT_API_KEY=${DIDIT_API_KEY}" >> /tmp/nest-api.env
fi
if [ -n "$DIDIT_WEBHOOK_SECRET" ] && [ "$DIDIT_WEBHOOK_SECRET" != "null" ]; then
  echo "DIDIT_WEBHOOK_SECRET=${DIDIT_WEBHOOK_SECRET}" >> /tmp/nest-api.env
fi
chmod 600 /tmp/nest-api.env

aws s3 cp /tmp/nest-api-deploy.tgz "s3://${BUCKET}/${KEY}"
aws s3 cp /tmp/nest-api.env "s3://${BUCKET}/deploy/nest-api.env"

PARAMS=$(mktemp)
cat > "$PARAMS" <<'REMOTE'
{
  "commands": [
    "set -e",
    "export HOME=/home/ec2-user",
    "source /home/ec2-user/.nvm/nvm.sh",
    "APP_DIR=/home/ec2-user/rentyourride-nest-api",
    "rm -rf $APP_DIR && mkdir -p $APP_DIR /tmp/nest-extract",
    "aws s3 cp s3://dev-ryrbs/deploy/nest-api-deploy.tgz /tmp/nest-api-deploy.tgz --region us-east-2",
    "aws s3 cp s3://dev-ryrbs/deploy/nest-api.env $APP_DIR/.env --region us-east-2",
    "chmod 600 $APP_DIR/.env",
    "tar -xzf /tmp/nest-api-deploy.tgz -C /tmp/nest-extract",
    "cp -a /tmp/nest-extract/. $APP_DIR/",
    "chown -R ec2-user:ec2-user $APP_DIR",
    "cd $APP_DIR && sudo -u ec2-user bash -lc 'source /home/ec2-user/.nvm/nvm.sh && npm ci --omit=dev'",
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
