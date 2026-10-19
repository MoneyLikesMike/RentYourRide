import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { BookingExtensionEntity } from '../entities/booking-extension.entity';
import { ListingEntity } from '../entities/listing.entity';
import { UserEntity } from '../entities/user.entity';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingHoldCleanupScheduler } from './booking-hold-cleanup.scheduler';
import { MessagingModule } from '../messaging/messaging.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingEntity, BookingExtensionEntity, ListingEntity, UserEntity]),
    MessagingModule,
    PaymentsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingHoldCleanupScheduler],
  exports: [BookingsService],
})
export class BookingsModule {}
