/**
 * Read-only: list Stripe PaymentIntents with metadata.purpose=booking_preauth
 * in requires_capture that have no matching bookings.stripe_payment_intent_id.
 *
 * Usage (from apps/api, with DATABASE_URL + STRIPE_SECRET_KEY):
 *   npx tsx scripts/report-orphan-preauths.ts
 *
 * Dry-run only — never cancels or refunds.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import Stripe from 'stripe';
import { Client } from 'pg';

function loadDotEnv() {
  const path = resolve(__dirname, '../.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

async function main() {
  loadDotEnv();
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!stripeKey) throw new Error('STRIPE_SECRET_KEY required');
  if (!dbUrl) throw new Error('DATABASE_URL required');

  const stripe = new Stripe(stripeKey);
  const pg = new Client({
    connectionString: dbUrl.replace(/[?&]sslmode=[^&]+/g, ''),
    ssl: { rejectUnauthorized: false },
  });
  await pg.connect();

  const orphans: Array<{ id: string; amount: number; created: number; guestId?: string }> = [];
  let startingAfter: string | undefined;

  for (let page = 0; page < 20; page += 1) {
    const list = await stripe.paymentIntents.list({
      limit: 100,
      starting_after: startingAfter,
    });
    for (const pi of list.data) {
      if (pi.status !== 'requires_capture') continue;
      if (pi.metadata?.purpose !== 'booking_preauth') continue;
      const hit = await pg.query(
        `select id from bookings where stripe_payment_intent_id = $1 limit 1`,
        [pi.id],
      );
      if (hit.rowCount === 0) {
        orphans.push({
          id: pi.id,
          amount: pi.amount,
          created: pi.created,
          guestId: pi.metadata?.guestId,
        });
      }
    }
    if (!list.has_more) break;
    startingAfter = list.data[list.data.length - 1]?.id;
    if (!startingAfter) break;
  }

  await pg.end();

  console.log(JSON.stringify({ orphanCount: orphans.length, orphans }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
