import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { ListingEntity } from '../entities/listing.entity';
import { UserEntity } from '../entities/user.entity';
import { OpsHealthService } from './ops-health.service';
import { OpsHealthScheduler } from './ops-health.scheduler';
import { OpsHealthController } from './ops-health.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, ListingEntity, BookingEntity])],
  providers: [OpsHealthService, OpsHealthScheduler],
  controllers: [OpsHealthController],
  exports: [OpsHealthService],
})
export class OpsModule {}
