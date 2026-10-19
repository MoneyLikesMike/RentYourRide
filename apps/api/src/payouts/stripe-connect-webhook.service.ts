import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { Repository } from 'typeorm';
import { StripeWebhookEventEntity } from '../entities/stripe-webhook-event.entity';
import { HostPayoutAccountsService } from './host-payout-accounts.service';
import {
  NoopPayoutFailureForwarder,
  PayoutFailureForwarder,
} from './payout-failure-forwarder';
import { redactLogMessage } from './sensitive-log-redaction';

const SYNC_TYPES = new Set([
  'account.updated',
  'capability.updated',
  'person.updated',
  'account.external_account.created',
  'account.external_account.updated',
  'account.external_account.deleted',
]);

const FAILURE_TYPES = new Set([
  'payout.failed',
  'payout.paid',
  'transfer.failed',
  'transfer.reversed',
]);

@Injectable()
export class StripeConnectWebhookService {
  private readonly logger = new Logger(StripeConnectWebhookService.name);
  private stripe: Stripe | null;
  private readonly failureForwarder: PayoutFailureForwarder;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(StripeWebhookEventEntity)
    private readonly events: Repository<StripeWebhookEventEntity>,
    private readonly hostAccounts: HostPayoutAccountsService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = key ? new Stripe(key) : null;
    this.failureForwarder = new NoopPayoutFailureForwarder();
  }

  async handleRaw(rawBody: Buffer | string, signature: string): Promise<{ ok: true }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }
    const secret = this.config.get<string>('STRIPE_CONNECT_WEBHOOK_SECRET')?.trim();
    if (!secret) {
      throw new BadRequestException('STRIPE_CONNECT_WEBHOOK_SECRET is not set');
    }
    const payload = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (err) {
      this.logger.warn(
        `Connect webhook signature failed: ${(err as Error)?.message}`,
      );
      throw new BadRequestException('Invalid Stripe signature');
    }

    const existing = await this.events.findOne({
      where: { eventId: event.id },
    });
    if (existing) {
      return { ok: true };
    }

    const stripeAccount =
      typeof event.account === 'string' ? event.account : null;

    try {
      await this.dispatch(event, stripeAccount);
    } catch (err) {
      this.logger.error(
        redactLogMessage(
          `Connect webhook ${event.type} ${event.id}: ${(err as Error)?.message}`,
        ),
      );
      throw err;
    }

    await this.events.save(
      this.events.create({
        eventId: event.id,
        eventType: event.type,
        stripeAccount,
      }),
    );
    return { ok: true };
  }

  private async dispatch(
    event: Stripe.Event,
    stripeAccount: string | null,
  ): Promise<void> {
    if (SYNC_TYPES.has(event.type)) {
      const accountId =
        stripeAccount ||
        (event.type === 'account.updated'
          ? (event.data.object as Stripe.Account).id
          : null) ||
        (event.type.startsWith('account.external_account')
          ? stripeAccount
          : null) ||
        (event.type === 'capability.updated'
          ? stripeAccount
          : null) ||
        (event.type === 'person.updated' ? stripeAccount : null);
      if (accountId) {
        await this.hostAccounts.syncAccount(accountId);
      }
      return;
    }

    if (FAILURE_TYPES.has(event.type)) {
      await this.failureForwarder.onTransferOrPayoutFailure({
        type: event.type,
        stripeAccountId: stripeAccount,
        eventId: event.id,
        payload: event.data.object,
      });
      if (stripeAccount && (event.type === 'payout.failed' || event.type === 'payout.paid')) {
        await this.hostAccounts.syncAccount(stripeAccount);
      }
    }
  }
}
