#!/usr/bin/env node
/**
 * One-time audit: list legacy users with no password (Facebook / Apple sign-in).
 *
 * These users need Forgot Password in the new app after migration — Facebook
 * Login is removed from RentYourRide v3.
 *
 * Usage:
 *   LEGACY_DATABASE_URL='postgresql://user:pass@host:5432/db' \
 *     node apps/api/scripts/flag-legacy-social-only-users.mjs
 *
 * Options:
 *   --csv=out.csv       Write CSV export (default: stdout table only)
 *   --include-inactive  Include isActive = false accounts
 *
 * Env:
 *   LEGACY_DATABASE_URL — legacy Postgres connection string (required)
 */

import fs from 'node:fs';
import pg from 'pg';

const { Client } = pg;

function parseArgs(argv) {
  let csvPath = null;
  let includeInactive = false;
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--include-inactive') {
      includeInactive = true;
    } else if (arg.startsWith('--csv=')) {
      csvPath = arg.slice('--csv='.length);
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: LEGACY_DATABASE_URL=... node ${argv[1]} [--csv=file.csv] [--include-inactive]`);
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }
  return { csvPath, includeInactive };
}

const QUERY = `
SELECT
  u.id AS legacy_user_id,
  u.email,
  u."firstName" AS first_name,
  u."lastName" AS last_name,
  u."isEmailVerified" AS email_verified,
  u."isPhoneVerified" AS phone_verified,
  u."loginsCount" AS login_count,
  u."createdAt" AS created_at,
  'needs_password_setup' AS migration_flag,
  'forgot_password' AS recommended_action
FROM "user" u
WHERE u.email IS NOT NULL
  AND TRIM(u.email) <> ''
  AND (u.password IS NULL OR TRIM(u.password) = '')
  AND ($1::boolean OR u."isActive" = true)
ORDER BY u."createdAt" DESC;
`;

function escapeCsv(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  const { csvPath, includeInactive } = parseArgs(process.argv);
  const connectionString = process.env.LEGACY_DATABASE_URL?.trim();
  if (!connectionString) {
    console.error('Missing LEGACY_DATABASE_URL (legacy Postgres connection string).');
    console.error('Example: LEGACY_DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/rentyourride node apps/api/scripts/flag-legacy-social-only-users.mjs');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: connectionString.includes('sslmode=require') || connectionString.includes('rds.amazonaws.com')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();
  try {
    const { rows } = await client.query(QUERY, [includeInactive]);
    const count = rows.length;

    console.log('');
    console.log('Legacy social-only users (no password — Facebook / Apple sign-in)');
    console.log(`Active only: ${includeInactive ? 'no (including inactive)' : 'yes'}`);
    console.log(`Total: ${count}`);
    console.log('');
    console.log('Recommended: email each user a Forgot Password link before disabling legacy Facebook Login.');
    console.log('');

    if (count === 0) {
      console.log('No matching users.');
    } else {
      console.table(
        rows.slice(0, 25).map((r) => ({
          id: r.legacy_user_id,
          email: r.email,
          name: [r.first_name, r.last_name].filter(Boolean).join(' ') || '—',
          logins: r.login_count,
          created: r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '—',
          flag: r.migration_flag,
        })),
      );
      if (count > 25) {
        console.log(`… and ${count - 25} more (use --csv= to export all).`);
      }
    }

    if (csvPath) {
      fs.writeFileSync(csvPath, toCsv(rows), 'utf8');
      console.log(`\nWrote ${count} rows to ${csvPath}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
