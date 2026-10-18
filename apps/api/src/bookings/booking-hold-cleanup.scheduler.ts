import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';

const DEFAULT_TTL_HOURS = 24;
const BATCH = 50;

/**
 * RYRA-488: expire unanswered pending_host requests and release stranded holds.
 * Does not scan Stripe for orphan PIs (see scripts/report-orphan-preauths.ts).
 */
@Injectable()
export class BookingHoldCleanupScheduler {
  private readonly log = new Logger(BookingHoldCleanupScheduler.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    private readonly payments: PaymentsService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async run(): Promise<void> {
    try {
      const expired = await this.expireStaleRequests();
      const stranded = await this.cancelStrandedHolds();
      this.log.log(
        `booking-hold-cleanup expired=${expired} strandedHoldsCancelled=${stranded}`,
      );
    } catch (err) {
      this.log.warn(
        'booking-hold-cleanup failed',
        err instanceof Error ? err.message : err,
      );
    }
  }

  /** Exported for unit tests. */
  async expireStaleRequests(): Promise<number> {
    const ttlHours = Number(process.env.BOOKING_REQUEST_TTL_HOURS) || DEFAULT_TTL_HOURS;
    const cutoff = new Date(Date.now() - ttlHours * 60 * 60 * 1000);
    const rows = await this.bookings.find({
      where: {
        status: 'pending_host',
        createdAt: LessThan(cutoff),
      },
      order: { createdAt: 'ASC' },
      take: BATCH,
    });

    let count = 0;
    for (const b of rows) {
      const life = (b.lifecycle ?? {}) as Record<string, unknown>;
      if (life.expiredAt) continue;

      b.status = 'expired';
      b.lifecycle = {
        ...life,
        expiredAt: Date.now(),
        expiredReason: 'request_ttl',
      };
      await this.bookings.save(b);

      if (b.stripePaymentIntentId) {
        await this.payments.cancelPaymentIntentSafe(b.stripePaymentIntentId);
      }
      this.notifications.bookingExpired(b.id);
      count += 1;
    }
    return count;
  }

  /** Cancel requires_capture PIs still attached to terminal bookings. */
  async cancelStrandedHolds(): Promise<number> {
    if (!this.payments.isConfigured()) return 0;

    const rows = await this.bookings.find({
      where: {
        status: In(['cancelled', 'declined', 'expired']),
      },
      order: { updatedAt: 'DESC' },
      take: BATCH,
    });

    let count = 0;
    for (const b of rows) {
      const piId = b.stripePaymentIntentId?.trim();
      if (!piId) continue;
      const life = (b.lifecycle ?? {}) as Record<string, unknown>;
      if (life.holdReleasedAt || life.paymentRefundedAt) continue;

      try {
        const pi = await this.payments.retrievePaymentIntent(piId);
        if (pi.status !== 'requires_capture') continue;
        await this.payments.cancelPaymentIntentSafe(piId);
        b.lifecycle = {
          ...life,
          holdReleasedAt: Date.now(),
          holdReleasedReason: 'stranded_cleanup',
        };
        await this.bookings.save(b);
        count += 1;
      } catch (err) {
        this.log.warn(
          `stranded hold cleanup failed booking=${b.id} pi=${piId}`,
          err instanceof Error ? err.message : err,
        );
      }
    }
    return count;
  }
}
