#!/usr/bin/env node
/**
 * Add province / postal / DOB columns on users (prod synchronize is off).
 * Prints column names only — never connection strings or row data.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const envPath = process.env.ENV_PATH || path.join(process.cwd(), '.env');
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);

if (!env.DATABASE_URL) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const connectionString = env.DATABASE_URL
  .replace(/[?&]sslmode=[^&]+/g, '')
  .replace(/\?$/, '');

(async () => {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS address_province varchar(120)',
  );
  await client.query(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS address_postal_code varchar(32)',
  );
  await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth date');
  await client.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS gender varchar(16)",
  );
  const result = await client.query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_name = 'users'
       AND column_name IN ('address_province', 'address_postal_code', 'date_of_birth', 'gender')
     ORDER BY column_name`,
  );
  console.log(JSON.stringify(result.rows));
  await client.end();
})().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
