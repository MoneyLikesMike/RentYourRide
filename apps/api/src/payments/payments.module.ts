import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { UsersModule } from '../users/users.module';
import { BookingsModule } from '../bookings/bookings.module';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeWebhookService } from './stripe-webhook.service';
import { StripeWebhookEventEntity } from '../entities/stripe-webhook-event.entity';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([StripeWebhookEventEntity]),
    forwardRef(() => BookingsModule),
  ],
  controllers: [PaymentsController, StripeWebhookController],
  providers: [PaymentsService, StripeWebhookService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
