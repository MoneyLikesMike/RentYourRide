import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from './users.service';

@Injectable()
export class AccountDeletionScheduler {
  private readonly log = new Logger(AccountDeletionScheduler.name);

  constructor(private readonly users: UsersService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledDeletions(): Promise<void> {
    try {
      const count = await this.users.permanentlyDeleteDueAccounts();
      if (count > 0) {
        this.log.log(`Permanently deleted ${count} account(s) after the 30-day grace period`);
      }
    } catch (err) {
      this.log.warn(
        'Account deletion cron failed',
        err instanceof Error ? err.message : err,
      );
    }
  }
}
