import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { BookingEntity } from '../entities/booking.entity';
import { ListingEntity } from '../entities/listing.entity';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminBookingsController } from './admin-bookings.controller';
import { AdminBookingsService } from './admin-bookings.service';
import { AdminListingsController } from './admin-listings.controller';
import { AdminListingsService } from './admin-listings.service';
import { AdminGuard } from '../common/admin.guard';
import { AuthModule } from '../auth/auth.module';
import { DiditModule } from '../didit/didit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, BookingEntity, ListingEntity]),
    AuthModule,
    DiditModule,
  ],
  controllers: [
    AdminUsersController,
    AdminBookingsController,
    AdminListingsController,
  ],
  providers: [
    AdminUsersService,
    AdminBookingsService,
    AdminListingsService,
    AdminGuard,
  ],
})
export class AdminModule {}
