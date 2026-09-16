#!/usr/bin/env bash
set -euo pipefail
export AWS_PROFILE="${AWS_PROFILE:-ryr-prod}"
export AWS_REGION="${AWS_REGION:-us-east-2}"
BACKEND_INSTANCE_ID="${BACKEND_INSTANCE_ID:-i-09d2607ccc3bafef5}"
NEST_DATABASE="${NEST_DATABASE:-rentyourride_v2}"

PARAMS=$(mktemp)
cat > "$PARAMS" <<'REMOTE'
{
  "commands": [
    "python3 /home/ec2-user/ryrbs/scripts/create_nest_db.py"
  ]
}
REMOTE

# Upload python script via S3
PY=$(mktemp)
cat > "$PY" <<'PYEOF'
import os, re
db = os.environ.get("NEST_DATABASE", "rentyourride_v2")
text = open("/home/ec2-user/ryrbs/production.env").read()
def g(k):
    m = re.search(k + r"\s*=\s*([^\n]+)", text)
    return m.group(1).strip() if m else ""
import psycopg2
conn = psycopg2.connect(host=g("TYPEORM_HOST"), port=5432, user=g("TYPEORM_USERNAME"), password=g("TYPEORM_PASSWORD"), dbname="postgres", sslmode="require")
conn.autocommit = True
cur = conn.cursor()
cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db,))
if cur.fetchone():
    print("exists", db)
else:
    cur.execute('CREATE DATABASE "' + db.replace('"', '') + '"')
    print("created", db)
cur.close()
conn.close()
PYEOF

aws s3 cp "$PY" "s3://prod-ryrbs/deploy/create_nest_db.py" --region "$AWS_REGION"
rm -f "$PY"

FETCH_AND_RUN=$(mktemp)
cat > "$FETCH_AND_RUN" <<REMOTE
{
  "commands": [
    "mkdir -p /home/ec2-user/ryrbs/scripts",
    "aws s3 cp s3://prod-ryrbs/deploy/create_nest_db.py /home/ec2-user/ryrbs/scripts/create_nest_db.py --region ${AWS_REGION}",
    "python3 -c \"import re,os; db='${NEST_DATABASE}'; text=open('/home/ec2-user/ryrbs/production.env').read(); g=lambda k: (re.search(k+r'\\\\s*=\\\\s*([^\\\\n]+)', text) or [None,None])[1].strip() if re.search(k+r'\\\\s*=\\\\s*([^\\\\n]+)', text) else ''; import subprocess,sys; host=g('TYPEORM_HOST'); user=g('TYPEORM_USERNAME'); pw=g('TYPEORM_PASSWORD'); import json; print('host',host)\""
  ]
}
REMOTE

# Simpler: use node from ryrbs with a one-line file uploaded to s3 as .mjs
NODE_SCRIPT=$(mktemp)
cat > "$NODE_SCRIPT" <<'JSEOF'
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const { Client } = require('pg');
const dbName = process.env.NEST_DATABASE || 'rentyourride_v2';
const env = readFileSync('/home/ec2-user/ryrbs/production.env', 'utf8');
const g = (k) => ((env.match(new RegExp(k + '\\s*=\\s*([^\\n]+)'))) || [])[1]?.trim();
const client = new Client({ host: g('TYPEORM_HOST'), port: 5432, user: g('TYPEORM_USERNAME'), password: g('TYPEORM_PASSWORD'), database: 'postgres', ssl: { rejectUnauthorized: false } });
await client.connect();
const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
if (!exists.rowCount) {
  await client.query(`CREATE DATABASE "${dbName}"`);
  console.log('created', dbName);
} else {
  console.log('exists', dbName);
}
await client.end();
JSEOF

aws s3 cp "$NODE_SCRIPT" "s3://prod-ryrbs/deploy/create_nest_db.mjs" --region "$AWS_REGION"
rm -f "$NODE_SCRIPT" "$FETCH_AND_RUN"

RUN=$(mktemp)
cat > "$RUN" <<REMOTE
{
  "commands": [
    "export HOME=/home/ec2-user",
    "source /home/ec2-user/.nvm/nvm.sh",
    "aws s3 cp s3://prod-ryrbs/deploy/create_nest_db.mjs /home/ec2-user/ryrbs/scripts/create_nest_db.mjs --region ${AWS_REGION}",
    "cd /home/ec2-user/ryrbs",
    "NEST_DATABASE=${NEST_DATABASE} node scripts/create_nest_db.mjs"
  ]
}
REMOTE

CMD_ID=$(aws ssm send-command --instance-ids "$BACKEND_INSTANCE_ID" --document-name AWS-RunShellScript --timeout-seconds 120 --parameters "file://${RUN}" --query Command.CommandId --output text)
rm -f "$RUN" "$PARAMS"
for _ in $(seq 1 20); do sleep 3; STATUS=$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$BACKEND_INSTANCE_ID" --query Status --output text); [[ "$STATUS" == "Success" || "$STATUS" == "Failed" ]] && break; done
aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$BACKEND_INSTANCE_ID" --query '[Status,StandardOutputContent,StandardErrorContent]' --output text
