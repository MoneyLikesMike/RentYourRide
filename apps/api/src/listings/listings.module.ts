import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingEntity } from '../entities/listing.entity';
import { UserEntity } from '../entities/user.entity';
import { BookingEntity } from '../entities/booking.entity';
import { ListingsService } from './listings.service';
import { VinDecodeService } from './vin-decode.service';
import { ListingsPublicController } from './listings-public.controller';
import { HostListingsController } from './host-listings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ListingEntity, UserEntity, BookingEntity])],
  controllers: [ListingsPublicController, HostListingsController],
  providers: [ListingsService, VinDecodeService],
  exports: [ListingsService, VinDecodeService],
})
export class ListingsModule {}
