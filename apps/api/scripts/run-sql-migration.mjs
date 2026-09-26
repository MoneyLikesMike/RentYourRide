import fs from 'node:fs';
import pg from 'pg';

const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error('Usage: node run-sql-migration.mjs <sql-file>');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const useSsl =
  process.env.DATABASE_SSL === '1' ||
  /sslmode=require/i.test(databaseUrl);

const client = new pg.Client({
  connectionString: databaseUrl,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

const sql = fs.readFileSync(sqlPath, 'utf8');

try {
  await client.connect();
  await client.query(sql);
  console.log('SQL migration complete');
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
