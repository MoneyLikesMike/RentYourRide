const fs = require('node:fs');
const { Client } = require('pg');

function buildClientConfig(databaseUrl) {
  const useSsl =
    process.env.DATABASE_SSL === '1' ||
    /sslmode=/i.test(databaseUrl);

  let connectionString = databaseUrl;
  if (useSsl) {
    connectionString = connectionString
      .replace(/([?&])sslmode=[^&]*/gi, '$1')
      .replace(/[?&]$/, '');
  }

  return {
    connectionString,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error('Usage: node run-sql-migration.cjs <sql-file>');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const client = new Client(buildClientConfig(databaseUrl));

const sql = fs.readFileSync(sqlPath, 'utf8');

(async () => {
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
})();
