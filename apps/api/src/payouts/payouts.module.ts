import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConnectTosAcceptanceEntity } from '../entities/connect-tos-acceptance.entity';
import { HostPayoutAccountEntity } from '../entities/host-payout-account.entity';
import { ListingEntity } from '../entities/listing.entity';
import { StripeWebhookEventEntity } from '../entities/stripe-webhook-event.entity';
import { UserEntity } from '../entities/user.entity';
import { UsersModule } from '../users/users.module';
import { HostPayoutAccountsService } from './host-payout-accounts.service';
import { PayoutAccountsService } from './payout-accounts.service';
import { PayoutRequirementsService } from './payout-requirements.service';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';
import { StripeConnectWebhookController } from './stripe-connect-webhook.controller';
import { StripeConnectWebhookService } from './stripe-connect-webhook.service';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([
      ConnectTosAcceptanceEntity,
      ListingEntity,
      HostPayoutAccountEntity,
      StripeWebhookEventEntity,
      UserEntity,
    ]),
  ],
  controllers: [PayoutsController, StripeConnectWebhookController],
  providers: [
    PayoutsService,
    PayoutAccountsService,
    HostPayoutAccountsService,
    PayoutRequirementsService,
    StripeConnectWebhookService,
  ],
  exports: [PayoutsService, PayoutAccountsService, HostPayoutAccountsService],
})
export class PayoutsModule {}
