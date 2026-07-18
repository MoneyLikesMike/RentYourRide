#!/usr/bin/env bash
# Full production cutover: DB → API → ALB → admin → mobile upload.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export AWS_PROFILE="${AWS_PROFILE:-ryr-prod}"
export AWS_REGION="${AWS_REGION:-us-east-2}"
export BACKEND_INSTANCE_ID="${BACKEND_INSTANCE_ID:-i-09d2607ccc3bafef5}"
NEST_DATABASE="${NEST_DATABASE:-rentyourride_v2}"

echo "==> RentYourRide production go-live"
echo "    AWS profile: ${AWS_PROFILE}"
echo "    Backend EC2: ${BACKEND_INSTANCE_ID}"
echo ""

step() { echo ""; echo "======== $* ========"; }

step "1/7 Create Nest database (${NEST_DATABASE}) if missing"
PARAMS=$(mktemp)
cat > "$PARAMS" <<'REMOTE'
{
  "commands": [
    "export HOME=/home/ec2-user",
    "source /home/ec2-user/.nvm/nvm.sh",
    "cd /home/ec2-user/ryrbs",
    "node -e \"const {Client}=require('pg');const fs=require('fs');const e=fs.readFileSync('production.env','utf8');const g=k=>((e.match(new RegExp(k+'\\\\s*=\\\\s*([^\\\\n]+)')))||[])[1]?.trim();(async()=>{const c=new Client({host:g('TYPEORM_HOST'),port:5432,user:g('TYPEORM_USERNAME'),password:g('TYPEORM_PASSWORD'),database:'postgres',ssl:{rejectUnauthorized:false}});await c.connect();const db='NEST_DB_PLACEHOLDER';const exists=await c.query('SELECT 1 FROM pg_database WHERE datname=$1',[db]);if(!exists.rowCount){await c.query('CREATE DATABASE \\\"'+db+'\\\"');console.log('created',db);}else{console.log('exists',db);}await c.end();})().catch(x=>{console.error(x.message);process.exit(1);});\""
  ]
}
REMOTE
sed -i '' "s/NEST_DB_PLACEHOLDER/${NEST_DATABASE}/g" "$PARAMS" 2>/dev/null || sed -i "s/NEST_DB_PLACEHOLDER/${NEST_DATABASE}/g" "$PARAMS"
CMD_ID=$(aws ssm send-command --instance-ids "$BACKEND_INSTANCE_ID" --document-name AWS-RunShellScript --timeout-seconds 120 --parameters "file://${PARAMS}" --query Command.CommandId --output text)
rm -f "$PARAMS"
for _ in $(seq 1 20); do sleep 3; STATUS=$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$BACKEND_INSTANCE_ID" --query Status --output text); [[ "$STATUS" == "Success" || "$STATUS" == "Failed" ]] && break; done
aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$BACKEND_INSTANCE_ID" --query '[Status,StandardOutputContent,StandardErrorContent]' --output text

step "2/7 Deploy Nest API (schema sync)"
TYPEORM_SYNCHRONIZE=1 npm run api:deploy:prod

step "3/7 Migrate legacy users into ${NEST_DATABASE}"
PARAMS=$(mktemp)
cat > "$PARAMS" <<'REMOTE'
{
  "commands": [
    "export HOME=/home/ec2-user",
    "source /home/ec2-user/.nvm/nvm.sh",
    "cd /home/ec2-user/rentyourride-nest-api",
    "NEST_DATABASE=NEST_DB_PLACEHOLDER node scripts/migrate-prod-users.mjs"
  ]
}
REMOTE
sed -i '' "s/NEST_DB_PLACEHOLDER/${NEST_DATABASE}/g" "$PARAMS" 2>/dev/null || sed -i "s/NEST_DB_PLACEHOLDER/${NEST_DATABASE}/g" "$PARAMS"
CMD_ID=$(aws ssm send-command --instance-ids "$BACKEND_INSTANCE_ID" --document-name AWS-RunShellScript --timeout-seconds 600 --parameters "file://${PARAMS}" --query Command.CommandId --output text)
rm -f "$PARAMS"
for _ in $(seq 1 40); do sleep 5; STATUS=$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$BACKEND_INSTANCE_ID" --query Status --output text); [[ "$STATUS" == "Success" || "$STATUS" == "Failed" ]] && break; done
aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$BACKEND_INSTANCE_ID" --query '[Status,StandardOutputContent,StandardErrorContent]' --output text

step "4/7 Redeploy Nest API (sync off)"
TYPEORM_SYNCHRONIZE=0 npm run api:deploy:prod

step "5/7 Configure ALB routing"
bash apps/api/scripts/setup-prod-alb.sh

step "6/7 Deploy admin dashboard"
npm run admin:deploy:prod

step "7/7 Build & upload production iOS binary"
FORCE_ARCHIVE=1 npm run ios:testflight:upload

echo ""
echo "==> Go-live automation finished."
echo "    Verify: curl -s https://backend.rentyourride.ca/v1/health"
echo "    App Store Connect: submit build for review (same listing, no metadata changes)."
