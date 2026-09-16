#!/usr/bin/env node
/**
 * Batch-trigger Forgot Password for migrated social-only users (Facebook / Apple).
 *
 * Calls POST /v1/auth/password/forgot for each email. Users must already exist
 * in the **new** API database (same email). Run after importing legacy users.
 *
 * Usage (from CSV export):
 *   API_BASE_URL=https://bedev.rentyourride.ca \
 *     node apps/api/scripts/send-migration-password-reset.mjs \
 *     --csv=legacy-social-only-users.csv
 *
 * Usage (query legacy DB, filter to emails present in new DB):
 *   LEGACY_DATABASE_URL=postgresql://... \
 *   DATABASE_URL=postgresql://... \
 *     node apps/api/scripts/send-migration-password-reset.mjs --from-legacy
 *
 * Options:
 *   --csv=path           CSV with `email` column (from flag-legacy-social-only-users.mjs)
 *   --from-legacy        Load emails from legacy DB (requires LEGACY_DATABASE_URL)
 *   --require-new-db     Only send if email exists in new `users` table (requires DATABASE_URL)
 *   --dry-run            Print emails that would be processed, no API calls
 *   --delay-ms=250       Pause between requests (default 250)
 *   --limit=N            Process at most N emails (testing)
 *
 * Env:
 *   API_BASE_URL         New API base URL (default http://127.0.0.1:8080)
 *   DATABASE_URL         New Postgres (optional, for --require-new-db / --from-legacy filter)
 *   LEGACY_DATABASE_URL  Legacy Postgres (required for --from-legacy)
 *
 * Note: Password reset emails are not sent by the API yet in dev — tokens are logged
 * on the API server console. Wire up email delivery before production outreach.
 */

import fs from 'node:fs';
import pg from 'pg';

const { Client } = pg;

const LEGACY_SOCIAL_ONLY_QUERY = `
SELECT DISTINCT LOWER(TRIM(u.email)) AS email
FROM "user" u
WHERE u.email IS NOT NULL
  AND TRIM(u.email) <> ''
  AND (u.password IS NULL OR TRIM(u.password) = '')
  AND u."isActive" = true
ORDER BY 1;
`;

function parseArgs(argv) {
  let csvPath = null;
  let fromLegacy = false;
  let requireNewDb = false;
  let dryRun = false;
  let delayMs = 250;
  let limit = Infinity;

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--from-legacy') fromLegacy = true;
    else if (arg === '--require-new-db') requireNewDb = true;
    else if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--csv=')) csvPath = arg.slice('--csv='.length);
    else if (arg.startsWith('--delay-ms=')) delayMs = Number(arg.slice('--delay-ms='.length)) || 250;
    else if (arg.startsWith('--limit=')) limit = Number(arg.slice('--limit='.length)) || Infinity;
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node ${argv[1]} (--csv=file.csv | --from-legacy) [options]`);
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }

  if (!csvPath && !fromLegacy) {
    console.error('Provide --csv=path or --from-legacy');
    process.exit(1);
  }
  if (csvPath && fromLegacy) {
    console.error('Use only one of --csv or --from-legacy');
    process.exit(1);
  }

  return { csvPath, fromLegacy, requireNewDb, dryRun, delayMs, limit };
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const emailIdx = headers.findIndex((h) => h.toLowerCase() === 'email');
  if (emailIdx < 0) {
    throw new Error('CSV must include an `email` column');
  }
  const emails = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].match(/("([^"]|"")*"|[^,]*)/g) || [];
    const raw = (cols[emailIdx] || '').replace(/^"|"$/g, '').replace(/""/g, '"').trim();
    if (raw) emails.push(raw.toLowerCase());
  }
  return [...new Set(emails)];
}

function readEmailsFromCsv(csvPath) {
  return parseCsv(fs.readFileSync(csvPath, 'utf8'));
}

async function readEmailsFromLegacy() {
  const connectionString = process.env.LEGACY_DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error('Missing LEGACY_DATABASE_URL for --from-legacy');
  }
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('rds.amazonaws.com') ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    const { rows } = await client.query(LEGACY_SOCIAL_ONLY_QUERY);
    return rows.map((r) => r.email);
  } finally {
    await client.end();
  }
}

async function filterToNewDbEmails(emails) {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error('Missing DATABASE_URL for --require-new-db');
  }
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('rds.amazonaws.com') ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT LOWER(TRIM(email)) AS email FROM users WHERE email IS NOT NULL`,
    );
    const inNew = new Set(rows.map((r) => r.email));
    return emails.filter((e) => inNew.has(e));
  } finally {
    await client.end();
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function triggerForgotPassword(apiBase, email) {
  const url = `${apiBase.replace(/\/$/, '')}/v1/auth/password/forgot`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
  }
  return res.json().catch(() => ({}));
}

async function main() {
  const { csvPath, fromLegacy, requireNewDb, dryRun, delayMs, limit } = parseArgs(process.argv);
  const apiBase = (process.env.API_BASE_URL || 'http://127.0.0.1:8080').trim();

  let emails = csvPath ? readEmailsFromCsv(csvPath) : await readEmailsFromLegacy();
  const totalInput = emails.length;

  if (requireNewDb || fromLegacy) {
    emails = await filterToNewDbEmails(emails);
    console.log(`Filtered to ${emails.length} email(s) present in new DB (from ${totalInput} legacy social-only).`);
  }

  if (Number.isFinite(limit) && limit > 0) {
    emails = emails.slice(0, limit);
  }

  if (emails.length === 0) {
    console.log('No emails to process.');
    process.exit(0);
  }

  console.log(`API: ${apiBase}`);
  console.log(`Mode: ${dryRun ? 'dry-run' : 'live'} | delay ${delayMs}ms | count ${emails.length}`);
  console.log('');

  if (dryRun) {
    emails.forEach((e) => console.log(e));
    process.exit(0);
  }

  let ok = 0;
  let failed = 0;
  for (let i = 0; i < emails.length; i += 1) {
    const email = emails[i];
    try {
      await triggerForgotPassword(apiBase, email);
      ok += 1;
      console.log(`[${i + 1}/${emails.length}] ok  ${email}`);
    } catch (err) {
      failed += 1;
      console.error(`[${i + 1}/${emails.length}] ERR ${email}: ${err.message}`);
    }
    if (i < emails.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  console.log('');
  console.log(`Done. triggered=${ok} failed=${failed}`);
  console.log('Check API logs for reset tokens until transactional email is enabled.');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
