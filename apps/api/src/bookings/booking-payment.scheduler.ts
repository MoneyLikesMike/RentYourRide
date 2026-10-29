import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingsService } from './bookings.service';

@Injectable()
export class BookingPaymentScheduler {
  private readonly log = new Logger(BookingPaymentScheduler.name);

  constructor(private readonly bookings: BookingsService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async expireStaleBookingPayments(): Promise<void> {
    try {
      const expiredRequests = await this.bookings.expireStalePendingRequests();
      const missedDeadlines = await this.bookings.expireUnpaidAcceptedTrips();
      if (expiredRequests || missedDeadlines) {
        this.log.log(
          `booking payment cron expiredRequests=${expiredRequests} missedDeadlines=${missedDeadlines}`,
        );
      }
    } catch (err) {
      this.log.warn(
        'booking payment cron failed',
        err instanceof Error ? err.message : err,
      );
    }
  }
}
