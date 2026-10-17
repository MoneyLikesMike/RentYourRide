import { Controller, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RawBodyRequest } from '@nestjs/common/interfaces';
import { Request } from 'express';
import { StripeWebhookService } from './stripe-webhook.service';

@ApiTags('webhooks')
@Controller()
export class StripeWebhookController {
  constructor(private readonly stripeWebhooks: StripeWebhookService) {}

  @Post('webhooks/stripe')
  async webhook(@Req() req: RawBodyRequest<Request>) {
    const raw = req.rawBody ?? Buffer.from('');
    const signature = String(req.headers['stripe-signature'] ?? '');
    return this.stripeWebhooks.handleWebhook(raw, signature);
  }
}
