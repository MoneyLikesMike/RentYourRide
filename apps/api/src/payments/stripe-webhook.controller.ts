import { Controller, Headers, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RawBodyRequest } from '@nestjs/common/interfaces';
import { Request } from 'express';
import { StripeWebhookService } from './stripe-webhook.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class StripeWebhookController {
  constructor(private readonly webhooks: StripeWebhookService) {}

  @Post('stripe')
  async stripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.webhooks.handleRaw(req.rawBody ?? Buffer.from(''), signature ?? '');
  }
}
