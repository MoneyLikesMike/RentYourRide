import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { NotificationsService } from './notifications.service';

const MS_PER_HOUR = 60 * 60 * 1000;
const REMINDER_WINDOW_MS = 24 * MS_PER_HOUR;

@Injectable()
export class TripReminderScheduler {
  private readonly log = new Logger(TripReminderScheduler.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async processTripReminders(): Promise<void> {
    try {
      await this.processBeginningSoon();
      await this.processEndingSoon();
    } catch (err) {
      this.log.warn('Trip reminder cron failed', err instanceof Error ? err.message : err);
    }
  }

  private bookingStartMs(b: BookingEntity): number | null {
    const dates = b.bookingDates as { start?: number };
    return dates.start != null ? Number(dates.start) : null;
  }

  private bookingEndMs(b: BookingEntity): number | null {
    const dates = b.bookingDates as { end?: number };
    return dates.end != null ? Number(dates.end) : null;
  }

  private async processBeginningSoon(): Promise<void> {
    const now = Date.now();
    const rows = await this.bookings.find({
      where: { status: In(['confirmed', 'checkin_pending']) },
      select: ['id', 'bookingDates', 'lifecycle', 'status'],
    });
    for (const b of rows) {
      const lifecycle = (b.lifecycle ?? {}) as Record<string, unknown>;
      if (lifecycle.beginningSoonNotifiedAt) continue;
      const start = this.bookingStartMs(b);
      if (start == null) continue;
      const delta = start - now;
      if (delta > 0 && delta <= REMINDER_WINDOW_MS) {
        this.notifications.tripBeginningSoon(b.id);
        await this.notifications.markTripReminderSent(b.id, 'beginningSoonNotifiedAt');
      }
    }
  }

  private async processEndingSoon(): Promise<void> {
    const now = Date.now();
    const rows = await this.bookings.find({
      where: { status: In(['active', 'checkout_pending']) },
      select: ['id', 'bookingDates', 'lifecycle', 'status'],
    });
    for (const b of rows) {
      const lifecycle = (b.lifecycle ?? {}) as Record<string, unknown>;
      if (lifecycle.endingSoonNotifiedAt) continue;
      const end = this.bookingEndMs(b);
      if (end == null) continue;
      const delta = end - now;
      if (delta > 0 && delta <= REMINDER_WINDOW_MS) {
        this.notifications.tripEndingSoon(b.id);
        await this.notifications.markTripReminderSent(b.id, 'endingSoonNotifiedAt');
      }
    }
  }
}
