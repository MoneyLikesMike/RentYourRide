import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { BookingExtensionEntity } from '../entities/booking-extension.entity';
import { ListingEntity } from '../entities/listing.entity';
import { UserEntity } from '../entities/user.entity';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { MessagingModule } from '../messaging/messaging.module';
import { PaymentsModule } from '../payments/payments.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { TripCompletionScheduler } from './trip-completion.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      BookingExtensionEntity,
      ListingEntity,
      UserEntity,
    ]),
    ScheduleModule,
    MessagingModule,
    PaymentsModule,
    PayoutsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, TripCompletionScheduler],
  exports: [BookingsService],
})
export class BookingsModule {}
