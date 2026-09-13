import { createRequire } from 'module';
import { readFileSync } from 'fs';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Usage: node check-user-login.mjs email@example.com');
  process.exit(1);
}

const env = readFileSync('/home/ec2-user/ryrbs/production.env', 'utf8');
const g = (k) => ((env.match(new RegExp(k + '\\s*=\\s*([^\\n]+)'))) || [])[1]?.trim();

const base = {
  host: g('TYPEORM_HOST'),
  port: 5432,
  user: g('TYPEORM_USERNAME'),
  password: g('TYPEORM_PASSWORD'),
  ssl: { rejectUnauthorized: false },
};

const nest = new Client({ ...base, database: 'rentyourride_v2' });
const legacy = new Client({ ...base, database: 'rentyourridePRODUCTION' });

await nest.connect();
const nu = await nest.query(
  `SELECT id, email, password_hash IS NOT NULL AS has_pw,
          length(password_hash) AS pw_len,
          left(password_hash, 7) AS pw_prefix,
          role, is_active, email_verified
   FROM users WHERE lower(email) = $1`,
  [email],
);
console.log('NEST', JSON.stringify(nu.rows[0] || null));

await legacy.connect();
const lu = await legacy.query(
  `SELECT id, email, password IS NOT NULL AS has_pw,
          length(password) AS pw_len,
          left(password, 7) AS pw_prefix,
          role, "isActive", "isBanned"
   FROM "user" WHERE lower(email) = $1`,
  [email],
);
console.log('LEGACY', JSON.stringify(lu.rows[0] || null));

await nest.end();
await legacy.end();
