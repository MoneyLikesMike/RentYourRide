import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { BookingsService } from './bookings.service';
import { TRIP_COMPLETION_ADVISORY_LOCK_KEY } from './trip-completion.config';

@Injectable()
export class TripCompletionScheduler {
  private readonly log = new Logger(TripCompletionScheduler.name);

  constructor(
    private readonly bookings: BookingsService,
    private readonly dataSource: DataSource,
  ) {}

  @Cron('*/15 * * * *')
  async tick(): Promise<void> {
    const locked: Array<{ ok: boolean | string }> = await this.dataSource.query(
      'SELECT pg_try_advisory_lock($1) AS ok',
      [TRIP_COMPLETION_ADVISORY_LOCK_KEY],
    );
    const got =
      locked[0]?.ok === true ||
      locked[0]?.ok === 't' ||
      locked[0]?.ok === 'true';
    if (!got) {
      this.log.debug('Trip completion cron skipped (lock held)');
      return;
    }
    try {
      await this.runOnce();
    } catch (err) {
      this.log.error(
        'Trip completion cron failed',
        err instanceof Error ? err.stack ?? err.message : err,
      );
    } finally {
      await this.dataSource.query('SELECT pg_advisory_unlock($1)', [
        TRIP_COMPLETION_ADVISORY_LOCK_KEY,
      ]);
    }
  }

  /** Exposed for tests / ops. */
  async runOnce(nowMs: number = Date.now()): Promise<{
    completed: number;
    noShow: number;
  }> {
    const { autoComplete, noShow } =
      await this.bookings.findStaleTripCandidates(nowMs);
    let completed = 0;
    let noShowCount = 0;

    for (const b of autoComplete) {
      try {
        await this.bookings.completeTrip(b.id, {
          by: 'auto',
          requireBothCheckouts: false,
        });
        completed += 1;
      } catch (err) {
        this.log.warn(
          `Auto-complete failed booking=${b.id}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    for (const b of noShow) {
      try {
        const ok = await this.bookings.markNeverStartedNoShow(b.id);
        if (ok) noShowCount += 1;
      } catch (err) {
        this.log.warn(
          `No-show mark failed booking=${b.id}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    if (completed || noShowCount) {
      this.log.log(
        `Trip completion tick: completed=${completed} noShow=${noShowCount}`,
      );
    }
    return { completed, noShow: noShowCount };
  }
}
