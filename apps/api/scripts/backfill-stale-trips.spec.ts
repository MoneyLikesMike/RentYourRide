import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const script = path.join(__dirname, 'backfill-stale-trips.ts');

describe('backfill-stale-trips dry-run', () => {
  it('exits non-zero without DATABASE_URL and prints dry-run guidance', () => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', script],
      {
        // Empty string beats dotenv/.env so the script fails before connecting.
        env: { ...process.env, DATABASE_URL: '' },
        encoding: 'utf8',
      },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr || result.stdout || '', /DATABASE_URL/);
  });

  it('--apply without BACKFILL_APPROVED_BY fails', () => {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', script, '--apply'],
      {
        env: {
          ...process.env,
          DATABASE_URL: 'postgres://x',
          BACKFILL_APPROVED_BY: '',
        },
        encoding: 'utf8',
      },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr || '', /BACKFILL_APPROVED_BY/);
  });
});
