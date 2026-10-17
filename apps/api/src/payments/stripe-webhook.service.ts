import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { StripeWebhookEventEntity } from '../entities/stripe-webhook-event.entity';
import { BookingsService } from '../bookings/bookings.service';
import { PaymentsService } from './payments.service';
import { alertOps } from '../ops/ops-alert';

@Injectable()
export class StripeWebhookService {
  private readonly log = new Logger(StripeWebhookService.name);

  constructor(
    private readonly payments: PaymentsService,
    @Inject(forwardRef(() => BookingsService))
    private readonly bookings: BookingsService,
    @InjectRepository(StripeWebhookEventEntity)
    private readonly webhookEvents: Repository<StripeWebhookEventEntity>,
  ) {}

  async handleWebhook(rawBody: Buffer | string, signature: string) {
    let event: Stripe.Event;
    try {
      event = this.payments.constructWebhookEvent(rawBody, signature);
    } catch (err) {
      this.log.warn(
        `Stripe webhook signature failed: ${err instanceof Error ? err.message : err}`,
      );
      throw new UnauthorizedException('bad stripe signature');
    }

    if (!event?.id) {
      return { ok: true };
    }

    const existing = await this.webhookEvents.findOne({
      where: { eventId: event.id },
    });
    if (existing) {
      return { ok: true, duplicate: true };
    }

    try {
      await this.dispatch(event);
    } catch (err) {
      this.log.error(
        `Stripe webhook dispatch failed ${event.type} ${event.id}`,
        err instanceof Error ? err.message : err,
      );
      alertOps('stripe_webhook_dispatch_failed', {
        eventId: event.id,
        eventType: event.type,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    try {
      await this.webhookEvents.save(
        this.webhookEvents.create({
          eventId: event.id,
          eventType: event.type,
        }),
      );
    } catch (err) {
      // Unique race — another worker already recorded this event.
      this.log.warn(
        `Stripe webhook event insert race ${event.id}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }

    return { ok: true };
  }

  private async dispatch(event: Stripe.Event) {
    switch (event.type) {
      case 'charge.refunded':
        await this.onChargeRefunded(event.data.object as Stripe.Charge);
        return;
      case 'charge.dispute.created':
      case 'charge.dispute.closed':
        await this.onDispute(event.data.object as Stripe.Dispute, event.type);
        return;
      default:
        return;
    }
  }

  private async onChargeRefunded(charge: Stripe.Charge) {
    const bookingId = await this.resolveBookingId(charge);
    if (!bookingId) {
      this.log.warn(`charge.refunded: no booking for charge ${charge.id}`);
      return;
    }
    const cumulative = Math.max(0, Number(charge.amount_refunded) || 0);
    const prior = await this.bookings.guestRefundedCentsOnBooking(bookingId);
    const delta = Math.max(0, cumulative - prior);
    if (delta <= 0) return;

    const latestRefund = this.latestRefundId(charge);
    await this.bookings.clawbackForRefundedAmount(
      bookingId,
      delta,
      latestRefund,
    );
  }

  private async onDispute(dispute: Stripe.Dispute, eventType: string) {
    if (eventType === 'charge.dispute.closed' && dispute.status !== 'lost') {
      // Won/withdrawn — no clawback.
      return;
    }
    const chargeId =
      typeof dispute.charge === 'string'
        ? dispute.charge
        : dispute.charge?.id ?? null;
    const pi =
      typeof dispute.payment_intent === 'string'
        ? dispute.payment_intent
        : dispute.payment_intent?.id ?? null;
    const bookingId = await this.bookings.findBookingIdByStripeChargeOrPi({
      chargeId,
      paymentIntentId: pi,
    });
    if (!bookingId) {
      this.log.warn(`dispute: no booking for ${dispute.id}`);
      return;
    }
    const amount = Math.max(0, Number(dispute.amount) || 0);
    if (amount <= 0) return;
    // Dispute clawback once per dispute id (idempotency key on transfer reversal).
    await this.bookings.clawbackForRefundedAmount(
      bookingId,
      amount,
      `dispute:${dispute.id}`,
    );
  }

  private async resolveBookingId(charge: Stripe.Charge): Promise<string | null> {
    const pi =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id ?? null;
    return this.bookings.findBookingIdByStripeChargeOrPi({
      chargeId: charge.id,
      paymentIntentId: pi,
    });
  }

  private latestRefundId(charge: Stripe.Charge): string | null {
    const list = charge.refunds?.data;
    if (!Array.isArray(list) || list.length === 0) return null;
    return list[0]?.id ?? null;
  }
}
