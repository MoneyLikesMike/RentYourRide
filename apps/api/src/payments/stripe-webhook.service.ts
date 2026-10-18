import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { Repository } from 'typeorm';
import { StripeWebhookEventEntity } from '../entities/stripe-webhook-event.entity';
import { BookingsService } from '../bookings/bookings.service';
import { PaymentsService } from './payments.service';

@Injectable()
export class StripeWebhookService {
  private readonly log = new Logger(StripeWebhookService.name);

  constructor(
    private readonly payments: PaymentsService,
    @Inject(forwardRef(() => BookingsService))
    private readonly bookings: BookingsService,
    @InjectRepository(StripeWebhookEventEntity)
    private readonly events: Repository<StripeWebhookEventEntity>,
  ) {}

  async handleRaw(
    rawBody: Buffer | string,
    signature: string,
  ): Promise<{ ok: true }> {
    let event: Stripe.Event;
    try {
      event = this.payments.constructWebhookEvent(rawBody, signature);
    } catch (err) {
      this.log.warn(
        `Stripe webhook signature failed: ${(err as Error)?.message}`,
      );
      throw new BadRequestException('Invalid Stripe signature');
    }

    const existing = await this.events.findOne({
      where: { eventId: event.id },
    });
    if (existing) return { ok: true };

    try {
      if (
        event.type === 'charge.refunded' ||
        event.type === 'charge.dispute.created' ||
        event.type === 'charge.dispute.closed'
      ) {
        await this.bookings.clawbackForStripeChargeEvent(event);
      }
    } catch (err) {
      this.log.error(
        `Stripe webhook ${event.type} ${event.id}: ${(err as Error)?.message}`,
      );
      throw err;
    }

    await this.events.save(
      this.events.create({
        eventId: event.id,
        eventType: event.type,
      }),
    );
    return { ok: true };
  }
}
