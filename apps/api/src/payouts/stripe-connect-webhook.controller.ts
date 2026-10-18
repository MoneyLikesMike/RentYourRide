import { Controller, Headers, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RawBodyRequest } from '@nestjs/common/interfaces';
import { Request } from 'express';
import { StripeConnectWebhookService } from './stripe-connect-webhook.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class StripeConnectWebhookController {
  constructor(private readonly webhooks: StripeConnectWebhookService) {}

  /** Stripe Connect endpoint — no JWT; verified via webhook signature. */
  @Post('stripe-connect')
  async stripeConnect(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const raw = req.rawBody ?? Buffer.from('');
    return this.webhooks.handleRaw(raw, signature ?? '');
  }
}
