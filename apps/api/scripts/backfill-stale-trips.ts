/**
 * Dry-run (default) listing of stale trips for completion / no-show.
 *
 *   npx tsx scripts/backfill-stale-trips.ts
 *   BACKFILL_APPROVED_BY=name npx tsx scripts/backfill-stale-trips.ts --apply
 *
 * --apply must NOT be run from a product PR; requires BACKFILL_APPROVED_BY.
 *
 * Includes never-started and started-past-72h candidates (e.g. Sep 10 G37 test trip
 * when present in the target DB).
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { entities } from '../src/entities';
import {
  COMPLETABLE_TRIP_STATUSES,
  loadTripCompletionEnv,
  NO_SHOW_ELIGIBLE_STATUSES,
} from '../src/bookings/trip-completion.config';

const MS_H = 60 * 60 * 1000;

function endMs(bookingDates: Record<string, unknown> | null): number | null {
  const end = Number(bookingDates?.end);
  return Number.isFinite(end) ? end : null;
}

function hasBoth(life: Record<string, unknown>): boolean {
  return life.guestCheckedOutAt != null && life.hostCheckoutTripEndedAt != null;
}

function hasCheckIn(life: Record<string, unknown>): boolean {
  return (
    life.guestCheckedInAt != null ||
    life.hostCheckedInAt != null ||
    life.guestTripStartedAt != null ||
    life.hostTripStartedAt != null
  );
}

function isOpenLateReturn(life: Record<string, unknown>): boolean {
  const lr = life.lateReturn as { status?: string } | undefined;
  return lr?.status === 'open';
}

async function main() {
  const apply = process.argv.includes('--apply');
  const approvedBy = (process.env.BACKFILL_APPROVED_BY || '').trim();
  if (apply && !approvedBy) {
    console.error('--apply requires BACKFILL_APPROVED_BY=<name>');
    process.exit(1);
  }

  const url = (process.env.DATABASE_URL || '').trim();
  if (!url) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }

  const ds = new DataSource({
    type: 'postgres',
    url,
    entities: [...entities],
    synchronize: false,
  });
  await ds.initialize();

  const now = Date.now();
  const { autoCompleteHours, noShowAfterHours } = loadTripCompletionEnv();
  const autoCutoff = now - autoCompleteHours * MS_H;
  const noShowCutoff = now - noShowAfterHours * MS_H;

  const rows: Array<{
    id: string;
    status: string;
    booking_dates: Record<string, unknown>;
    lifecycle: Record<string, unknown> | null;
  }> = await ds.query(
    `SELECT id, status, booking_dates, lifecycle FROM bookings
     WHERE status = ANY($1)`,
    [
      [
        ...COMPLETABLE_TRIP_STATUSES,
        ...NO_SHOW_ELIGIBLE_STATUSES,
        'extension_pending',
      ],
    ],
  );

  const toComplete: string[] = [];
  const toNoShow: string[] = [];

  for (const r of rows) {
    const end = endMs(r.booking_dates);
    if (end == null) continue;
    const life = (r.lifecycle || {}) as Record<string, unknown>;

    if ((COMPLETABLE_TRIP_STATUSES as readonly string[]).includes(r.status)) {
      if (r.status === 'extension_pending') continue;
      if (end > autoCutoff) continue;
      if (isOpenLateReturn(life)) continue;
      if (hasBoth(life)) continue;
      toComplete.push(r.id);
      console.log(
        JSON.stringify({
          action: 'complete',
          id: r.id,
          status: r.status,
          end: new Date(end).toISOString(),
          hoursPastEnd: ((now - end) / MS_H).toFixed(1),
        }),
      );
    }

    if ((NO_SHOW_ELIGIBLE_STATUSES as readonly string[]).includes(r.status)) {
      if (end > noShowCutoff) continue;
      if (hasCheckIn(life)) continue;
      toNoShow.push(r.id);
      console.log(
        JSON.stringify({
          action: 'no_show',
          id: r.id,
          status: r.status,
          end: new Date(end).toISOString(),
          hoursPastEnd: ((now - end) / MS_H).toFixed(1),
        }),
      );
    }
  }

  console.log(
    JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      approvedBy: approvedBy || null,
      autoCompleteHours,
      noShowAfterHours,
      toComplete: toComplete.length,
      toNoShow: toNoShow.length,
      applyBlocked: apply
        ? false
        : 'Pass --apply with BACKFILL_APPROVED_BY to mutate (not in this PR)',
    }),
  );

  if (apply) {
    console.error(
      'Apply mode is intentionally not wired in this PR. Re-run from an ops change with BookingsService.',
    );
    process.exit(2);
  }

  await ds.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
