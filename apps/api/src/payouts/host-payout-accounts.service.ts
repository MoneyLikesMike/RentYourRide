import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import Stripe from 'stripe';
import { In, IsNull, LessThan, Repository } from 'typeorm';
import {
  HostPayoutAccountEntity,
  HostPayoutAccountKind,
} from '../entities/host-payout-account.entity';
import { UserEntity } from '../entities/user.entity';
import { PinpointService } from '../notifications/pinpoint.service';
import { isCustomConnectAccount } from './payout-accounts-kind';
import { PAYOUT_NOTIFY } from './payout-notification-copy';
import {
  mapRequirementsList,
  safeErrorLabel,
  type MappedRequirement,
} from './requirement-screen';
import { redactLogMessage } from './sensitive-log-redaction';

export type HostAccountStatusDto = {
  payoutsReady: boolean;
  payoutsEnabled: boolean;
  status: 'enabled' | 'verifying' | 'action_needed' | 'not_started';
  currentlyDue: string[];
  pastDue: string[];
  eventuallyDue: string[];
  errors: Array<{ code?: string; label: string; requirement?: string }>;
  currentDeadline: string | null;
  accountKind: HostPayoutAccountKind | null;
  detailsSubmitted?: boolean;
  onboarded?: boolean;
};

@Injectable()
export class HostPayoutAccountsService {
  private readonly logger = new Logger(HostPayoutAccountsService.name);
  private stripe: Stripe | null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(HostPayoutAccountEntity)
    private readonly repo: Repository<HostPayoutAccountEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly pinpoint: PinpointService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = key ? new Stripe(key) : null;
  }

  isPayoutsReadyRow(row: HostPayoutAccountEntity | null | undefined): boolean {
    if (!row) return false;
    return row.payoutsEnabled === true && row.transfersCapability === 'active';
  }

  async isPayoutsReady(userId: string): Promise<boolean> {
    const row = await this.repo.findOne({ where: { userId } });
    return this.isPayoutsReadyRow(row);
  }

  async findByUserId(userId: string): Promise<HostPayoutAccountEntity | null> {
    return this.repo.findOne({ where: { userId } });
  }

  async findByStripeAccountId(
    stripeAccountId: string,
  ): Promise<HostPayoutAccountEntity | null> {
    return this.repo.findOne({ where: { stripeAccountId } });
  }

  detectKind(acct: Stripe.Account): HostPayoutAccountKind {
    return isCustomConnectAccount(acct) ? 'custom' : 'express';
  }

  async syncAccount(accountId: string): Promise<HostPayoutAccountEntity | null> {
    if (!this.stripe) return null;
    let acct: Stripe.Account;
    try {
      acct = await this.stripe.accounts.retrieve(accountId);
    } catch (err) {
      this.logger.warn(
        redactLogMessage(
          `syncAccount retrieve failed for ${accountId}: ${(err as Error)?.message}`,
        ),
      );
      return null;
    }

    let userId =
      typeof acct.metadata?.ryrUserId === 'string'
        ? acct.metadata.ryrUserId
        : null;
    if (!userId) {
      const user = await this.users.findOne({
        where: { stripeConnectAccountId: accountId },
      });
      userId = user?.id ?? null;
    }
    if (!userId) {
      this.logger.warn(`No user for Connect account ${accountId}`);
      return null;
    }

    const prev = await this.repo.findOne({ where: { userId } });
    const transfers =
      acct.capabilities?.transfers === 'active'
        ? 'active'
        : acct.capabilities?.transfers
          ? String(acct.capabilities.transfers)
          : null;

    const row =
      prev ??
      this.repo.create({
        userId,
        stripeAccountId: accountId,
      });

    row.stripeAccountId = accountId;
    row.accountKind = this.detectKind(acct);
    row.chargesEnabled = acct.charges_enabled === true;
    row.payoutsEnabled = acct.payouts_enabled === true;
    row.transfersCapability = transfers;
    row.currentlyDue = acct.requirements?.currently_due ?? [];
    row.pastDue = acct.requirements?.past_due ?? [];
    row.eventuallyDue = acct.requirements?.eventually_due ?? [];
    row.pendingVerification = acct.requirements?.pending_verification ?? [];
    row.errors = (acct.requirements?.errors ?? []).map((e) => ({
      requirement: e.requirement,
      code: e.code,
      reason: e.reason,
    }));
    row.disabledReason = acct.requirements?.disabled_reason ?? null;
    row.currentDeadline = acct.requirements?.current_deadline
      ? new Date(acct.requirements.current_deadline * 1000)
      : null;
    row.futureRequirements = (acct.future_requirements as unknown as Record<
      string,
      unknown
    >) ?? null;
    row.lastSyncedAt = new Date();

    const saved = await this.repo.save(row);

    if (userId && !userId.includes('null')) {
      const user = await this.users.findOne({ where: { id: userId } });
      if (user && user.stripeConnectAccountId !== accountId) {
        user.stripeConnectAccountId = accountId;
        await this.users.save(user);
      }
    }

    await this.maybeNotifyStatusChange(prev, saved);

    return saved;
  }

  private async maybeNotifyStatusChange(
    prev: HostPayoutAccountEntity | null,
    next: HostPayoutAccountEntity,
  ): Promise<void> {
    const user = await this.users.findOne({ where: { id: next.userId } });
    if (!user?.email) return;
    const firstName = user.firstName || 'there';
    const wasReady = this.isPayoutsReadyRow(prev);
    const isReady = this.isPayoutsReadyRow(next);
    const hadDue =
      (prev?.currentlyDue?.length ?? 0) + (prev?.pastDue?.length ?? 0) > 0;
    const hasDue =
      (next.currentlyDue?.length ?? 0) + (next.pastDue?.length ?? 0) > 0;

    try {
      if (!wasReady && isReady) {
        const c = PAYOUT_NOTIFY.payoutsEnabled;
        await this.pinpoint.sendSimpleEmail(
          user.email,
          c.emailSubject,
          c.emailBody.replace('{{firstName}}', firstName),
        );
      } else if (wasReady && !isReady && next.payoutsEnabled === false) {
        const c = PAYOUT_NOTIFY.payoutsDisabled;
        await this.pinpoint.sendSimpleEmail(
          user.email,
          c.emailSubject,
          c.emailBody.replace('{{firstName}}', firstName),
        );
      } else if (!hadDue && hasDue) {
        const c = PAYOUT_NOTIFY.requirementsDue;
        await this.pinpoint.sendSimpleEmail(
          user.email,
          c.emailSubject,
          c.emailBody.replace('{{firstName}}', firstName),
        );
      }
    } catch (err) {
      this.logger.warn(
        `payout notify failed: ${(err as Error)?.message ?? err}`,
      );
    }
  }

  statusFromRow(row: HostPayoutAccountEntity | null): HostAccountStatusDto {
    if (!row) {
      return {
        payoutsReady: false,
        payoutsEnabled: false,
        status: 'not_started',
        currentlyDue: [],
        pastDue: [],
        eventuallyDue: [],
        errors: [],
        currentDeadline: null,
        accountKind: null,
        detailsSubmitted: false,
        onboarded: false,
      };
    }
    const payoutsReady = this.isPayoutsReadyRow(row);
    let status: HostAccountStatusDto['status'];
    if (payoutsReady) status = 'enabled';
    else if (row.pastDue.length > 0 || row.currentlyDue.length > 0)
      status = 'action_needed';
    else status = 'verifying';

    return {
      payoutsReady,
      payoutsEnabled: row.payoutsEnabled,
      status,
      currentlyDue: row.currentlyDue,
      pastDue: row.pastDue,
      eventuallyDue: row.eventuallyDue,
      errors: row.errors.map((e) => ({
        code: e.code,
        requirement: e.requirement,
        label: safeErrorLabel(e.code, e.reason),
      })),
      currentDeadline: row.currentDeadline
        ? row.currentDeadline.toISOString()
        : null,
      accountKind: row.accountKind,
      detailsSubmitted: true,
      onboarded: true,
    };
  }

  async accountStatusForUser(userId: string): Promise<HostAccountStatusDto> {
    let row = await this.findByUserId(userId);
    if (!row) {
      const user = await this.users.findOne({ where: { id: userId } });
      if (user?.stripeConnectAccountId && this.stripe) {
        row = await this.syncAccount(user.stripeConnectAccountId);
      }
    }
    return this.statusFromRow(row);
  }

  async listRequirements(userId: string): Promise<{
    payoutsReady: boolean;
    requirements: MappedRequirement[];
    unknownAlerted: string[];
  }> {
    const row = await this.findByUserId(userId);
    if (!row || row.accountKind !== 'custom') {
      return { payoutsReady: false, requirements: [], unknownAlerted: [] };
    }
    const due = [...new Set([...row.currentlyDue, ...row.pastDue])];
    const requirements = mapRequirementsList(due, row.errors);
    const unknown = requirements.filter((r) => r.screen === 'unknown');
    const unknownAlerted: string[] = [];
    for (const u of unknown) {
      unknownAlerted.push(u.requirement);
      await this.pinpoint.sendSimpleAdminEmail(
        `[RYR] Unknown payout requirement: ${u.requirement}`,
        `userId=${userId}\naccount=${row.stripeAccountId}\nrequirement=${u.requirement}`,
      );
    }
    return {
      payoutsReady: this.isPayoutsReadyRow(row),
      requirements,
      unknownAlerted,
    };
  }

  async requireCustomAccount(userId: string): Promise<HostPayoutAccountEntity> {
    const row = await this.findByUserId(userId);
    if (!row?.stripeAccountId) {
      throw new NotFoundException('No payout account. Complete Get Paid first.');
    }
    if (row.accountKind !== 'custom') {
      throw new NotFoundException(
        'Finish payout setup is only available for Custom Connect accounts.',
      );
    }
    return row;
  }

  /** Admin list — never includes SIN/doc ids. */
  async adminList(filter?: string): Promise<
    Array<{
      userId: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
      stripeAccountId: string;
      accountKind: HostPayoutAccountKind;
      payoutsEnabled: boolean;
      payoutsReady: boolean;
      transfersCapability: string | null;
      currentlyDue: string[];
      pastDue: string[];
      currentDeadline: string | null;
      lastSyncedAt: string | null;
      status: string;
    }>
  > {
    const rows = await this.repo.find({
      order: { updatedAt: 'DESC' },
      take: 200,
    });
    const userIds = rows.map((r) => r.userId);
    const users = userIds.length
      ? await this.users.find({ where: { id: In(userIds) } })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));

    return rows
      .map((row) => {
        const u = byId.get(row.userId);
        const status = this.statusFromRow(row);
        return {
          userId: row.userId,
          email: u?.email ?? null,
          firstName: u?.firstName ?? null,
          lastName: u?.lastName ?? null,
          stripeAccountId: row.stripeAccountId,
          accountKind: row.accountKind,
          payoutsEnabled: row.payoutsEnabled,
          payoutsReady: status.payoutsReady,
          transfersCapability: row.transfersCapability,
          currentlyDue: row.currentlyDue,
          pastDue: row.pastDue,
          currentDeadline: status.currentDeadline,
          lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
          status: status.status,
        };
      })
      .filter((row) => {
        if (!filter) return true;
        if (filter === 'past_due') return row.pastDue.length > 0;
        if (filter === 'restricted')
          return row.status === 'action_needed' || !row.payoutsEnabled;
        if (filter === 'pending_payouts')
          return row.payoutsEnabled && !row.payoutsReady;
        return true;
      });
  }

  async resyncForUser(userId: string): Promise<HostAccountStatusDto> {
    const user = await this.users.findOne({ where: { id: userId } });
    const accountId =
      user?.stripeConnectAccountId ||
      (await this.findByUserId(userId))?.stripeAccountId;
    if (!accountId) throw new NotFoundException('No Connect account for user');
    const row = await this.syncAccount(accountId);
    return this.statusFromRow(row);
  }

  /** Nightly: refresh rows not synced in 24h. */
  @Cron('15 6 * * *')
  async nightlyResync(): Promise<void> {
    if (!this.stripe) return;
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stale = await this.repo.find({
      where: [
        { lastSyncedAt: LessThan(cutoff) },
        { lastSyncedAt: IsNull() },
      ],
      take: 100,
    });
    for (const row of stale) {
      try {
        await this.syncAccount(row.stripeAccountId);
      } catch (err) {
        this.logger.warn(
          `nightly sync ${row.stripeAccountId}: ${(err as Error)?.message}`,
        );
      }
    }
  }

  async backfillFromUsers(): Promise<number> {
    if (!this.stripe) return 0;
    const users = await this.users
      .createQueryBuilder('u')
      .where('u.stripe_connect_account_id IS NOT NULL')
      .getMany();
    let n = 0;
    for (const u of users) {
      if (!u.stripeConnectAccountId) continue;
      const existing = await this.findByUserId(u.id);
      if (existing) continue;
      await this.syncAccount(u.stripeConnectAccountId);
      n += 1;
    }
    return n;
  }
}
