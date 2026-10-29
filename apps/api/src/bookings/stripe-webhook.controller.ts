import { Controller, Post, Req } from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common/interfaces';
import { Request } from 'express';
import { BookingsService } from './bookings.service';

@Controller()
export class StripeWebhookController {
  constructor(private readonly bookings: BookingsService) {}

  @Post('webhooks/stripe')
  async webhook(@Req() req: RawBodyRequest<Request>) {
    const raw = req.rawBody ?? Buffer.from('');
    const signature = String(req.headers['stripe-signature'] ?? '');
    return this.bookings.handleStripeWebhook(raw, signature);
  }
}
