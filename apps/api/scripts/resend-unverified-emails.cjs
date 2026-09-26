#!/usr/bin/env node
/**
 * Resend email-verification links (website /verify-email?token=…) to every
 * active, non-deleted user with email_verified = false.
 *
 * Run on the Nest API host (needs DB + Pinpoint credentials from .env):
 *
 *   cd /home/ec2-user/rentyourride-nest-api
 *   node scripts/resend-unverified-emails.cjs --dry-run
 *   node scripts/resend-unverified-emails.cjs --delay-ms=400
 *
 * Options:
 *   --dry-run       List recipients only
 *   --delay-ms=N    Pause between sends (default 400)
 *   --limit=N       Cap recipients (testing)
 */

const { NestFactory } = require('@nestjs/core');
const { getRepositoryToken } = require('@nestjs/typeorm');
const { IsNull } = require('typeorm');
const { AppModule } = require('../dist/app.module');
const { AuthService } = require('../dist/auth/auth.service');
const { UserEntity } = require('../dist/entities/user.entity');

function parseArgs(argv) {
  let dryRun = false;
  let delayMs = 400;
  let limit = Infinity;
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--delay-ms=')) {
      delayMs = Number(arg.slice('--delay-ms='.length)) || 400;
    } else if (arg.startsWith('--limit=')) {
      limit = Number(arg.slice('--limit='.length)) || Infinity;
    } else if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: node scripts/resend-unverified-emails.cjs [--dry-run] [--delay-ms=400] [--limit=N]',
      );
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }
  return { dryRun, delayMs, limit };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { dryRun, delayMs, limit } = parseArgs(process.argv);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const auth = app.get(AuthService);
    const repo = app.get(getRepositoryToken(UserEntity));

    let users = await repo.find({
      where: {
        emailVerified: false,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: { createdAt: 'ASC' },
    });

    users = users.filter((u) => String(u.email || '').trim().length > 0);
    if (Number.isFinite(limit) && limit > 0) {
      users = users.slice(0, limit);
    }

    console.log(
      `Unverified recipients: ${users.length} | mode=${dryRun ? 'dry-run' : 'live'} | delay=${delayMs}ms`,
    );

    if (dryRun) {
      for (const u of users) {
        console.log(u.email);
      }
      return;
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < users.length; i += 1) {
      const u = users[i];
      const n = `[${i + 1}/${users.length}]`;
      try {
        const result = await auth.resendEmailVerificationAdmin(u.id);
        if (result?.emailSent === false) {
          skipped += 1;
          console.log(`${n} skip (already verified?) ${u.email}`);
        } else {
          sent += 1;
          console.log(`${n} sent ${u.email}`);
        }
      } catch (err) {
        failed += 1;
        console.error(`${n} ERR ${u.email}: ${err?.message || err}`);
      }
      if (i < users.length - 1 && delayMs > 0) {
        await sleep(delayMs);
      }
    }

    console.log('');
    console.log(`Done. sent=${sent} skipped=${skipped} failed=${failed}`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
