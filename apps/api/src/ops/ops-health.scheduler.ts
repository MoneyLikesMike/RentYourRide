import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { ListingEntity } from '../entities/listing.entity';
import { UserEntity } from '../entities/user.entity';
import {
  formatBookingEndDate,
  formatBookingStartDate,
} from '../notifications/booking-context';
import { PinpointService } from '../notifications/pinpoint.service';
import { OpsHealthService } from './ops-health.service';
import { OpsCheckResult, OpsHealthSnapshot } from './ops-health.types';
import {
  adminBaseUrl,
  lines,
  signupSource,
  startOfDayInTimeZone,
  vehicleLabel,
} from './ops-report.util';

const EOD_TZ = 'America/Winnipeg';
const EOD_DETAIL_LIMIT = 75;

@Injectable()
export class OpsHealthScheduler {
  private readonly log = new Logger(OpsHealthScheduler.name);
  /** key → last known non-ok status (alert only on change; email once per issue) */
  private readonly lastBadStatus = new Map<string, string>();

  constructor(
    private readonly health: OpsHealthService,
    private readonly pinpoint: PinpointService,
    private readonly config: ConfigService,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(ListingEntity)
    private readonly listings: Repository<ListingEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async pollHealth(): Promise<void> {
    try {
      const snap = await this.health.runChecks();
      await this.dispatchAlerts(snap);
    } catch (err) {
      this.log.warn(
        'Ops health poll failed',
        err instanceof Error ? err.message : err,
      );
      await this.pinpoint.sendSimpleAdminEmail(
        '[RYR] Ops health poll crashed',
        err instanceof Error ? err.stack ?? err.message : String(err),
      );
    }
  }

  /** End-of-day activity + health report (21:00 America/Winnipeg). */
  @Cron('0 21 * * *', { timeZone: EOD_TZ })
  async eodReport(): Promise<void> {
    try {
      const snap = await this.health.runChecks();
      const since = startOfDayInTimeZone(EOD_TZ);
      const adminBase = adminBaseUrl(this.config);

      const [users, listingCount, bookings] = await Promise.all([
        this.users.find({
          where: { createdAt: MoreThanOrEqual(since) },
          order: { createdAt: 'ASC' },
          take: EOD_DETAIL_LIMIT,
        }),
        this.listings.count({ where: { createdAt: MoreThanOrEqual(since) } }),
        this.bookings.find({
          where: { createdAt: MoreThanOrEqual(since) },
          relations: ['guest', 'host', 'listing'],
          order: { createdAt: 'ASC' },
          take: EOD_DETAIL_LIMIT,
        }),
      ]);

      const [userTotal, bookingTotal] = await Promise.all([
        this.users.count({ where: { createdAt: MoreThanOrEqual(since) } }),
        this.bookings.count({ where: { createdAt: MoreThanOrEqual(since) } }),
      ]);

      const body = [
        this.health.formatSnapshotEmail(snap, 'RentYourRide end-of-day report'),
        '',
        `Local day so far (${EOD_TZ}, since ${since.toISOString()}):`,
        lines([
          ['new users', userTotal],
          ['new listings', listingCount],
          ['new bookings', bookingTotal],
        ]),
        '',
        this.formatUsersSection(users, userTotal, adminBase),
        '',
        this.formatBookingsSection(bookings, bookingTotal, adminBase),
      ].join('\n');

      const subject = snap.hasFail
        ? '[RYR] EOD report — ISSUES'
        : snap.hasWarn
          ? '[RYR] EOD report — warnings'
          : '[RYR] EOD report';
      await this.pinpoint.sendSimpleAdminEmail(subject, body);
    } catch (err) {
      this.log.warn(
        'EOD ops report failed',
        err instanceof Error ? err.message : err,
      );
    }
  }

  private formatUsersSection(
    users: UserEntity[],
    total: number,
    adminBase: string,
  ): string {
    const header = `New signups (${total})`;
    if (!users.length) return `${header}\n(none)`;
    const blocks = users.map((user, i) =>
      [
        `#${i + 1}`,
        lines([
          ['source', signupSource(user)],
          ['name', `${user.firstName} ${user.lastName}`.trim()],
          ['email', user.email],
          ['phone', user.phone],
          ['role', user.role],
          ['profile', `${adminBase}/members/profile/info/${user.id}`],
          ['created', user.createdAt?.toISOString?.() ?? String(user.createdAt)],
        ]),
      ].join('\n'),
    );
    const truncated =
      total > users.length ? `\n…and ${total - users.length} more` : '';
    return [header, ...blocks].join('\n\n') + truncated;
  }

  private formatBookingsSection(
    bookings: BookingEntity[],
    total: number,
    adminBase: string,
  ): string {
    const header = `New bookings (${total})`;
    if (!bookings.length) return `${header}\n(none)`;
    const blocks = bookings.map((booking, i) => {
      const snap = (booking.listingSnapshot ?? {}) as Record<string, unknown>;
      const vd = (snap.vehicleData ?? {}) as Record<string, unknown>;
      const vehicle = vehicleLabel(
        vd,
        String(snap.title ?? booking.listing?.title ?? 'Vehicle'),
      );
      const dates = booking.bookingDates as { start?: number; end?: number };
      const pricing = (booking.pricing ?? {}) as Record<string, unknown>;
      const totalAmt =
        pricing.total != null
          ? `$${pricing.total}`
          : pricing.guestTotal != null
            ? `$${pricing.guestTotal}`
            : '(n/a)';
      return [
        `#${i + 1} ${vehicle}`,
        lines([
          ['booking id', booking.id],
          ['status', booking.status],
          ['instant', booking.instantBooking],
          [
            'start',
            dates.start != null
              ? formatBookingStartDate(Number(dates.start))
              : null,
          ],
          [
            'end',
            dates.end != null ? formatBookingEndDate(Number(dates.end)) : null,
          ],
          ['total', totalAmt],
          [
            'guest',
            booking.guest
              ? `${booking.guest.firstName} ${booking.guest.lastName} <${booking.guest.email}>`
              : booking.guestUserId,
          ],
          [
            'host',
            booking.host
              ? `${booking.host.firstName} ${booking.host.lastName} <${booking.host.email}>`
              : booking.hostUserId,
          ],
          [
            'listing',
            `${adminBase}/members/profile/car/info/${booking.listingId}`,
          ],
          [
            'created',
            booking.createdAt?.toISOString?.() ?? String(booking.createdAt),
          ],
        ]),
      ].join('\n');
    });
    const truncated =
      total > bookings.length ? `\n…and ${total - bookings.length} more` : '';
    return [header, ...blocks].join('\n\n') + truncated;
  }

  private async dispatchAlerts(snap: OpsHealthSnapshot): Promise<void> {
    const bad = snap.checks.filter(
      (c) => c.status === 'fail' || c.status === 'warn',
    );
    const okKeys = new Set(
      snap.checks.filter((c) => c.status === 'ok').map((c) => c.key),
    );

    for (const check of bad) {
      const prev = this.lastBadStatus.get(check.key);
      // Only email when a check newly fails/warns or severity changes — not on a timer.
      if (prev === check.status) continue;

      this.lastBadStatus.set(check.key, check.status);
      const subject = `[RYR] ${check.status === 'fail' ? 'ALERT' : 'WARN'}: ${check.label}`;
      const body = this.health.formatSnapshotEmail(
        snap,
        `Problem detected: ${check.label}\n${check.detail}`,
      );
      await this.pinpoint.sendSimpleAdminEmail(subject, body);
    }

    for (const key of okKeys) {
      if (!this.lastBadStatus.has(key)) continue;
      const recoveredFrom = this.lastBadStatus.get(key);
      this.lastBadStatus.delete(key);
      const check = snap.checks.find((c) => c.key === key) as OpsCheckResult;
      await this.pinpoint.sendSimpleAdminEmail(
        `[RYR] Recovered: ${check.label}`,
        this.health.formatSnapshotEmail(
          snap,
          `${check.label} recovered (was ${recoveredFrom}).`,
        ),
      );
    }
  }
}
