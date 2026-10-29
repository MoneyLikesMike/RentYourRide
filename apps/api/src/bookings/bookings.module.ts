import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { BookingExtensionEntity } from '../entities/booking-extension.entity';
import { ListingEntity } from '../entities/listing.entity';
import { StripeWebhookEventEntity } from '../entities/stripe-webhook-event.entity';
import { UserEntity } from '../entities/user.entity';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingPaymentScheduler } from './booking-payment.scheduler';
import { StripeWebhookController } from './stripe-webhook.controller';
import { MessagingModule } from '../messaging/messaging.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      BookingExtensionEntity,
      ListingEntity,
      UserEntity,
      StripeWebhookEventEntity,
    ]),
    MessagingModule,
    PaymentsModule,
  ],
  controllers: [BookingsController, StripeWebhookController],
  providers: [BookingsService, BookingPaymentScheduler],
  exports: [BookingsService],
})
export class BookingsModule {}
