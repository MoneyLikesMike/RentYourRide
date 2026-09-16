#!/usr/bin/env node
/**
 * Create or promote an admin user for the staff dashboard.
 *
 * Usage:
 *   node scripts/create-admin-user.mjs --email okoyem@rentyourride.ca --password 'YourSecurePassword'
 *   node scripts/create-admin-user.mjs --email okoyem@rentyourride.ca --promote
 */
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import bcrypt from 'bcrypt';

const { Client } = pg;

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { email: '', password: '', promote: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email') out.email = args[++i]?.trim().toLowerCase() ?? '';
    else if (args[i] === '--password') out.password = args[++i] ?? '';
    else if (args[i] === '--promote') out.promote = true;
  }
  if (!out.email) {
    console.error('Usage: node scripts/create-admin-user.mjs --email you@example.com [--password secret | --promote]');
    process.exit(1);
  }
  if (!out.promote && !out.password) {
    console.error('Provide --password for a new admin or --promote for an existing account.');
    process.exit(1);
  }
  return out;
}

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  const profile = process.env.AWS_PROFILE || 'dev';
  const region = process.env.AWS_REGION || 'us-east-2';
  const res = spawnSync(
    'aws',
    [
      'secretsmanager',
      'get-secret-value',
      '--secret-id',
      'ryr-dev-secrets',
      '--region',
      region,
      '--profile',
      profile,
      '--query',
      'SecretString',
      '--output',
      'text',
    ],
    { encoding: 'utf8' },
  );
  if (res.status !== 0) {
    throw new Error(res.stderr || 'Could not read ryr-dev-secrets');
  }
  const url = JSON.parse(res.stdout).DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing in ryr-dev-secrets');
  return url.replace(/[?&]sslmode=[^&]+/g, '').replace(/\?$/, '');
}

async function main() {
  const { email, password, promote } = parseArgs();
  const client = new Client({
    connectionString: loadDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const existing = await client.query('SELECT id, role FROM users WHERE email = $1', [email]);
  if (existing.rows.length) {
    if (!promote) {
      const hash = await bcrypt.hash(password, 10);
      await client.query(
        `UPDATE users SET role = 'admin', password_hash = $2, is_active = true, updated_at = NOW() WHERE email = $1`,
        [email, hash],
      );
      console.log(`Updated admin password for ${email}`);
    } else {
      await client.query(
        `UPDATE users SET role = 'admin', is_active = true, updated_at = NOW() WHERE email = $1`,
        [email],
      );
      console.log(`Promoted ${email} to admin`);
    }
  } else {
    const hash = await bcrypt.hash(password, 10);
    const referral = `ADM${Date.now().toString(36).slice(-6).toUpperCase()}`;
    await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, referral_code, credits_balance)
       VALUES ($1, $2, 'Admin', 'User', 'admin', true, $3, '0')`,
      [email, hash, referral],
    );
    console.log(`Created admin user ${email}`);
  }

  await client.end();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
