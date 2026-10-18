import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConnectTosAcceptanceEntity } from '../entities/connect-tos-acceptance.entity';
import { ListingEntity } from '../entities/listing.entity';
import { UsersModule } from '../users/users.module';
import { PayoutAccountsService } from './payout-accounts.service';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([ConnectTosAcceptanceEntity, ListingEntity]),
  ],
  controllers: [PayoutsController],
  providers: [PayoutsService, PayoutAccountsService],
  exports: [PayoutsService, PayoutAccountsService],
})
export class PayoutsModule {}
