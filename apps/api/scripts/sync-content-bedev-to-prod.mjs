#!/usr/bin/env node
/**
 * Copy studio content (team members + published articles) from the bedev HTTP
 * API into the prod database, and mirror any team photos onto the prod uploads
 * volume so their URLs resolve on backend.rentyourride.ca.
 *
 * Runs on the prod API host:
 *
 *   node scripts/sync-content-bedev-to-prod.mjs [--dry-run]
 *
 * Prod has TYPEORM_SYNCHRONIZE=0 and the repo has no migrations, so this also
 * creates the two content tables if they are missing. Both statements are
 * IF NOT EXISTS and touch only these tables — nothing else in the schema is
 * inspected or altered. Rows upsert on their natural key, so re-running is safe.
 */
import { createRequire } from 'module';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

const BEDEV_BASE = (
  process.env.BEDEV_BASE || 'https://bedev.rentyourride.ca'
).replace(/\/$/, '');
const PROD_BASE = (
  process.env.PROD_BASE || 'https://backend.rentyourride.ca'
).replace(/\/$/, '');
const UPLOADS_DIR =
  process.env.UPLOADS_DIR || '/home/ec2-user/rentyourride-uploads';
const APP_ENV = process.env.APP_ENV_PATH || '/home/ec2-user/rentyourride-nest-api/.env';
const LEGACY_ENV = process.env.PROD_ENV_PATH || '/home/ec2-user/ryrbs/production.env';
const PROD_DB = process.env.NEST_DATABASE || 'rentyourride_v2';
const DRY_RUN = process.argv.includes('--dry-run');

function readEnv(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

/** Prefer the API's own DATABASE_URL; fall back to the legacy backend's creds. */
function connectionConfig() {
  if (process.env.DATABASE_URL) {
    return fromUrl(process.env.DATABASE_URL);
  }

  const appEnv = readEnv(APP_ENV);
  const fromApp = appEnv
    .split('\n')
    .find((line) => line.startsWith('DATABASE_URL='))
    ?.slice('DATABASE_URL='.length)
    .trim();
  if (fromApp) return fromUrl(fromApp);

  const legacy = readEnv(LEGACY_ENV);
  if (!legacy) {
    throw new Error(`No DATABASE_URL in ${APP_ENV} and no ${LEGACY_ENV}`);
  }
  const get = (key) => legacy.match(new RegExp(`${key}\\s*=\\s*([^\\n]+)`))?.[1].trim() ?? '';
  return {
    host: get('TYPEORM_HOST'),
    port: Number(get('TYPEORM_PORT') || 5432),
    user: get('TYPEORM_USERNAME'),
    password: get('TYPEORM_PASSWORD'),
    database: PROD_DB,
    ssl: { rejectUnauthorized: false },
  };
}

function fromUrl(raw) {
  // RDS presents a chain pg won't verify by default; drop sslmode from the URL
  // so the explicit ssl option below wins.
  const url = new URL(raw);
  url.searchParams.delete('sslmode');
  return { connectionString: url.toString(), ssl: { rejectUnauthorized: false } };
}

async function getJson(path) {
  const res = await fetch(`${BEDEV_BASE}${path}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`GET ${path} -> HTTP ${res.status}`);
  return res.json();
}

const CREATE_TEAM = `
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  role varchar(120) NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  photo_url text,
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)`;

const CREATE_ARTICLES = `
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(200) NOT NULL,
  title varchar(255) NOT NULL,
  category varchar(64) NOT NULL DEFAULT 'News',
  summary varchar(500) NOT NULL,
  body text NOT NULL DEFAULT '',
  cover_image_url text,
  author varchar(120) NOT NULL DEFAULT 'Rent Your Ride',
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)`;

/**
 * Photo URLs are stored absolute, so a copied row would otherwise keep pointing
 * at bedev. Pull the file onto the prod uploads volume and rewrite the host.
 */
async function mirrorPhoto(photoUrl) {
  if (!photoUrl) return null;
  if (photoUrl.startsWith(PROD_BASE)) return photoUrl;

  const match = photoUrl.match(/\/v1\/uploads\/team\/([^/?#]+)$/);
  if (!match) return photoUrl;

  const filename = match[1];
  const dir = join(UPLOADS_DIR, 'team');
  const dest = join(dir, filename);

  if (!DRY_RUN) {
    const res = await fetch(photoUrl, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) {
      console.warn(`  photo ${filename}: HTTP ${res.status}, keeping bedev URL`);
      return photoUrl;
    }
    mkdirSync(dir, { recursive: true });
    writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  }

  console.log(`  photo ${filename} -> ${dest}`);
  return `${PROD_BASE}/v1/uploads/team/${filename}`;
}

const [team, articles] = await Promise.all([
  getJson('/v1/team'),
  getJson('/v1/articles?limit=200'),
]);

console.log(
  `bedev: ${team.length} team member(s), ${articles.length} published article(s)`,
);
if (DRY_RUN) console.log('(dry run — no writes)');

const client = new Client(connectionConfig());
await client.connect();

if (!DRY_RUN) {
  await client.query(CREATE_TEAM);
  await client.query(CREATE_ARTICLES);
  await client.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_slug ON articles (slug)',
  );
  console.log('tables ready: team_members, articles');
}

for (const [index, member] of team.entries()) {
  const photoUrl = await mirrorPhoto(member.photoUrl);
  console.log(`team: ${member.name}`);
  if (DRY_RUN) continue;

  await client.query(
    `INSERT INTO team_members
       (id, name, role, bio, photo_url, sort_order, published, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       role = EXCLUDED.role,
       bio = EXCLUDED.bio,
       photo_url = EXCLUDED.photo_url,
       sort_order = EXCLUDED.sort_order,
       published = EXCLUDED.published,
       updated_at = now()`,
    [
      member.id,
      member.name,
      member.role ?? '',
      member.bio ?? '',
      photoUrl,
      member.sortOrder ?? index,
      member.published !== false,
    ],
  );
}

for (const article of articles) {
  console.log(`article: ${article.slug}`);
  if (DRY_RUN) continue;

  await client.query(
    `INSERT INTO articles
       (id, slug, title, category, summary, body, cover_image_url, author,
        published, published_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9::timestamptz, now(), now())
     ON CONFLICT (slug) DO UPDATE SET
       title = EXCLUDED.title,
       category = EXCLUDED.category,
       summary = EXCLUDED.summary,
       body = EXCLUDED.body,
       cover_image_url = EXCLUDED.cover_image_url,
       author = EXCLUDED.author,
       published = true,
       published_at = EXCLUDED.published_at,
       updated_at = now()`,
    [
      article.id,
      article.slug,
      article.title,
      article.category ?? 'News',
      article.summary ?? '',
      article.body ?? '',
      article.coverImageUrl ?? null,
      article.author ?? 'Rent Your Ride',
      article.publishedAt ?? article.createdAt ?? new Date().toISOString(),
    ],
  );
}

if (!DRY_RUN) {
  const counts = await client.query(
    `SELECT (SELECT count(*)::int FROM team_members WHERE published) AS team,
            (SELECT count(*)::int FROM articles WHERE published) AS articles`,
  );
  console.log(
    `PROD now has ${counts.rows[0].team} published team member(s), ` +
      `${counts.rows[0].articles} published article(s)`,
  );
}

await client.end();
