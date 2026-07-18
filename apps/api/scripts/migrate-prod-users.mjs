#!/usr/bin/env node
/**
 * Migrate legacy `"user"` rows (rentyourridePRODUCTION) into Nest `users` (rentyourride_v2).
 * Run on prod backend EC2 where both DBs are reachable.
 *
 *   source /home/ec2-user/.nvm/nvm.sh
 *   cd /home/ec2-user/rentyourride-nest-api
 *   node scripts/migrate-prod-users.mjs
 */
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { randomBytes } from 'crypto';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

const LEGACY_ENV = process.env.LEGACY_ENV_PATH || '/home/ec2-user/ryrbs/production.env';
const NEW_DB = process.env.NEST_DATABASE || 'rentyourride_v2';
const DRY_RUN = process.argv.includes('--dry-run');

/** PHP / legacy bcrypt uses `$2y$`; node-bcrypt expects `$2a$` or `$2b$`. */
function normalizeBcryptHash(hash) {
  if (hash && hash.startsWith('$2y$')) {
    return `$2a$${hash.slice(4)}`;
  }
  return hash;
}

function parseEnvFile(path) {
  const text = readFileSync(path, 'utf8');
  const get = (key) => {
    const m = text.match(new RegExp(`${key}\\s*=\\s*([^\\n]+)`));
    return m ? m[1].trim() : '';
  };
  return {
    host: get('TYPEORM_HOST'),
    port: Number(get('TYPEORM_PORT') || 5432),
    user: get('TYPEORM_USERNAME'),
    password: get('TYPEORM_PASSWORD'),
    legacyDatabase: get('TYPEORM_DATABASE') || 'rentyourridePRODUCTION',
  };
}

function referralCode() {
  return randomBytes(4).toString('hex');
}

function mapRole(legacyRole) {
  if (legacyRole === 'admin') return 'admin';
  return 'guest';
}

async function main() {
  const cfg = parseEnvFile(LEGACY_ENV);
  if (!cfg.host || !cfg.password) {
    throw new Error(`Could not parse DB config from ${LEGACY_ENV}`);
  }

  const legacy = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.legacyDatabase,
    ssl: { rejectUnauthorized: false },
  });
  const nest = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: NEW_DB,
    ssl: { rejectUnauthorized: false },
  });

  await legacy.connect();
  await nest.connect();

  const { rows: legacyUsers } = await legacy.query(`
    SELECT
      id,
      email,
      password,
      "firstName",
      "lastName",
      role,
      "phoneNumber",
      "isPhoneVerified",
      "isEmailVerified",
      "isActive",
      "isBanned",
      about,
      "stripeCustomerId",
      "stripeConnectAccountId",
      "isTextNotificationsTurnOn",
      "isEmailNotificationsTurnOn",
      "isPushNotificationsTurnOn",
      "referralCredit",
      "licenceVerificationStatus",
      "isDocumentsVerified"
    FROM "user"
    WHERE email IS NOT NULL AND trim(email) <> ''
    ORDER BY id
  `);

  const { rows: existing } = await nest.query('SELECT email FROM users');
  const existingEmails = new Set(existing.map((r) => r.email.toLowerCase()));

  let inserted = 0;
  let skipped = 0;

  for (const u of legacyUsers) {
    const email = String(u.email).trim().toLowerCase();
    if (existingEmails.has(email)) {
      skipped += 1;
      continue;
    }
    if (!u.isActive || u.isBanned) {
      skipped += 1;
      continue;
    }

    const licenseVerified =
      u.licenceVerificationStatus === 'verified' || u.isDocumentsVerified === true;

    const params = [
      email,
      normalizeBcryptHash(u.password) || null,
      u.firstName || '',
      u.lastName || '',
      mapRole(u.role),
      u.phoneNumber || null,
      !!u.isPhoneVerified,
      !!u.isEmailVerified,
      u.about || null,
      u.stripeCustomerId || null,
      u.stripeConnectAccountId || null,
      referralCode(),
      String(u.referralCredit || 0),
      JSON.stringify({
        textNotif: u.isTextNotificationsTurnOn !== false,
        emailNotif: u.isEmailNotificationsTurnOn !== false,
        pushNotif: !!u.isPushNotificationsTurnOn,
      }),
      licenseVerified,
      u.licenceVerificationStatus || null,
    ];

    if (DRY_RUN) {
      inserted += 1;
      continue;
    }

    await nest.query(
      `INSERT INTO users (
        email, password_hash, first_name, last_name, role,
        phone, phone_verified, email_verified, about_bio,
        stripe_customer_id, stripe_connect_account_id,
        referral_code, credits_balance, notification_settings,
        license_verified, license_verification_status,
        is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11,
        $12, $13, $14::jsonb,
        $15, $16,
        true, NOW(), NOW()
      )`,
      params,
    );
    existingEmails.add(email);
    inserted += 1;
  }

  const { rows: countRows } = await nest.query('SELECT COUNT(*)::int AS c FROM users');
  console.log(
    JSON.stringify(
      {
        dryRun: DRY_RUN,
        legacyTotal: legacyUsers.length,
        inserted,
        skipped,
        nestUsersTotal: countRows[0].c,
      },
      null,
      2,
    ),
  );

  await legacy.end();
  await nest.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
